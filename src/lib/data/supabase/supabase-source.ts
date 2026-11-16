/**
 * Supabase data source.
 *
 * Reads: every table is fetched with the user's JWT, so Row Level Security
 * decides what comes back (see supabase/migrations).
 *
 * Writes: commands run through the same `applyCommand` reducer as demo mode
 * (one implementation of the business rules), and the resulting row-level
 * diff is persisted. Postgres RLS re-checks every write server-side, so a
 * tampered client still cannot touch projects it isn't a member of.
 * Membership changes that need elevated lookups (invite by email, join by
 * code) go through SECURITY DEFINER RPCs instead.
 *
 * Realtime: postgres_changes on the project tables trigger a debounced reload.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cellKey, parseLocalKey } from "@/lib/dates";
import type { WorkspaceSnapshot } from "@/lib/types";
import { applyCommand, CommandError, type Command, type CommandResult } from "../commands";
import type { DataSource, Session, SignInInput, SignUpInput } from "../source";

type Row = Record<string, unknown>;

const TABLES = [
  "profiles",
  "projects",
  "project_members",
  "milestones",
  "tasks",
  "subtasks",
  "task_comments",
  "meetings",
  "meeting_invitees",
  "meeting_availability",
  "calendar_events",
  "project_updates",
  "activity_events",
  "notifications",
] as const;

// ── Row mappers ─────────────────────────────────────────────────────────
const s = (v: unknown) => (v == null ? "" : String(v));
const n = (v: unknown) => (v == null ? null : String(v));

function toSnapshot(r: Record<(typeof TABLES)[number], Row[]>): WorkspaceSnapshot {
  const invitees = r.meeting_invitees;
  return {
    profiles: r.profiles.map((p) => ({
      id: s(p.id),
      name: s(p.name),
      email: s(p.email),
      color: s(p.color) || "#2563EB",
      degree: s(p.degree),
      university: s(p.university),
      interests: (p.interests as string[]) ?? [],
      bio: s(p.bio),
      workStartHour: Number(p.work_start_hour ?? 9),
      workEndHour: Number(p.work_end_hour ?? 18),
      onboarded: Boolean(p.onboarded),
      createdAt: s(p.created_at),
    })),
    projects: r.projects.map((p) => ({
      id: s(p.id),
      name: s(p.name),
      description: s(p.description),
      course: s(p.course),
      courseCode: s(p.course_code),
      deadline: s(p.deadline),
      status: p.status as WorkspaceSnapshot["projects"][number]["status"],
      color: s(p.color),
      emoji: s(p.emoji),
      inviteCode: s(p.invite_code),
      ownerId: s(p.owner_id),
      createdAt: s(p.created_at),
    })),
    members: r.project_members.map((m) => ({
      projectId: s(m.project_id),
      userId: s(m.user_id),
      role: m.role as "owner" | "member",
      joinedAt: s(m.joined_at),
    })),
    milestones: r.milestones.map((m) => ({
      id: s(m.id),
      projectId: s(m.project_id),
      title: s(m.title),
      description: s(m.description),
      dueDate: s(m.due_date),
      completedAt: n(m.completed_at),
      createdAt: s(m.created_at),
    })),
    tasks: r.tasks.map((t) => ({
      id: s(t.id),
      projectId: s(t.project_id),
      title: s(t.title),
      description: s(t.description),
      status: t.status as WorkspaceSnapshot["tasks"][number]["status"],
      priority: t.priority as WorkspaceSnapshot["tasks"][number]["priority"],
      assigneeId: n(t.assignee_id),
      dueDate: n(t.due_date),
      milestoneId: n(t.milestone_id),
      order: Number(t.sort_order ?? 0),
      createdBy: s(t.created_by),
      createdAt: s(t.created_at),
      updatedAt: s(t.updated_at),
      completedAt: n(t.completed_at),
    })),
    subtasks: r.subtasks.map((x) => ({
      id: s(x.id),
      taskId: s(x.task_id),
      title: s(x.title),
      done: Boolean(x.done),
      createdAt: s(x.created_at),
    })),
    comments: r.task_comments.map((c) => ({
      id: s(c.id),
      taskId: s(c.task_id),
      authorId: s(c.author_id),
      body: s(c.body),
      createdAt: s(c.created_at),
    })),
    meetings: r.meetings.map((m) => ({
      id: s(m.id),
      projectId: s(m.project_id),
      title: s(m.title),
      description: s(m.description),
      location: s(m.location),
      organizerId: s(m.organizer_id),
      durationMinutes: Number(m.duration_minutes),
      candidateDates: ((m.candidate_dates as string[]) ?? []).map((d) => d.slice(0, 10)),
      dayStartHour: Number(m.day_start_hour),
      dayEndHour: Number(m.day_end_hour),
      slotMinutes: Number(m.slot_minutes),
      inviteeIds: invitees.filter((i) => i.meeting_id === m.id).map((i) => s(i.user_id)),
      status: m.status as WorkspaceSnapshot["meetings"][number]["status"],
      confirmedStart: n(m.confirmed_start),
      confirmedEnd: n(m.confirmed_end),
      createdAt: s(m.created_at),
    })),
    availability: invitees
      .filter((i) => i.responded_at)
      .map((i) => ({
        meetingId: s(i.meeting_id),
        userId: s(i.user_id),
        slots: r.meeting_availability
          .filter((a) => a.meeting_id === i.meeting_id && a.user_id === i.user_id)
          .map((a) => cellKey(new Date(s(a.slot_start))))
          .sort(),
        updatedAt: s(i.responded_at),
      })),
    events: r.calendar_events.map((e) => ({
      id: s(e.id),
      projectId: n(e.project_id),
      title: s(e.title),
      description: s(e.description),
      start: s(e.starts_at),
      end: s(e.ends_at),
      createdBy: s(e.created_by),
      createdAt: s(e.created_at),
    })),
    updates: r.project_updates.map((u) => ({
      id: s(u.id),
      projectId: s(u.project_id),
      authorId: s(u.author_id),
      body: s(u.body),
      createdAt: s(u.created_at),
    })),
    activity: r.activity_events
      .map((a) => ({
        id: s(a.id),
        projectId: s(a.project_id),
        actorId: s(a.actor_id),
        type: a.type as WorkspaceSnapshot["activity"][number]["type"],
        meta: (a.meta as WorkspaceSnapshot["activity"][number]["meta"]) ?? {},
        createdAt: s(a.created_at),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    notifications: r.notifications
      .map((x) => ({
        id: s(x.id),
        userId: s(x.user_id),
        title: s(x.title),
        body: s(x.body),
        href: s(x.href),
        read: Boolean(x.read),
        createdAt: s(x.created_at),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

/** Snapshot → table rows, keyed by a stable primary key string. */
function toRows(ws: WorkspaceSnapshot): Record<string, Map<string, Row>> {
  const m = <T>(list: T[], key: (x: T) => string, row: (x: T) => Row) =>
    new Map(list.map((x) => [key(x), row(x)]));
  const availabilityRows: Row[] = [];
  for (const a of ws.availability)
    for (const k of a.slots)
      availabilityRows.push({ meeting_id: a.meetingId, user_id: a.userId, slot_start: parseLocalKey(k).toISOString() });
  return {
    profiles: m(ws.profiles, (p) => p.id, (p) => ({
      id: p.id, name: p.name, degree: p.degree, university: p.university, interests: p.interests, bio: p.bio,
      color: p.color, work_start_hour: p.workStartHour, work_end_hour: p.workEndHour, onboarded: p.onboarded,
    })),
    projects: m(ws.projects, (p) => p.id, (p) => ({
      id: p.id, name: p.name, description: p.description, course: p.course, course_code: p.courseCode,
      deadline: p.deadline, status: p.status, color: p.color, emoji: p.emoji, invite_code: p.inviteCode, owner_id: p.ownerId,
    })),
    project_members: m(ws.members, (x) => `${x.projectId}|${x.userId}`, (x) => ({ project_id: x.projectId, user_id: x.userId, role: x.role })),
    milestones: m(ws.milestones, (x) => x.id, (x) => ({
      id: x.id, project_id: x.projectId, title: x.title, description: x.description, due_date: x.dueDate, completed_at: x.completedAt,
    })),
    tasks: m(ws.tasks, (t) => t.id, (t) => ({
      id: t.id, project_id: t.projectId, title: t.title, description: t.description, status: t.status, priority: t.priority,
      assignee_id: t.assigneeId, due_date: t.dueDate, milestone_id: t.milestoneId, sort_order: t.order,
      created_by: t.createdBy, updated_at: t.updatedAt, completed_at: t.completedAt,
    })),
    subtasks: m(ws.subtasks, (x) => x.id, (x) => ({ id: x.id, task_id: x.taskId, title: x.title, done: x.done })),
    task_comments: m(ws.comments, (x) => x.id, (x) => ({ id: x.id, task_id: x.taskId, author_id: x.authorId, body: x.body })),
    meetings: m(ws.meetings, (x) => x.id, (x) => ({
      id: x.id, project_id: x.projectId, title: x.title, description: x.description, location: x.location,
      organizer_id: x.organizerId, duration_minutes: x.durationMinutes, candidate_dates: x.candidateDates,
      day_start_hour: x.dayStartHour, day_end_hour: x.dayEndHour, slot_minutes: x.slotMinutes, status: x.status,
      confirmed_start: x.confirmedStart, confirmed_end: x.confirmedEnd,
    })),
    meeting_invitees: new Map(
      ws.meetings.flatMap((mt) =>
        mt.inviteeIds.map((u) => {
          const a = ws.availability.find((x) => x.meetingId === mt.id && x.userId === u);
          return [`${mt.id}|${u}`, { meeting_id: mt.id, user_id: u, responded_at: a?.updatedAt ?? null }] as [string, Row];
        }),
      ),
    ),
    meeting_availability: new Map(availabilityRows.map((r) => [`${r.meeting_id}|${r.user_id}|${r.slot_start}`, r])),
    calendar_events: m(ws.events, (e) => e.id, (e) => ({
      id: e.id, project_id: e.projectId, title: e.title, description: e.description, starts_at: e.start, ends_at: e.end, created_by: e.createdBy,
    })),
    project_updates: m(ws.updates, (u) => u.id, (u) => ({ id: u.id, project_id: u.projectId, author_id: u.authorId, body: u.body })),
    activity_events: m(ws.activity, (a) => a.id, (a) => ({ id: a.id, project_id: a.projectId, actor_id: a.actorId, type: a.type, meta: a.meta })),
    notifications: m(ws.notifications, (x) => x.id, (x) => ({ id: x.id, user_id: x.userId, title: x.title, body: x.body, href: x.href, read: x.read })),
  };
}

