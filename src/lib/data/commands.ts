/**
 * Workspace commands.
 *
 * Every write in the app is expressed as a `Command`. The demo adapter runs
 * commands through the pure `applyCommand` reducer below; the Supabase adapter
 * translates the same commands into database writes. Side effects such as
 * activity events and notifications are derived here so the feed is always
 * consistent with the data.
 */
import { z } from "zod";
import type {
  ActivityEvent,
  ActivityType,
  CalendarEvent,
  ID,
  Meeting,
  Milestone,
  Profile,
  Project,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
  WorkspaceSnapshot,
} from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { computeProgress } from "@/lib/selectors/progress";
import { uid } from "@/lib/utils";
import { cellsForDay } from "@/lib/scheduling/matcher";
import { cellKey, parseLocalKey } from "@/lib/dates";

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandError";
  }
}

// ── Input schemas (shared with forms) ───────────────────────────────────
export const projectInputSchema = z.object({
  name: z.string().trim().min(3, "Give your project a name (3+ characters)").max(80),
  description: z.string().trim().max(600).default(""),
  course: z.string().trim().min(2, "Which course is this for?").max(80),
  courseCode: z.string().trim().max(16).default(""),
  deadline: z.string().min(1, "Pick a deadline"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  emoji: z.string().min(1).max(8),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const taskInputSchema = z.object({
  title: z.string().trim().min(2, "Tasks need a title").max(140),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assigneeId: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  milestoneId: z.string().nullable().default(null),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

export const meetingInputSchema = z
  .object({
    projectId: z.string().min(1, "Choose a project"),
    title: z.string().trim().min(3, "Give the meeting a title").max(100),
    description: z.string().trim().max(500).default(""),
    location: z.string().trim().max(120).default(""),
    durationMinutes: z.number().int().min(15).max(240),
    candidateDates: z.array(z.string()).min(1, "Propose at least one day").max(14),
    dayStartHour: z.number().int().min(0).max(23),
    dayEndHour: z.number().int().min(1).max(24),
    slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    inviteeIds: z.array(z.string()).min(2, "Invite at least one teammate"),
  })
  .refine((m) => m.dayEndHour > m.dayStartHour, {
    message: "End hour must be after start hour",
    path: ["dayEndHour"],
  })
  .refine((m) => (m.dayEndHour - m.dayStartHour) * 60 >= m.durationMinutes, {
    message: "The daily window is shorter than the meeting",
    path: ["durationMinutes"],
  });
export type MeetingInput = z.infer<typeof meetingInputSchema>;

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(2, "Add a title").max(100),
    description: z.string().trim().max(500).default(""),
    projectId: z.string().nullable().default(null),
    start: z.string().min(1),
    end: z.string().min(1),
  })
  .refine((e) => new Date(e.end) > new Date(e.start), {
    message: "End must be after start",
    path: ["end"],
  });
export type EventInput = z.infer<typeof eventInputSchema>;

export const profileInputSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(60),
  degree: z.string().trim().max(80).default(""),
  bio: z.string().trim().max(240).default(""),
  interests: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  workStartHour: z.number().int().min(0).max(23),
  workEndHour: z.number().int().min(1).max(24),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

// ── Command union ───────────────────────────────────────────────────────
export type Command =
  | { type: "project.create"; input: ProjectInput; memberIds?: ID[]; id?: ID }
  | { type: "project.update"; id: ID; patch: Partial<ProjectInput> & { status?: Project["status"] } }
  | { type: "project.delete"; id: ID }
  | { type: "member.invite"; projectId: ID; name: string; email: string }
  | { type: "member.add"; projectId: ID; userId: ID }
  | { type: "member.join"; code: string }
  | { type: "member.remove"; projectId: ID; userId: ID }
  | { type: "task.create"; projectId: ID; input: TaskInput; id?: ID }
  | { type: "task.update"; id: ID; patch: Partial<TaskInput> }
  | { type: "task.move"; id: ID; status: TaskStatus; index: number }
  | { type: "task.delete"; id: ID }
  | { type: "subtask.add"; taskId: ID; title: string }
  | { type: "subtask.toggle"; id: ID }
  | { type: "subtask.delete"; id: ID }
  | { type: "comment.add"; taskId: ID; body: string }
  | { type: "milestone.create"; projectId: ID; title: string; dueDate: string; description?: string }
  | { type: "milestone.toggle"; id: ID }
  | { type: "milestone.delete"; id: ID }
  | { type: "meeting.create"; input: MeetingInput; id?: ID }
  | { type: "meeting.availability"; meetingId: ID; userId: ID; slots: string[] }
  | { type: "meeting.confirm"; meetingId: ID; start: string; end: string; location?: string }
  | { type: "meeting.reopen"; meetingId: ID }
  | { type: "meeting.cancel"; meetingId: ID }
  | { type: "event.create"; input: EventInput }
  | { type: "event.update"; id: ID; input: EventInput }
  | { type: "event.delete"; id: ID }
  | { type: "update.post"; projectId: ID; body: string }
  | { type: "notification.read"; id: ID }
  | { type: "notification.readAll" }
  | { type: "profile.update"; input: Partial<ProfileInput> & { onboarded?: boolean } };

export interface CommandResult {
  ws: WorkspaceSnapshot;
  /** Id of a created entity, if any. */
  createdId?: ID;
  /** Set when this command pushed a project to 100% completion. */
  completedProjectId?: ID;
}

// ── Helpers ─────────────────────────────────────────────────────────────
function clone(ws: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    profiles: [...ws.profiles],
    projects: [...ws.projects],
    members: [...ws.members],
    tasks: [...ws.tasks],
    subtasks: [...ws.subtasks],
    comments: [...ws.comments],
    milestones: [...ws.milestones],
    meetings: [...ws.meetings],
    availability: [...ws.availability],
    events: [...ws.events],
    updates: [...ws.updates],
    activity: [...ws.activity],
    notifications: [...ws.notifications],
  };
}

function must<T>(value: T | undefined, what: string): T {
  if (!value) throw new CommandError(`${what} not found. It may have been deleted.`);
  return value;
}

function isMember(ws: WorkspaceSnapshot, projectId: ID, userId: ID) {
  return ws.members.some((m) => m.projectId === projectId && m.userId === userId);
}

function requireMember(ws: WorkspaceSnapshot, projectId: ID, userId: ID) {
  if (!isMember(ws, projectId, userId))
    throw new CommandError("You're not a member of this project.");
}

function requireOwner(ws: WorkspaceSnapshot, projectId: ID, userId: ID) {
  const m = ws.members.find((m) => m.projectId === projectId && m.userId === userId);
  if (m?.role !== "owner") throw new CommandError("Only the project owner can do that.");
}

const PALETTE = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#0EA5E9", "#14B8A6", "#F43F5E", "#6366F1"];

function inviteCode(name: string) {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `${prefix}-${rand}`;
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new CommandError(r.error.issues[0]?.message ?? "Invalid input");
  return r.data;
}

// ── Reducer ─────────────────────────────────────────────────────────────
export interface ApplyOptions {
  /**
   * Demo mode only: lets the signed-in user fill in a simulated teammate's
   * availability so the scheduler can be demonstrated alone. Real workspaces
   * leave this off, and RLS enforces the same rule in Supabase.
   */
  allowProxyAvailability?: boolean;
}

export function applyCommand(
  current: WorkspaceSnapshot,
  actorId: ID,
  cmd: Command,
  now: Date = new Date(),
  options: ApplyOptions = {},
): CommandResult {
  const ws = clone(current);
  const ts = now.toISOString();
  const actor = must(ws.profiles.find((p) => p.id === actorId), "Your profile");

  const log = (projectId: ID, type: ActivityType, meta: ActivityEvent["meta"] = {}) => {
    ws.activity.unshift({ id: uid("act"), projectId, actorId, type, meta, createdAt: ts });
  };
  const notify = (userId: ID, title: string, body: string, href: string) => {
    if (userId === actorId) return;
    ws.notifications.unshift({ id: uid("ntf"), userId, title, body, href, read: false, createdAt: ts });
  };
  const replace = <T extends { id: ID }>(list: T[], next: T) => {
    const i = list.findIndex((x) => x.id === next.id);
    list[i] = next;
  };
  const first = actor.name.split(" ")[0];

  /** Detects a project crossing to 100% because of this command. */
  const completionCheck = (projectId: ID, before: WorkspaceSnapshot): ID | undefined => {
    const was = computeProgress(before.tasks.filter((t) => t.projectId === projectId));
    const is = computeProgress(ws.tasks.filter((t) => t.projectId === projectId));
    if (is.total > 0 && is.percentage === 100 && was.percentage < 100) {
      log(projectId, "project_completed");
      return projectId;
    }
    return undefined;
  };

  switch (cmd.type) {
    // ── Projects ──
    case "project.create": {
      const input = parse(projectInputSchema, cmd.input);
      const id = cmd.id ?? uid("prj");
      ws.projects.push({ id, ...input, status: "active", inviteCode: inviteCode(input.name), ownerId: actorId, createdAt: ts });
      ws.members.push({ projectId: id, userId: actorId, role: "owner", joinedAt: ts });
      for (const userId of new Set(cmd.memberIds ?? [])) {
        if (userId === actorId || !ws.profiles.some((p) => p.id === userId)) continue;
        ws.members.push({ projectId: id, userId, role: "member", joinedAt: ts });
        notify(userId, `${first} added you to a project`, input.name, `/projects/${id}`);
      }
      log(id, "project_created");
      return { ws, createdId: id };
    }
    case "project.update": {
      const p = must(ws.projects.find((x) => x.id === cmd.id), "Project");
      requireMember(ws, p.id, actorId);
      const patch = { ...cmd.patch };
      if (patch.name !== undefined || patch.course !== undefined)
        parse(projectInputSchema.partial(), patch);
      replace(ws.projects, { ...p, ...patch });
      return { ws };
    }
    case "project.delete": {
      must(ws.projects.find((x) => x.id === cmd.id), "Project");
      requireOwner(ws, cmd.id, actorId);
      const taskIds = new Set(ws.tasks.filter((t) => t.projectId === cmd.id).map((t) => t.id));
      const meetingIds = new Set(ws.meetings.filter((m) => m.projectId === cmd.id).map((m) => m.id));
      ws.projects = ws.projects.filter((p) => p.id !== cmd.id);
      ws.members = ws.members.filter((m) => m.projectId !== cmd.id);
      ws.tasks = ws.tasks.filter((t) => !taskIds.has(t.id));
      ws.subtasks = ws.subtasks.filter((s) => !taskIds.has(s.taskId));
      ws.comments = ws.comments.filter((c) => !taskIds.has(c.taskId));
      ws.milestones = ws.milestones.filter((m) => m.projectId !== cmd.id);
      ws.meetings = ws.meetings.filter((m) => !meetingIds.has(m.id));
      ws.availability = ws.availability.filter((a) => !meetingIds.has(a.meetingId));
      ws.events = ws.events.filter((e) => e.projectId !== cmd.id);
      ws.updates = ws.updates.filter((u) => u.projectId !== cmd.id);
      ws.activity = ws.activity.filter((a) => a.projectId !== cmd.id);
      return { ws };
    }

    // ── Members ──
    case "member.invite": {
      requireMember(ws, cmd.projectId, actorId);
      const name = cmd.name.trim();
      const email = cmd.email.trim().toLowerCase();
      if (name.length < 2) throw new CommandError("Enter your teammate's name");
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new CommandError("Enter a valid email address");
      let profile = ws.profiles.find((p) => p.email.toLowerCase() === email);
      if (!profile) {
        profile = {
          id: uid("usr"),
          name,
          email,
          color: PALETTE[ws.profiles.length % PALETTE.length],
          degree: "",
          university: "NOVA University Lisbon",
          interests: [],
          bio: "",
          workStartHour: 9,
          workEndHour: 18,
          onboarded: false,
          createdAt: ts,
        } satisfies Profile;
        ws.profiles.push(profile);
      }
      if (isMember(ws, cmd.projectId, profile.id))
        throw new CommandError(`${profile.name} is already on this project`);
      ws.members.push({ projectId: cmd.projectId, userId: profile.id, role: "member", joinedAt: ts });
      ws.activity.unshift({ id: uid("act"), projectId: cmd.projectId, actorId: profile.id, type: "member_joined", meta: {}, createdAt: ts });
      return { ws, createdId: profile.id };
    }
    case "member.add": {
      requireMember(ws, cmd.projectId, actorId);
      must(ws.profiles.find((p) => p.id === cmd.userId), "Person");
      if (isMember(ws, cmd.projectId, cmd.userId)) throw new CommandError("Already a member");
      ws.members.push({ projectId: cmd.projectId, userId: cmd.userId, role: "member", joinedAt: ts });
      ws.activity.unshift({ id: uid("act"), projectId: cmd.projectId, actorId: cmd.userId, type: "member_joined", meta: {}, createdAt: ts });
      return { ws };
    }
    case "member.join": {
      const code = cmd.code.trim().toUpperCase();
      const p = ws.projects.find((x) => x.inviteCode.toUpperCase() === code);
      if (!p) throw new CommandError("No project found for that invite code");
      if (isMember(ws, p.id, actorId)) throw new CommandError(`You're already in ${p.name}`);
      ws.members.push({ projectId: p.id, userId: actorId, role: "member", joinedAt: ts });
      log(p.id, "member_joined");
      notify(p.ownerId, `${first} joined your project`, p.name, `/projects/${p.id}/team`);
      return { ws, createdId: p.id };
    }
    case "member.remove": {
      requireOwner(ws, cmd.projectId, actorId);
      if (cmd.userId === actorId) throw new CommandError("Owners can't remove themselves");
      ws.members = ws.members.filter((m) => !(m.projectId === cmd.projectId && m.userId === cmd.userId));
      ws.tasks = ws.tasks.map((t) =>
        t.projectId === cmd.projectId && t.assigneeId === cmd.userId ? { ...t, assigneeId: null, updatedAt: ts } : t,
      );
      return { ws };
    }

    // ── Tasks ──
    case "task.create": {
      requireMember(ws, cmd.projectId, actorId);
      const input = parse(taskInputSchema, cmd.input);
      if (input.assigneeId && !isMember(ws, cmd.projectId, input.assigneeId))
        throw new CommandError("Assignee must be a project member");
      const id = cmd.id ?? uid("tsk");
      const order =
        Math.max(0, ...ws.tasks.filter((t) => t.projectId === cmd.projectId && t.status === input.status).map((t) => t.order)) + 1;
      const t: Task = {
        id,
        projectId: cmd.projectId,
        ...input,
        order,
        createdBy: actorId,
        createdAt: ts,
        updatedAt: ts,
        completedAt: input.status === "done" ? ts : null,
      };
      ws.tasks.push(t);
      log(cmd.projectId, "task_created", { taskId: id, taskTitle: t.title });
      if (t.assigneeId) {
        notify(t.assigneeId, `${first} assigned you a task`, t.title, `/projects/${t.projectId}/tasks?task=${id}`);
      }
      return { ws, createdId: id, completedProjectId: completionCheck(cmd.projectId, current) };
    }
    case "task.update": {
      const t = must(ws.tasks.find((x) => x.id === cmd.id), "Task");
      requireMember(ws, t.projectId, actorId);
      const patch = parse(taskInputSchema.partial(), cmd.patch);
      // `.partial()` keeps defaults, so only apply keys the caller actually sent.
      const sent = Object.fromEntries(
        Object.keys(cmd.patch).map((k) => [k, (patch as Record<string, unknown>)[k]]),
      ) as Partial<TaskInput>;
      if (sent.assigneeId && !isMember(ws, t.projectId, sent.assigneeId))
        throw new CommandError("Assignee must be a project member");
      const next: Task = { ...t, ...sent, updatedAt: ts };
      if (sent.status && sent.status !== t.status) {
        next.completedAt = sent.status === "done" ? ts : null;
        if (sent.status === "done") log(t.projectId, "task_completed", { taskId: t.id, taskTitle: next.title });
        else log(t.projectId, "task_moved", { taskId: t.id, taskTitle: next.title, from: t.status, to: sent.status });
      }
      if (sent.assigneeId !== undefined && sent.assigneeId !== t.assigneeId) {
        if (sent.assigneeId) {
          log(t.projectId, "task_assigned", { taskId: t.id, taskTitle: next.title, assigneeId: sent.assigneeId });
          notify(sent.assigneeId, `${first} assigned you a task`, next.title, `/projects/${t.projectId}/tasks?task=${t.id}`);
        }
      }
      const contentChanged = (["title", "description", "priority", "dueDate"] as const).some(
        (k) => k in sent && sent[k] !== t[k],
      );
      if (contentChanged && !sent.status) log(t.projectId, "task_updated", { taskId: t.id, taskTitle: next.title });
      replace(ws.tasks, next);
      return { ws, completedProjectId: completionCheck(t.projectId, current) };
    }
    case "task.move": {
      const t = must(ws.tasks.find((x) => x.id === cmd.id), "Task");
      requireMember(ws, t.projectId, actorId);
      if (!(cmd.status in STATUS_LABEL)) throw new CommandError("Unknown task status");
      if (!Number.isFinite(cmd.index)) throw new CommandError("Invalid position");
      const column = ws.tasks
        .filter((x) => x.projectId === t.projectId && x.status === cmd.status && x.id !== t.id)
        .sort((a, b) => a.order - b.order);
      const index = Math.max(0, Math.min(cmd.index, column.length));
      const moved: Task = {
        ...t,
        status: cmd.status,
        updatedAt: ts,
        completedAt: cmd.status === "done" ? (t.status === "done" ? t.completedAt : ts) : null,
      };
      column.splice(index, 0, moved);
      column.forEach((x, i) => replace(ws.tasks, { ...(x.id === moved.id ? moved : x), order: i + 1 }));
      if (t.status !== cmd.status) {
        if (cmd.status === "done") log(t.projectId, "task_completed", { taskId: t.id, taskTitle: t.title });
        else log(t.projectId, "task_moved", { taskId: t.id, taskTitle: t.title, from: t.status, to: cmd.status });
      }
      return { ws, completedProjectId: completionCheck(t.projectId, current) };
    }
    case "task.delete": {
      const t = must(ws.tasks.find((x) => x.id === cmd.id), "Task");
      requireMember(ws, t.projectId, actorId);
      ws.tasks = ws.tasks.filter((x) => x.id !== t.id);
      ws.subtasks = ws.subtasks.filter((s) => s.taskId !== t.id);
      ws.comments = ws.comments.filter((c) => c.taskId !== t.id);
      return { ws, completedProjectId: completionCheck(t.projectId, current) };
    }

    // ── Subtasks ──
    case "subtask.add": {
      const t = must(ws.tasks.find((x) => x.id === cmd.taskId), "Task");
      requireMember(ws, t.projectId, actorId);
      const title = cmd.title.trim();
      if (!title) throw new CommandError("Subtasks need a title");
      const s: Subtask = { id: uid("sub"), taskId: t.id, title: title.slice(0, 140), done: false, createdAt: ts };
      ws.subtasks.push(s);
      replace(ws.tasks, { ...t, updatedAt: ts });
      return { ws, createdId: s.id };
    }
    case "subtask.toggle": {
      const s = must(ws.subtasks.find((x) => x.id === cmd.id), "Subtask");
      const t = must(ws.tasks.find((x) => x.id === s.taskId), "Task");
      requireMember(ws, t.projectId, actorId);
      replace(ws.subtasks, { ...s, done: !s.done });
      replace(ws.tasks, { ...t, updatedAt: ts });
      return { ws };
    }
    case "subtask.delete": {
      const s = must(ws.subtasks.find((x) => x.id === cmd.id), "Subtask");
      const t = must(ws.tasks.find((x) => x.id === s.taskId), "Task");
      requireMember(ws, t.projectId, actorId);
      ws.subtasks = ws.subtasks.filter((x) => x.id !== s.id);
      return { ws };
    }

    // ── Comments ──
    case "comment.add": {
      const t = must(ws.tasks.find((x) => x.id === cmd.taskId), "Task");
      requireMember(ws, t.projectId, actorId);
      const body = cmd.body.trim();
      if (!body) throw new CommandError("Write something first");
      if (body.length > 2000) throw new CommandError("Comments are limited to 2000 characters");
      ws.comments.push({ id: uid("cmt"), taskId: t.id, authorId: actorId, body, createdAt: ts });
      replace(ws.tasks, { ...t, updatedAt: ts });
      log(t.projectId, "task_commented", { taskId: t.id, taskTitle: t.title, excerpt: body.slice(0, 80) });
      if (t.assigneeId) notify(t.assigneeId, `${first} commented on your task`, t.title, `/projects/${t.projectId}/tasks?task=${t.id}`);
      return { ws };
    }

    // ── Milestones ──
    case "milestone.create": {
      requireMember(ws, cmd.projectId, actorId);
      const title = cmd.title.trim();
      if (title.length < 2) throw new CommandError("Milestones need a title");
      if (!cmd.dueDate) throw new CommandError("Pick a due date");
      const m: Milestone = { id: uid("mst"), projectId: cmd.projectId, title, description: cmd.description?.trim() ?? "", dueDate: cmd.dueDate, completedAt: null, createdAt: ts };
      ws.milestones.push(m);
      return { ws, createdId: m.id };
    }
    case "milestone.toggle": {
      const m = must(ws.milestones.find((x) => x.id === cmd.id), "Milestone");
      requireMember(ws, m.projectId, actorId);
      const completedAt = m.completedAt ? null : ts;
      replace(ws.milestones, { ...m, completedAt });
      if (completedAt) log(m.projectId, "milestone_completed", { milestoneTitle: m.title });
      return { ws };
    }
    case "milestone.delete": {
      const m = must(ws.milestones.find((x) => x.id === cmd.id), "Milestone");
      requireMember(ws, m.projectId, actorId);
      ws.milestones = ws.milestones.filter((x) => x.id !== m.id);
      ws.tasks = ws.tasks.map((t) => (t.milestoneId === m.id ? { ...t, milestoneId: null } : t));
      return { ws };
    }

    // ── Meetings ──
    case "meeting.create": {
      const input = parse(meetingInputSchema, cmd.input);
      requireMember(ws, input.projectId, actorId);
      const invitees = [...new Set([actorId, ...input.inviteeIds])].filter((id) =>
        isMember(ws, input.projectId, id),
      );
      const id = cmd.id ?? uid("mtg");
      const m: Meeting = {
        id,
        ...input,
        candidateDates: [...new Set(input.candidateDates)].sort(),
        inviteeIds: invitees,
        organizerId: actorId,
        status: "polling",
        confirmedStart: null,
        confirmedEnd: null,
        createdAt: ts,
      };
      ws.meetings.push(m);
      log(input.projectId, "meeting_proposed", { meetingId: id, meetingTitle: m.title });
      for (const u of invitees)
        notify(u, `${first} needs your availability`, m.title, `/meetings/${id}`);
      return { ws, createdId: id };
    }
    case "meeting.availability": {
      const m = must(ws.meetings.find((x) => x.id === cmd.meetingId), "Meeting");
      requireMember(ws, m.projectId, actorId);
      if (cmd.userId !== actorId && !options.allowProxyAvailability)
        throw new CommandError("You can only share your own availability");
      if (!m.inviteeIds.includes(cmd.userId)) throw new CommandError("That person isn't invited");
      if (m.status !== "polling") throw new CommandError("This poll is closed");
      // Keep only real grid cells: candidate days, inside the daily window, on the slot grid.
      const allowed = new Set(m.candidateDates.flatMap((d) => cellsForDay(d, m.dayStartHour, m.dayEndHour, m.slotMinutes)));
      const slots = [...new Set(cmd.slots)].filter((k) => allowed.has(k)).sort();
      const existing = ws.availability.findIndex((a) => a.meetingId === m.id && a.userId === cmd.userId);
      const record = { meetingId: m.id, userId: cmd.userId, slots, updatedAt: ts };
      if (existing >= 0) ws.availability[existing] = record;
      else {
        ws.availability.push(record);
        ws.activity.unshift({ id: uid("act"), projectId: m.projectId, actorId: cmd.userId, type: "availability_shared", meta: { meetingId: m.id, meetingTitle: m.title }, createdAt: ts });
      }
      return { ws };
    }
    case "meeting.confirm": {
      const m = must(ws.meetings.find((x) => x.id === cmd.meetingId), "Meeting");
      requireMember(ws, m.projectId, actorId);
      if (m.status !== "polling") throw new CommandError("Only an open poll can be confirmed");
      const start = new Date(cmd.start);
      const end = new Date(cmd.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start)
        throw new CommandError("Invalid time slot");
      if (end.getTime() - start.getTime() !== m.durationMinutes * 60_000)
        throw new CommandError("The slot must match the meeting length");
      // The slot has to start on the poll's grid and finish inside the same day's window.
      const day = m.candidateDates.find((d) => cellsForDay(d, m.dayStartHour, m.dayEndHour, m.slotMinutes).includes(cellKey(start)));
      const windowEnd = day ? parseLocalKey(day) : null;
      windowEnd?.setHours(m.dayEndHour, 0, 0, 0);
      if (!day || !windowEnd || end > windowEnd) throw new CommandError("That time isn't one of the poll's options");
      const location = cmd.location !== undefined ? cmd.location.trim().slice(0, 120) : m.location;
      replace(ws.meetings, { ...m, location, status: "confirmed", confirmedStart: cmd.start, confirmedEnd: cmd.end });
      log(m.projectId, "meeting_confirmed", { meetingId: m.id, meetingTitle: m.title });
      for (const u of m.inviteeIds) notify(u, `${first} scheduled a meeting`, m.title, `/meetings/${m.id}`);
      return { ws };
    }
    case "meeting.reopen": {
      const m = must(ws.meetings.find((x) => x.id === cmd.meetingId), "Meeting");
      requireMember(ws, m.projectId, actorId);
      replace(ws.meetings, { ...m, status: "polling", confirmedStart: null, confirmedEnd: null });
      return { ws };
    }
    case "meeting.cancel": {
      const m = must(ws.meetings.find((x) => x.id === cmd.meetingId), "Meeting");
      requireMember(ws, m.projectId, actorId);
      if (m.organizerId !== actorId) requireOwner(ws, m.projectId, actorId);
      replace(ws.meetings, { ...m, status: "cancelled" });
      return { ws };
    }

    // ── Calendar events ──
    case "event.create": {
      const input = parse(eventInputSchema, cmd.input);
      if (input.projectId) requireMember(ws, input.projectId, actorId);
      const e: CalendarEvent = { id: uid("evt"), ...input, createdBy: actorId, createdAt: ts };
      ws.events.push(e);
      if (input.projectId) log(input.projectId, "event_created", { excerpt: e.title });
      return { ws, createdId: e.id };
    }
    case "event.update": {
      const e = must(ws.events.find((x) => x.id === cmd.id), "Event");
      if (e.createdBy !== actorId && !(e.projectId && isMember(ws, e.projectId, actorId)))
        throw new CommandError("You can't edit this event");
      const input = parse(eventInputSchema, cmd.input);
      if (input.projectId) requireMember(ws, input.projectId, actorId);
      replace(ws.events, { ...e, ...input });
      return { ws };
    }
    case "event.delete": {
      const e = must(ws.events.find((x) => x.id === cmd.id), "Event");
      if (e.createdBy !== actorId && !(e.projectId && isMember(ws, e.projectId, actorId)))
        throw new CommandError("You can't delete this event");
      ws.events = ws.events.filter((x) => x.id !== e.id);
      return { ws };
    }

    // ── Updates & notifications ──
    case "update.post": {
      requireMember(ws, cmd.projectId, actorId);
      const body = cmd.body.trim();
      if (!body) throw new CommandError("Write an update first");
      if (body.length > 1000) throw new CommandError("Updates are limited to 1000 characters");
      ws.updates.unshift({ id: uid("upd"), projectId: cmd.projectId, authorId: actorId, body, createdAt: ts });
      log(cmd.projectId, "update_posted", { excerpt: body.slice(0, 100) });
      for (const m of ws.members.filter((m) => m.projectId === cmd.projectId))
        notify(m.userId, `${first} posted an update`, body.slice(0, 80), `/projects/${cmd.projectId}/activity`);
      return { ws };
    }
    case "notification.read": {
      ws.notifications = ws.notifications.map((n) => (n.id === cmd.id && n.userId === actorId ? { ...n, read: true } : n));
      return { ws };
    }
    case "notification.readAll": {
      ws.notifications = ws.notifications.map((n) => (n.userId === actorId ? { ...n, read: true } : n));
      return { ws };
    }

    // ── Profile ──
    case "profile.update": {
      const { onboarded, ...rest } = cmd.input;
      const patch = parse(profileInputSchema.partial(), rest);
      const sent = Object.fromEntries(
        Object.keys(rest).map((k) => [k, (patch as Record<string, unknown>)[k]]),
      ) as Partial<ProfileInput>;
      const next = { ...actor, ...sent, ...(onboarded !== undefined ? { onboarded } : {}) };
      if (next.workEndHour <= next.workStartHour) throw new CommandError("Working hours must end after they start");
      replace(ws.profiles, next);
      return { ws };
    }
  }
}

export function describeStatusChange(from?: TaskStatus, to?: TaskStatus) {
  if (!from || !to) return "";
  return `${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}`;
}

export type { TaskPriority };
