import { addDays, endOfDay, isWithinInterval, startOfDay, subDays } from "date-fns";
import type { Meeting, Task, WorkspaceSnapshot } from "@/lib/types";
import { computeProgress } from "./progress";
import { projectsForUser, upcomingDeadlines, type Deadline } from "./workspace";

export interface ProjectRecap {
  projectId: string;
  completed: Task[];
  /** Progress at the start of the week, treating tasks completed this week as open. */
  startPct: number;
  endPct: number;
  /** Member with most completions this week (null if none). */
  topContributorId: string | null;
  updates: number;
}

export interface WeeklyRecap {
  start: Date;
  end: Date;
  completed: Task[];
  completedByMe: number;
  meetingsHeld: Meeting[];
  updatesPosted: number;
  projects: ProjectRecap[];
  nextWeek: { deadlines: Deadline[]; meetings: Meeting[] };
}

/** Summarises the last 7 days (today included) across the user's projects. */
export function weeklyRecap(ws: WorkspaceSnapshot, userId: string, now = new Date()): WeeklyRecap {
  const start = startOfDay(subDays(now, 6));
  const end = now;
  const inWeek = (iso: string | null | undefined) => !!iso && isWithinInterval(new Date(iso), { start, end });
  const projects = projectsForUser(ws, userId);
  const ids = new Set(projects.map((p) => p.id));

  const completed = ws.tasks
    .filter((t) => ids.has(t.projectId) && t.status === "done" && inWeek(t.completedAt))
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const meetingsHeld = ws.meetings.filter(
    (m) => ids.has(m.projectId) && m.status === "confirmed" && m.confirmedEnd && inWeek(m.confirmedEnd),
  );

  const perProject: ProjectRecap[] = projects.map((p) => {
    const tasks = ws.tasks.filter((t) => t.projectId === p.id);
    const done = completed.filter((t) => t.projectId === p.id);
    const doneIds = new Set(done.map((t) => t.id));
    // Tasks created this week didn't exist at the start of it.
    const atStart = tasks
      .filter((t) => !(new Date(t.createdAt) >= start))
      .map((t) => (doneIds.has(t.id) ? { status: "todo" as const } : t));
    const counts = new Map<string, number>();
    for (const t of done) if (t.assigneeId) counts.set(t.assigneeId, (counts.get(t.assigneeId) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      projectId: p.id,
      completed: done,
      startPct: computeProgress(atStart).percentage,
      endPct: computeProgress(tasks).percentage,
      topContributorId: top ? top[0] : null,
      updates: ws.updates.filter((u) => u.projectId === p.id && inWeek(u.createdAt)).length,
    };
  });

  const nextStart = now;
  const nextEnd = endOfDay(addDays(now, 7));
  const inNext = (iso: string) => isWithinInterval(new Date(iso), { start: nextStart, end: nextEnd });

  return {
    start,
    end,
    completed,
    completedByMe: completed.filter((t) => t.assigneeId === userId).length,
    meetingsHeld,
    updatesPosted: perProject.reduce((n, p) => n + p.updates, 0),
    projects: perProject,
    nextWeek: {
      deadlines: upcomingDeadlines(ws, userId, now, 14).filter((d) => inNext(d.date)),
      meetings: ws.meetings.filter(
        (m) => ids.has(m.projectId) && m.status === "confirmed" && m.confirmedStart && inNext(m.confirmedStart),
      ),
    },
  };
}