const PK: Record<string, string[]> = {
  project_members: ["project_id", "user_id"],
  meeting_invitees: ["meeting_id", "user_id"],
  meeting_availability: ["meeting_id", "user_id", "slot_start"],
};

/** Insert/update order respects foreign keys; deletes run in reverse. */
const WRITE_ORDER = [
  "profiles", "projects", "project_members", "milestones", "tasks", "subtasks", "task_comments",
  "meetings", "meeting_invitees", "meeting_availability", "calendar_events", "project_updates",
  "activity_events", "notifications",
];

export class SupabaseDataSource implements DataSource {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;
  private cache: WorkspaceSnapshot | null = null;

  constructor() {
    this.client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  private fail(error: { message: string } | null, fallback: string): asserts error is null {
    if (error) throw new CommandError(error.message || fallback);
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession();
    const u = data.session?.user;
    return u ? { userId: u.id, email: u.email ?? "" } : null;
  }

  async signIn({ email, password }: SignInInput): Promise<Session> {
    if (!password) throw new CommandError("Enter your password");
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    this.fail(error, "Couldn't sign in");
    return { userId: data.user!.id, email: data.user!.email ?? email };
  }

  async signUp({ name, email, password }: SignUpInput): Promise<Session> {
    if (!password || password.length < 8) throw new CommandError("Use at least 8 characters for your password");
    const { data, error } = await this.client.auth.signUp({ email, password, options: { data: { name } } });
    this.fail(error, "Couldn't create your account");
    if (!data.session) throw new CommandError("Check your inbox to confirm your email, then log in.");
    return { userId: data.user!.id, email };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
    this.cache = null;
  }

  async load(): Promise<WorkspaceSnapshot> {
    const results = await Promise.all(TABLES.map((t) => this.client.from(t).select("*")));
    const rows = {} as Record<(typeof TABLES)[number], Row[]>;
    results.forEach((res, i) => {
      this.fail(res.error, `Couldn't load ${TABLES[i]}`);
      rows[TABLES[i]] = (res.data ?? []) as Row[];
    });
    this.cache = toSnapshot(rows);
    return this.cache;
  }

  async execute(session: Session, command: Command): Promise<CommandResult> {
    if (command.type === "member.invite") {
      const { error } = await this.client.rpc("invite_member", { p_project_id: command.projectId, p_email: command.email });
      this.fail(error, "Couldn't invite that person");
      return { ws: await this.load() };
    }
    if (command.type === "member.join") {
      const { data, error } = await this.client.rpc("join_project", { p_code: command.code });
      this.fail(error, "Couldn't join that project");
      return { ws: await this.load(), createdId: String(data) };
    }

    const before = this.cache ?? (await this.load());
    const result = applyCommand(before, session.userId, command);
    await this.persist(before, result.ws);
    this.cache = result.ws;
    return result;
  }

  private async persist(before: WorkspaceSnapshot, after: WorkspaceSnapshot) {
    const a = toRows(before);
    const b = toRows(after);
    for (const table of WRITE_ORDER) {
      const upserts: Row[] = [];
      for (const [key, row] of b[table]) {
        const prev = a[table].get(key);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(row)) upserts.push(row);
      }
      if (upserts.length) {
        const { error } = await this.client
          .from(table)
          .upsert(upserts, { onConflict: (PK[table] ?? ["id"]).join(",") });
        this.fail(error, `Couldn't save ${table}`);
      }
    }
    for (const table of [...WRITE_ORDER].reverse()) {
      const removed = [...a[table].entries()].filter(([key]) => !b[table].has(key)).map(([, row]) => row);
      for (const row of removed) {
        let q = this.client.from(table).delete();
        for (const col of PK[table] ?? ["id"]) q = q.eq(col, row[col] as string);
        const { error } = await q;
        this.fail(error, `Couldn't delete from ${table}`);
      }
    }
  }

  subscribe(_session: Session, listener: (ws: WorkspaceSnapshot) => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = this.client.channel("nova-sync-workspace");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            listener(await this.load());
          } catch {
            /* transient network errors: the next change retries */
          }
        }, 250);
      });
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void this.client.removeChannel(channel);
    };
  }
}
