import type { WorkspaceSnapshot } from "@/lib/types";
import { projectsForUser } from "./workspace";

export type CalendarKind = "meeting" | "deadline" | "task" | "milestone" | "event";

export interface CalendarItem {
  id: string;
  kind: CalendarKind;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  projectId: string | null;
  href?: string;
  /** Present for user-created events, which can be edited. */
  eventId?: string;
  done?: boolean;
  subtitle?: string;
}

export const KIND_LABEL: Record<CalendarKind, string> = {
  meeting: "Meetings",
  deadline: "Project deadlines",
  task: "Task due dates",
  milestone: "Milestones",
  event: "Events",
};

/** Everything that belongs on the user's calendar, from live workspace data. */
export function calendarItems(ws: WorkspaceSnapshot, userId: string): CalendarItem[] {
  const projects = projectsForUser(ws, userId);
  const ids = new Set(projects.map((p) => p.id));
  const name = (id: string | null) => (id ? (ws.projects.find((p) => p.id === id)?.name ?? "") : "Personal");
  const items: CalendarItem[] = [];

  for (const m of ws.meetings) {
    if (!ids.has(m.projectId) || m.status !== "confirmed" || !m.confirmedStart || !m.confirmedEnd) continue;
    items.push({ id: `m-${m.id}`, kind: "meeting", title: m.title, start: m.confirmedStart, end: m.confirmedEnd, allDay: false, projectId: m.projectId, href: `/meetings/${m.id}`, subtitle: m.location || name(m.projectId) });
  }
  for (const p of projects) {
    items.push({ id: `p-${p.id}`, kind: "deadline", title: `${p.name} due`, start: p.deadline, end: p.deadline, allDay: true, projectId: p.id, href: `/projects/${p.id}`, done: p.status === "completed", subtitle: p.course });
  }
  for (const ms of ws.milestones) {
    if (!ids.has(ms.projectId)) continue;
    items.push({ id: `ms-${ms.id}`, kind: "milestone", title: ms.title, start: ms.dueDate, end: ms.dueDate, allDay: true, projectId: ms.projectId, href: `/projects/${ms.projectId}`, done: !!ms.completedAt, subtitle: name(ms.projectId) });
  }
  for (const t of ws.tasks) {
    if (!ids.has(t.projectId) || !t.dueDate) continue;
    items.push({ id: `t-${t.id}`, kind: "task", title: t.title, start: t.dueDate, end: t.dueDate, allDay: true, projectId: t.projectId, href: `/projects/${t.projectId}/tasks?task=${t.id}`, done: t.status === "done", subtitle: name(t.projectId) });
  }
  for (const e of ws.events) {
    if (e.projectId ? !ids.has(e.projectId) : e.createdBy !== userId) continue;
    items.push({ id: `e-${e.id}`, kind: "event", title: e.title, start: e.start, end: e.end, allDay: false, projectId: e.projectId, eventId: e.id, subtitle: e.description || name(e.projectId) });
  }
  return items.sort((a, b) => a.start.localeCompare(b.start));
}
