/**
 * Sync Intelligence — a transparent, rule-based insights engine.
 *
 * Every insight is produced by a named rule that reads real workspace data.
 * Each insight carries the evidence that triggered it and a deep link to the
 * affected task, meeting or project. There is no randomness and no LLM: the
 * same workspace always produces the same insights.
 */
import { differenceInCalendarDays, format } from "date-fns";
import type { Project, Task, WorkspaceSnapshot } from "@/lib/types";
import { PRIORITY_RANK } from "@/lib/types";
import { computeProgress, isOverdue } from "@/lib/selectors/progress";
import { matchMeeting } from "@/lib/scheduling/matcher";
import { busyFor } from "@/lib/selectors/workspace";
import { firstName, pluralize } from "@/lib/utils";

export type InsightSeverity = "critical" | "high" | "medium" | "low" | "positive";
export type InsightKind =
  | "deadline"
  | "overdue"
  | "workload"
  | "scheduling"
  | "stalled"
  | "milestone"
  | "progress"
  | "unassigned"
  | "personal";

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  context: string;
  /** Concrete data points behind the insight. */
  evidence: string[];
  /** Plain-language description of the rule that fired. */
  rule: string;
  action: { label: string; href: string };
  projectId?: string;
}

export const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  positive: 0,
};

export const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  critical: "Critical",
  high: "High priority",
  medium: "Worth a look",
  low: "Low priority",
  positive: "Good news",
};

export const STALL_DAYS = 5;
const TASK_ACTIVITY = new Set([
  "task_created",
  "task_completed",
  "task_moved",
  "task_updated",
  "task_assigned",
  "task_commented",
]);

function taskHref(t: Pick<Task, "projectId" | "id">) {
  return `/projects/${t.projectId}/tasks?task=${t.id}`;
}

