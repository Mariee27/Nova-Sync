/**
 * Rejected actions and edge cases for the command reducer.
 *
 * Every write in NOVA SYNC (demo and Supabase mode) goes through
 * applyCommand, so these tests document what the app refuses to do and
 * that a refused command leaves the workspace untouched.
 */
import { describe, expect, it } from "vitest";
import { applyCommand, CommandError, type Command, type TaskInput } from "@/lib/data/commands";
import { createDemoWorkspace, DEMO_USER_ID } from "@/lib/data/seed";
import type { WorkspaceSnapshot } from "@/lib/types";

const now = new Date("2026-11-18T12:00:00");
const ws0 = () => createDemoWorkspace(now);
const task = (over: Partial<TaskInput> = {}): TaskInput => ({
  title: "Write the conclusion",
  description: "",
  status: "todo",
  priority: "medium",
  assigneeId: null,
  dueDate: null,
  milestoneId: null,
  ...over,
});

/** Asserts the command is refused with a matching message and changes nothing. */
function rejects(ws: WorkspaceSnapshot, actor: string, cmd: Command, message: RegExp) {
  const before = JSON.stringify(ws);
  let error: unknown;
  try {
    applyCommand(ws, actor, cmd, now);
  } catch (e) {
    error = e;
  }
  expect(error, `expected "${cmd.type}" to be refused`).toBeInstanceOf(CommandError);
  expect((error as Error).message).toMatch(message);
  expect(JSON.stringify(ws)).toBe(before);
}

describe("access control", () => {
  // Alex is a plain member of Business Analytics (owner: Tiago) and not in any project with outsiders.
  it("refuses unknown actors", () => {
    rejects(ws0(), "u_nobody", { type: "task.create", projectId: "p_mkt", input: task() }, /profile not found/i);
  });

  it("refuses edits to tasks in projects you are not in", () => {
    // Tiago is not a member of Marketing Strategy.
    const ws = ws0();
    rejects(ws, "u_tiago", { type: "task.update", id: "t_mkt_11", patch: { title: "Hijacked" } }, /not a member/);
    rejects(ws, "u_tiago", { type: "task.move", id: "t_mkt_11", status: "done", index: 0 }, /not a member/);
    rejects(ws, "u_tiago", { type: "task.delete", id: "t_mkt_11" }, /not a member/);
    rejects(ws, "u_tiago", { type: "comment.add", taskId: "t_mkt_11", body: "hi" }, /not a member/);
    rejects(ws, "u_tiago", { type: "subtask.add", taskId: "t_mkt_11", title: "Sneaky" }, /not a member/);
    rejects(ws, "u_tiago", { type: "update.post", projectId: "p_mkt", body: "Hello" }, /not a member/);
    rejects(ws, "u_tiago", { type: "milestone.create", projectId: "p_mkt", title: "Fake", dueDate: now.toISOString() }, /not a member/);
  });

  it("only lets the owner edit, delete or remove members of a project", () => {
    const ws = ws0();
    rejects(ws, DEMO_USER_ID, { type: "project.delete", id: "p_ba" }, /owner/);
    rejects(ws, DEMO_USER_ID, { type: "member.remove", projectId: "p_ba", userId: "u_lucas" }, /owner/);
  });

  it("does not let an owner remove themselves", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "member.remove", projectId: "p_mkt", userId: DEMO_USER_ID }, /themselves/);
  });

  it("only assigns tasks to project members", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "task.create", projectId: "p_mkt", input: task({ assigneeId: "u_tiago" }) }, /member/);
    rejects(ws0(), DEMO_USER_ID, { type: "task.update", id: "t_mkt_12", patch: { assigneeId: "u_tiago" } }, /member/);
  });

  it("only lets you share your own availability in a real workspace", () => {
    rejects(
      ws0(),
      DEMO_USER_ID,
      { type: "meeting.availability", meetingId: "m_ent_workshop", userId: "u_maria", slots: [] },
      /your own availability/,
    );
  });

  it("allows proxy answers only when the demo explicitly turns them on", () => {
    const ws = ws0();
    const m = ws.meetings.find((x) => x.id === "m_ent_workshop")!;
    const { ws: next } = applyCommand(
      ws,
      DEMO_USER_ID,
      { type: "meeting.availability", meetingId: m.id, userId: "u_maria", slots: [`${m.candidateDates[0]}T10:00`] },
      now,
      { allowProxyAvailability: true },
    );
    expect(next.availability.find((a) => a.meetingId === m.id && a.userId === "u_maria")?.slots).toEqual([`${m.candidateDates[0]}T10:00`]);
  });

  it("only lets the organiser or owner cancel a meeting", () => {
    // Beatriz organises the workshop and owns the project; Alex is neither.
    rejects(ws0(), DEMO_USER_ID, { type: "meeting.cancel", meetingId: "m_ent_workshop" }, /owner/);
  });

  it("does not let you edit someone else's personal event", () => {
    const { ws, createdId } = applyCommand(ws0(), "u_tiago", {
      type: "event.create",
      input: { title: "Dentist", description: "", projectId: null, start: "2026-11-20T09:00:00Z", end: "2026-11-20T10:00:00Z" },
    }, now);
    rejects(ws, DEMO_USER_ID, { type: "event.update", id: createdId!, input: { title: "Mine now", description: "", projectId: null, start: "2026-11-20T09:00:00Z", end: "2026-11-20T10:00:00Z" } }, /can't edit/);
    rejects(ws, DEMO_USER_ID, { type: "event.delete", id: createdId! }, /can't delete/);
  });

  it("never marks another person's notifications as read", () => {
    const ws = ws0();
    const theirs = ws.notifications.find((n) => n.userId !== DEMO_USER_ID);
    const target = theirs ?? { id: "n_other" };
    const { ws: next } = applyCommand(ws, DEMO_USER_ID, { type: "notification.read", id: target.id }, now);
    if (theirs) expect(next.notifications.find((n) => n.id === theirs.id)!.read).toBe(theirs.read);
    const { ws: all } = applyCommand(ws, DEMO_USER_ID, { type: "notification.readAll" }, now);
    for (const n of all.notifications.filter((x) => x.userId !== DEMO_USER_ID)) {
      expect(n.read).toBe(ws.notifications.find((x) => x.id === n.id)!.read);
    }
  });
});

