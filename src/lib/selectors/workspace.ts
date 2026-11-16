import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import type {
  Meeting,
  Profile,
  Project,
  Task,
  WorkspaceSnapshot,
} from "@/lib/types";
import { PRIORITY_RANK } from "@/lib/types";
import { computeProgress, isOverdue } from "./progress";

export function profileMap(ws: WorkspaceSnapshot): Map<string, Profile> {
  return new Map(ws.profiles.map((p) => [p.id, p]));
}

export function projectsForUser(ws: WorkspaceSnapshot, userId: string): Project[] {
  const ids = new Set(ws.members.filter((m) => m.userId === userId).map((m) => m.projectId));
  return ws.projects
    .filter((p) => ids.has(p.id))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export function projectMembers(ws: WorkspaceSnapshot, projectId: string): Profile[] {
  const map = profileMap(ws);
  return ws.members
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    .map((m) => map.get(m.userId))
    .filter((p): p is Profile => !!p);
}

export function projectTasks(ws: WorkspaceSnapshot, projectId: string): Task[] {
  return ws.tasks.filter((t) => t.projectId === projectId);
}

export function projectProgress(ws: WorkspaceSnapshot, projectId: string) {
  return computeProgress(projectTasks(ws, projectId));
}

/** Confirmed meetings that block a user's time, excluding `exceptMeetingId`. */
export function busyFor(ws: WorkspaceSnapshot, userId: string, exceptMeetingId?: string) {
  return ws.meetings
    .filter(
      (m) =>
        m.status === "confirmed" &&
        m.id !== exceptMeetingId &&
        m.inviteeIds.includes(userId) &&
        m.confirmedStart &&
        m.confirmedEnd,
    )
    .map((m) => ({ start: m.confirmedStart!, end: m.confirmedEnd!, label: m.title }));
}

export function sortTasksByUrgency(tasks: Task[], now = new Date()): Task[] {
  return [...tasks].sort((a, b) => {
    const ao = isOverdue(a, now) ? 1 : 0;
    const bo = isOverdue(b, now) ? 1 : 0;
    if (ao !== bo) return bo - ao;
    const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (a.dueDate && b.dueDate) {
      const d = a.dueDate.localeCompare(b.dueDate);
      if (d !== 0) return d;
    } else if (a.dueDate || b.dueDate) {
      return a.dueDate ? -1 : 1;
    }
    return pr;
  });
}

/** Open tasks assigned to the user, most urgent first. */
export function myOpenTasks(ws: WorkspaceSnapshot, userId: string, now = new Date()): Task[] {
  const projectIds = new Set(projectsForUser(ws, userId).map((p) => p.id));
  return sortTasksByUrgency(
    ws.tasks.filter((t) => t.assigneeId === userId && t.status !== "done" && projectIds.has(t.projectId)),
    now,
  );
}

export function tasksDueThisWeek(ws: WorkspaceSnapshot, userId: string, now = new Date()): Task[] {
  const projectIds = new Set(projectsForUser(ws, userId).map((p) => p.id));
  const end = endOfDay(addDays(now, 7));
  return sortTasksByUrgency(
    ws.tasks.filter(
      (t) =>
        projectIds.has(t.projectId) &&
        t.status !== "done" &&
        t.dueDate &&
        new Date(t.dueDate) <= end,
    ),
    now,
  );
}

export function upcomingMeetings(ws: WorkspaceSnapshot, userId: string, now = new Date()): Meeting[] {
  const projectIds = new Set(projectsForUser(ws, userId).map((p) => p.id));
  return ws.meetings
    .filter(
      (m) =>
        m.status === "confirmed" &&
        projectIds.has(m.projectId) &&
        m.inviteeIds.includes(userId) &&
        m.confirmedEnd &&
        new Date(m.confirmedEnd) >= now,
    )
    .sort((a, b) => a.confirmedStart!.localeCompare(b.confirmedStart!));
}

export function openPolls(ws: WorkspaceSnapshot, userId: string): Meeting[] {
  const projectIds = new Set(projectsForUser(ws, userId).map((p) => p.id));
  return ws.meetings.filter((m) => m.status === "polling" && projectIds.has(m.projectId));
}

export function activityForUser(ws: WorkspaceSnapshot, userId: string, limit = 20) {
  const projectIds = new Set(projectsForUser(ws, userId).map((p) => p.id));
  return ws.activity
    .filter((a) => projectIds.has(a.projectId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export interface Deadline {
  id: string;
  kind: "project" | "milestone" | "task";
  title: string;
  projectId: string;
  date: string;
  href: string;
}

export function upcomingDeadlines(
  ws: WorkspaceSnapshot,
  userId: string,
  now = new Date(),
  horizonDays = 21,
): Deadline[] {
  const projects = projectsForUser(ws, userId);
  const ids = new Set(projects.map((p) => p.id));
  const from = startOfDay(now);
  const to = endOfDay(addDays(now, horizonDays));
  const inRange = (iso: string) => isWithinInterval(new Date(iso), { start: from, end: to });
  const out: Deadline[] = [];
  for (const p of projects) {
    if (p.status !== "completed" && inRange(p.deadline))
      out.push({ id: `p-${p.id}`, kind: "project", title: `${p.name} due`, projectId: p.id, date: p.deadline, href: `/projects/${p.id}` });
  }
  for (const m of ws.milestones) {
    if (ids.has(m.projectId) && !m.completedAt && inRange(m.dueDate))
      out.push({ id: `m-${m.id}`, kind: "milestone", title: m.title, projectId: m.projectId, date: m.dueDate, href: `/projects/${m.projectId}` });
  }
  for (const t of ws.tasks) {
    if (ids.has(t.projectId) && t.status !== "done" && t.dueDate && t.priority !== "low" && inRange(t.dueDate) && (t.priority === "urgent" || t.priority === "high"))
      out.push({ id: `t-${t.id}`, kind: "task", title: t.title, projectId: t.projectId, date: t.dueDate, href: `/projects/${t.projectId}/tasks?task=${t.id}` });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface WorkloadRow {
  profile: Profile;
  open: number;
  inProgress: number;
  done: number;
  overdue: number;
  nextDue: Task | null;
  /** Share of the project's assigned open work (0–1). */
  share: number;
}

export function workload(ws: WorkspaceSnapshot, projectId: string, now = new Date()): WorkloadRow[] {
  const tasks = projectTasks(ws, projectId);
  const members = projectMembers(ws, projectId);
  const totalOpen = tasks.filter((t) => t.status !== "done" && t.assigneeId).length;
  return members.map((profile) => {
    const mine = tasks.filter((t) => t.assigneeId === profile.id);
    const open = mine.filter((t) => t.status !== "done");
    const nextDue =
      sortTasksByUrgency(open.filter((t) => t.dueDate), now)[0] ?? null;
    return {
      profile,
      open: open.length,
      inProgress: open.filter((t) => t.status === "in_progress" || t.status === "in_review").length,
      done: mine.length - open.length,
      overdue: open.filter((t) => isOverdue(t, now)).length,
      nextDue,
      share: totalOpen ? open.length / totalOpen : 0,
    };
  });
}

/** Tasks completed per day over the last `days` days (for the user or the team). */
export function completionSeries(
  ws: WorkspaceSnapshot,
  opts: { userId?: string; projectIds?: Set<string>; days?: number },
  now = new Date(),
) {
  const days = opts.days ?? 7;
  const series: { day: string; label: string; completed: number; mine: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const key = format(d, "yyyy-MM-dd");
    series.push({ day: key, label: format(d, "EEE"), completed: 0, mine: 0 });
  }
  const index = new Map(series.map((s, i) => [s.day, i]));
  for (const t of ws.tasks) {
    if (!t.completedAt) continue;
    if (opts.projectIds && !opts.projectIds.has(t.projectId)) continue;
    const i = index.get(format(new Date(t.completedAt), "yyyy-MM-dd"));
    if (i === undefined) continue;
    series[i].completed += 1;
    if (opts.userId && t.assigneeId === opts.userId) series[i].mine += 1;
  }
  return series;
}

export function weekBounds(now = new Date()) {
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export function daysLeft(iso: string, now = new Date()) {
  return differenceInCalendarDays(new Date(iso), now);
}