export function generateInsights(
  ws: WorkspaceSnapshot,
  userId: string,
  now = new Date(),
): Insight[] {
  const out: Insight[] = [];
  const name = (id: string | null) =>
    firstName(ws.profiles.find((p) => p.id === id)?.name ?? "Someone");

  const myProjectIds = new Set(ws.members.filter((m) => m.userId === userId).map((m) => m.projectId));
  const projects = ws.projects.filter((p) => myProjectIds.has(p.id) && p.status !== "completed");

  for (const project of projects) {
    const tasks = ws.tasks.filter((t) => t.projectId === project.id);
    const progress = computeProgress(tasks);
    const daysLeft = differenceInCalendarDays(new Date(project.deadline), now);
    const open = tasks.filter((t) => t.status !== "done");

    // Rule 1 — deadline pressure
    if (progress.remaining > 0 && daysLeft <= 7) {
      const passed = daysLeft < 0;
      const perDay = progress.remaining / Math.max(daysLeft, 1);
      const severity: InsightSeverity =
        passed || daysLeft <= 3 || perDay >= 1.5 ? "critical" : "high";
      const when =
        daysLeft < 0
          ? `passed ${-daysLeft} days ago`
          : daysLeft === 0
            ? "today"
            : daysLeft === 1
              ? "tomorrow"
              : `in ${daysLeft} days`;
      out.push({
        id: `deadline:${project.id}`,
        kind: "deadline",
        severity,
        projectId: project.id,
        title: `Your ${project.name} deadline is ${when}, but ${pluralize(progress.remaining, "task is", "tasks are")} still incomplete.`,
        context:
          daysLeft > 0
            ? `That's about ${perDay.toFixed(perDay < 10 ? 1 : 0)} tasks per day to finish on time. Prioritise the highest-impact work first.`
            : "Agree on what can still be delivered and tell your professor early if you need an extension.",
        evidence: [
          `Deadline: ${format(new Date(project.deadline), "EEEE, d MMM")}`,
          `${progress.done} of ${progress.total} tasks done (${progress.percentage}%)`,
          ...open
            .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])
            .slice(0, 3)
            .map((t) => `Open: ${t.title}`),
        ],
        rule: "Fires when a project deadline is within 7 days and tasks remain open. Critical within 3 days or when more than 1.5 tasks/day remain.",
        action: { label: "Review open tasks", href: `/projects/${project.id}/tasks` },
      });
    }

    // Rule 2 — overdue tasks
    const overdue = tasks.filter((t) => isOverdue(t, now));
    if (overdue.length > 0) {
      const urgent = overdue.filter((t) => PRIORITY_RANK[t.priority] >= PRIORITY_RANK.high);
      const allUrgent = urgent.length === overdue.length;
      const word = overdue.length === 1 ? "task is" : "tasks are";
      const numberWord = overdue.length === 2 ? "Two" : overdue.length === 3 ? "Three" : String(overdue.length);
      out.push({
        id: `overdue:${project.id}`,
        kind: "overdue",
        severity: urgent.length > 0 ? "high" : "medium",
        projectId: project.id,
        title:
          overdue.length === 1
            ? `"${overdue[0].title}" is overdue in ${project.name}.`
            : `${numberWord} ${allUrgent ? "high-priority " : ""}${word} overdue in ${project.name}.`,
        context: `Check in with ${[...new Set(overdue.map((t) => (t.assigneeId ? name(t.assigneeId) : "the team")))].join(" and ")} to unblock ${overdue.length === 1 ? "it" : "them"} or set a realistic new date.`,
        evidence: overdue.map(
          (t) =>
            `${t.title} — due ${format(new Date(t.dueDate!), "d MMM")}, ${t.assigneeId ? name(t.assigneeId) : "unassigned"}`,
        ),
        rule: "Fires for any open task whose due date has passed. High priority when an overdue task is High or Urgent.",
        action:
          overdue.length === 1
            ? { label: "Open task", href: taskHref(overdue[0]) }
            : { label: "See overdue tasks", href: `/projects/${project.id}/tasks?filter=overdue` },
      });
    }

    // Rule 3 — uneven workload (framed supportively, never as a ranking)
    const memberIds = ws.members.filter((m) => m.projectId === project.id).map((m) => m.userId);
    if (memberIds.length >= 2) {
      const load = memberIds.map((id) => ({
        id,
        open: open.filter((t) => t.assigneeId === id).length,
      }));
      const assignedOpen = load.reduce((s, l) => s + l.open, 0);
      const sorted = [...load].sort((a, b) => b.open - a.open);
      const max = sorted[0];
      const min = sorted[sorted.length - 1];
      const avg = assignedOpen / memberIds.length;
      if (assignedOpen >= 4 && max.open >= 3 && max.open >= avg * 1.75 && max.open - min.open >= 3) {
        out.push({
          id: `workload:${project.id}`,
          kind: "workload",
          severity: "medium",
          projectId: project.id,
          title: `${name(max.id)} is carrying most of the open work in ${project.name}.`,
          context: `${name(max.id)} holds ${max.open} of ${assignedOpen} assigned open tasks while ${name(min.id)} has ${min.open}. A quick redistribution keeps everyone moving.`,
          evidence: sorted.map((l) => `${name(l.id)}: ${pluralize(l.open, "open task")}`),
          rule: "Fires when one member holds at least 1.75× the team average of open tasks and 3+ more than the lightest load.",
          action: { label: "Balance workload", href: `/projects/${project.id}/team` },
        });
      }
    }

    // Rule 4 — stalled project
    const lastTaskTouch = Math.max(
      0,
      ...tasks.map((t) => new Date(t.updatedAt).getTime()),
      ...ws.activity
        .filter((a) => a.projectId === project.id && TASK_ACTIVITY.has(a.type))
        .map((a) => new Date(a.createdAt).getTime()),
    );
    if (open.length > 0 && lastTaskTouch > 0) {
      const quiet = differenceInCalendarDays(now, new Date(lastTaskTouch));
      if (quiet >= STALL_DAYS) {
        out.push({
          id: `stalled:${project.id}`,
          kind: "stalled",
          severity: "medium",
          projectId: project.id,
          title: `${project.name} hasn't moved in ${quiet} days.`,
          context: `No task was created, moved or completed since ${format(new Date(lastTaskTouch), "EEEE, d MMM")}. ${pluralize(open.length, "task is", "tasks are")} still open — pick one small next step to restart momentum.`,
          evidence: [
            `Last task change: ${format(new Date(lastTaskTouch), "d MMM, HH:mm")}`,
            `${progress.percentage}% complete · ${daysLeft} days until the deadline`,
          ],
          rule: `Fires when no task in an active project has changed for ${STALL_DAYS}+ days.`,
          action: { label: "Plan next steps", href: `/projects/${project.id}/tasks` },
        });
      }
    }

    // Rule 5 — milestones
    for (const m of ws.milestones.filter((m) => m.projectId === project.id)) {
      const linked = tasks.filter((t) => t.milestoneId === m.id);
      const lp = computeProgress(linked);
      if (!m.completedAt) {
        const d = differenceInCalendarDays(new Date(m.dueDate), now);
        if (d >= 0 && d <= 5) {
          out.push({
            id: `milestone:${m.id}`,
            kind: "milestone",
            severity: lp.total > 0 && lp.percentage < 50 && d <= 2 ? "high" : "low",
            projectId: project.id,
            title: `Milestone "${m.title}" is due ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}.`,
            context:
              lp.total > 0
                ? `${lp.done} of ${lp.total} linked tasks are done (${lp.percentage}%).`
                : "No tasks are linked to this milestone yet.",
            evidence: linked.map((t) => `${t.status === "done" ? "✓" : "○"} ${t.title}`),
            rule: "Fires for incomplete milestones due within 5 days. High priority when under half of the linked work is done within 2 days.",
            action: { label: "View milestones", href: `/projects/${project.id}` },
          });
        }
      } else if (differenceInCalendarDays(now, new Date(m.completedAt)) <= 3) {
        out.push({
          id: `milestone-done:${m.id}`,
          kind: "milestone",
          severity: "positive",
          projectId: project.id,
          title: `Milestone reached: ${m.title}.`,
          context: `Completed ${format(new Date(m.completedAt), "EEEE")}. Nice work, ${project.name} team.`,
          evidence: [`${lp.done} linked tasks delivered`],
          rule: "Celebrates milestones completed in the last 3 days.",
          action: { label: "View project", href: `/projects/${project.id}` },
        });
      }
    }

    // Rule 6 — progress milestone (positive)
    if (progress.total > 0 && progress.percentage >= 75 && progress.percentage < 100) {
      out.push({
        id: `progress:${project.id}`,
        kind: "progress",
        severity: "positive",
        projectId: project.id,
        title: `Your group has completed ${progress.percentage}% of the ${project.name} project.`,
        context: `Only ${pluralize(progress.remaining, "task")} to go${daysLeft > 0 ? ` with ${daysLeft} days left` : ""}.`,
        evidence: [`${progress.done} of ${progress.total} tasks done`],
        rule: "Highlights projects that pass 75% completion.",
        action: { label: "View project", href: `/projects/${project.id}` },
      });
    }

    // Rule 7 — important work without an owner
    const orphaned = open.filter((t) => !t.assigneeId && PRIORITY_RANK[t.priority] >= PRIORITY_RANK.high);
    if (orphaned.length > 0) {
      out.push({
        id: `unassigned:${project.id}`,
        kind: "unassigned",
        severity: "medium",
        projectId: project.id,
        title: `${pluralize(orphaned.length, "high-priority task has", "high-priority tasks have")} no owner in ${project.name}.`,
        context: "Unowned tasks are the ones that slip. Assign someone so it's clear who's driving.",
        evidence: orphaned.map((t) => t.title),
        rule: "Fires for open High/Urgent tasks without an assignee.",
        action:
          orphaned.length === 1
            ? { label: "Assign owner", href: taskHref(orphaned[0]) }
            : { label: "Assign owners", href: `/projects/${project.id}/tasks` },
      });
    }
  }

  // Rule 8 — scheduling opportunities from open polls
  const polls = ws.meetings.filter((m) => m.status === "polling" && myProjectIds.has(m.projectId));
  for (const meeting of polls) {
    const project = ws.projects.find((p) => p.id === meeting.projectId) as Project;
    const availability: Record<string, string[] | undefined> = {};
    for (const a of ws.availability.filter((a) => a.meetingId === meeting.id)) availability[a.userId] = a.slots;
    const participants = meeting.inviteeIds.map((id) => {
      const p = ws.profiles.find((x) => x.id === id);
      return {
        id,
        workStartHour: p?.workStartHour,
        workEndHour: p?.workEndHour,
        busy: busyFor(ws, id, meeting.id),
      };
    });
    const result = matchMeeting({ ...meeting, participants, availability });
    const iAmInvited = meeting.inviteeIds.includes(userId);
    const iResponded = availability[userId] !== undefined;

    if (iAmInvited && !iResponded) {
      out.push({
        id: `respond:${meeting.id}`,
        kind: "scheduling",
        severity: "high",
        projectId: project.id,
        title: `Your team is waiting on your availability for "${meeting.title}".`,
        context: `${result.respondedIds.length} of ${meeting.inviteeIds.length} teammates have responded. Adding yours lets NOVA SYNC lock in the best time.`,
        evidence: result.respondedIds.map((id) => `${name(id)} shared availability`),
        rule: "Fires when you're invited to an open meeting poll and haven't marked availability.",
        action: { label: "Share availability", href: `/meetings/${meeting.id}` },
      });
    } else if (result.best) {
      const b = result.best;
      const when = `${format(new Date(b.start), "EEEE")} at ${format(new Date(b.start), "HH:mm")}`;
      out.push({
        id: `schedule:${meeting.id}`,
        kind: "scheduling",
        severity: b.availableCount === b.totalCount ? "positive" : "medium",
        projectId: project.id,
        title: `${when} is the best meeting time for your team.`,
        context: `${b.availableCount}/${b.totalCount} members available (${b.teamPercentage}%) for "${meeting.title}".${result.pendingIds.length ? ` Still waiting on ${result.pendingIds.map(name).join(", ")}.` : " Everyone has responded — ready to confirm."}`,
        evidence: [
          `Best: ${format(new Date(b.start), "EEE d MMM, HH:mm")}–${format(new Date(b.end), "HH:mm")}`,
          ...result.alternatives
            .slice(0, 2)
            .map(
              (a) =>
                `Alternative: ${format(new Date(a.start), "EEE HH:mm")} · ${a.availableCount}/${a.totalCount} available`,
            ),
        ],
        rule: "Runs the meeting matcher on every open poll and surfaces the top-ranked slot.",
        action: { label: "Review & confirm", href: `/meetings/${meeting.id}` },
      });
    }
  }

  // Rule 9 — personal: my tasks due within 48h
  const mine = ws.tasks.filter(
    (t) =>
      t.assigneeId === userId &&
      t.status !== "done" &&
      t.dueDate &&
      new Date(t.dueDate) >= now &&
      differenceInCalendarDays(new Date(t.dueDate), now) <= 2 &&
      myProjectIds.has(t.projectId),
  );
  if (mine.length > 0) {
    out.push({
      id: `personal:${userId}`,
      kind: "personal",
      severity: "high",
      title: `You have ${pluralize(mine.length, "task")} due in the next 48 hours.`,
      context: "Focus Mode can help you get through them one at a time.",
      evidence: mine.map(
        (t) => `${t.title} — ${format(new Date(t.dueDate!), "EEE HH:mm")}`,
      ),
      rule: "Fires when tasks assigned to you are due within 2 days.",
      action: { label: "Start Focus Mode", href: "/focus" },
    });
  }

  return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}