describe("input validation", () => {
  it("rejects tasks with a missing or too long title", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "task.create", projectId: "p_mkt", input: task({ title: " " }) }, /title/);
    rejects(ws0(), DEMO_USER_ID, { type: "task.create", projectId: "p_mkt", input: task({ title: "x".repeat(141) }) }, /.+/);
  });

  it("rejects unknown task statuses and positions", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "task.move", id: "t_mkt_12", status: "archived" as never, index: 0 }, /status/);
    rejects(ws0(), DEMO_USER_ID, { type: "task.move", id: "t_mkt_12", status: "todo", index: Number.NaN }, /position/);
  });

  it("clamps out-of-range positions instead of corrupting the board", () => {
    const { ws } = applyCommand(ws0(), DEMO_USER_ID, { type: "task.move", id: "t_mkt_12", status: "in_progress", index: 999 }, now);
    const col = ws.tasks.filter((t) => t.projectId === "p_mkt" && t.status === "in_progress").sort((a, b) => a.order - b.order);
    expect(col.at(-1)!.id).toBe("t_mkt_12");
    expect(col.map((t) => t.order)).toEqual(col.map((_, i) => i + 1));
  });

  it("rejects empty and oversized comments and updates", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "comment.add", taskId: "t_mkt_11", body: "   " }, /Write something/);
    rejects(ws0(), DEMO_USER_ID, { type: "comment.add", taskId: "t_mkt_11", body: "x".repeat(2001) }, /2000/);
    rejects(ws0(), DEMO_USER_ID, { type: "update.post", projectId: "p_mkt", body: "" }, /Write an update/);
    rejects(ws0(), DEMO_USER_ID, { type: "update.post", projectId: "p_mkt", body: "x".repeat(1001) }, /1000/);
  });

  it("rejects invalid projects", () => {
    const base = { description: "", courseCode: "", deadline: now.toISOString(), color: "#2563EB", emoji: "🚀" };
    rejects(ws0(), DEMO_USER_ID, { type: "project.create", input: { ...base, name: "AB", course: "Finance" } }, /.+/);
    rejects(ws0(), DEMO_USER_ID, { type: "project.create", input: { ...base, name: "Valid name", course: "F" } }, /.+/);
    rejects(ws0(), DEMO_USER_ID, { type: "project.create", input: { ...base, name: "Valid name", course: "Finance", color: "red" } }, /.+/);
  });

  it("rejects invalid invites and invite codes", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "member.invite", projectId: "p_mkt", name: "Ana", email: "not-an-email" }, /valid email/);
    rejects(ws0(), DEMO_USER_ID, { type: "member.invite", projectId: "p_mkt", name: "A", email: "ana@novasbe.pt" }, /name/);
    rejects(ws0(), DEMO_USER_ID, { type: "member.invite", projectId: "p_mkt", name: "Maria", email: "maria.santos@demo.novasync.app" }, /already on this project/);
    rejects(ws0(), "u_tiago", { type: "member.join", code: "NOPE-0000" }, /No project found/);
    rejects(ws0(), DEMO_USER_ID, { type: "member.join", code: "MKT-G04X" }, /already in/);
  });

  it("accepts invite codes regardless of case and surrounding spaces", () => {
    const { ws } = applyCommand(ws0(), "u_tiago", { type: "member.join", code: "  ent-mesa " }, now);
    expect(ws.members.some((m) => m.projectId === "p_ent" && m.userId === "u_tiago")).toBe(true);
  });

  it("rejects events that end before they start", () => {
    rejects(
      ws0(),
      DEMO_USER_ID,
      { type: "event.create", input: { title: "Study", description: "", projectId: null, start: "2026-11-20T10:00:00Z", end: "2026-11-20T09:00:00Z" } },
      /End must be after start/,
    );
  });

  it("rejects working hours that end before they start", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "profile.update", input: { workStartHour: 18, workEndHour: 9 } }, /Working hours/);
  });

  it("rejects a profile name that is too short", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "profile.update", input: { name: "A" } }, /name/);
  });
});

describe("meeting polls", () => {
  const base = {
    projectId: "p_mkt",
    title: "Final check-in",
    description: "",
    location: "",
    durationMinutes: 60,
    candidateDates: ["2026-11-20"],
    dayStartHour: 9,
    dayEndHour: 18,
    slotMinutes: 30 as const,
    inviteeIds: [DEMO_USER_ID, "u_maria"],
  };

  it("rejects polls without days, invitees or a valid window", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "meeting.create", input: { ...base, candidateDates: [] } }, /at least one day/);
    rejects(ws0(), DEMO_USER_ID, { type: "meeting.create", input: { ...base, inviteeIds: [DEMO_USER_ID] } }, /at least one teammate/);
    rejects(ws0(), DEMO_USER_ID, { type: "meeting.create", input: { ...base, dayStartHour: 18, dayEndHour: 9 } }, /End hour/);
    rejects(ws0(), DEMO_USER_ID, { type: "meeting.create", input: { ...base, dayStartHour: 9, dayEndHour: 10, durationMinutes: 90 } }, /shorter than the meeting/);
  });

  it("drops availability outside the poll's days, window or grid", () => {
    const ws = ws0();
    const m = ws.meetings.find((x) => x.id === "m_ent_workshop")!;
    const d = m.candidateDates[0];
    const slots = [`${d}T10:00`, `${d}T10:15`, `${d}T07:00`, `${d}T19:00`, "1999-01-01T10:00", "garbage", `${d}T10:00`];
    const { ws: next } = applyCommand(ws, DEMO_USER_ID, { type: "meeting.availability", meetingId: m.id, userId: DEMO_USER_ID, slots }, now);
    expect(next.availability.find((a) => a.meetingId === m.id && a.userId === DEMO_USER_ID)!.slots).toEqual([`${d}T10:00`]);
  });

  it("refuses to confirm slots that are not real options", () => {
    const ws = ws0();
    const m = ws.meetings.find((x) => x.id === "m_ent_workshop")!;
    const d = m.candidateDates[0];
    const iso = (t: string) => new Date(`${d}T${t}`).toISOString();
    const confirm = (start: string, end: string): Command => ({ type: "meeting.confirm", meetingId: m.id, start, end });
    rejects(ws, DEMO_USER_ID, confirm(iso("11:00"), iso("10:00")), /Invalid time slot/);
    rejects(ws, DEMO_USER_ID, confirm("not-a-date", iso("10:00")), /Invalid time slot/);
    rejects(ws, DEMO_USER_ID, confirm(iso("10:00"), iso("12:00")), /meeting length/);
    rejects(ws, DEMO_USER_ID, confirm(iso("06:00"), iso("07:00")), /poll's options/);
    rejects(ws, DEMO_USER_ID, confirm(iso("18:30"), iso("19:30")), /poll's options/);
    rejects(ws, DEMO_USER_ID, confirm(iso("10:10"), iso("11:10")), /poll's options/);
  });

  it("refuses to change a poll after it is confirmed or cancelled", () => {
    const ws = ws0();
    const m = ws.meetings.find((x) => x.id === "m_ent_workshop")!;
    const d = m.candidateDates[0];
    const start = new Date(`${d}T10:00`).toISOString();
    const end = new Date(`${d}T11:00`).toISOString();
    const { ws: confirmed } = applyCommand(ws, DEMO_USER_ID, { type: "meeting.confirm", meetingId: m.id, start, end }, now);
    rejects(confirmed, DEMO_USER_ID, { type: "meeting.availability", meetingId: m.id, userId: DEMO_USER_ID, slots: [] }, /closed/);
    rejects(confirmed, DEMO_USER_ID, { type: "meeting.confirm", meetingId: m.id, start, end }, /open poll/);
    const { ws: cancelled } = applyCommand(ws, "u_beatriz", { type: "meeting.cancel", meetingId: m.id }, now);
    rejects(cancelled, DEMO_USER_ID, { type: "meeting.confirm", meetingId: m.id, start, end }, /open poll/);
  });
});

describe("missing records", () => {
  it("explains when the target no longer exists", () => {
    rejects(ws0(), DEMO_USER_ID, { type: "task.update", id: "t_missing", patch: { title: "Ghost" } }, /not found/);
    rejects(ws0(), DEMO_USER_ID, { type: "subtask.toggle", id: "s_missing" }, /not found/);
    rejects(ws0(), DEMO_USER_ID, { type: "meeting.confirm", meetingId: "m_missing", start: now.toISOString(), end: now.toISOString() }, /not found/);
  });
});
