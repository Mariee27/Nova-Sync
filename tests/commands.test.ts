import { describe, expect, it } from "vitest";
import { applyCommand, CommandError } from "@/lib/data/commands";
import { createDemoWorkspace, DEMO_USER_ID } from "@/lib/data/seed";
import { computeProgress } from "@/lib/selectors/progress";

const now = new Date();
const ws0 = () => createDemoWorkspace(now);
const progressOf = (ws: ReturnType<typeof ws0>, id: string) =>
  computeProgress(ws.tasks.filter((t) => t.projectId === id));

describe("task commands", () => {
  it("moving a task to Done updates progress and the activity feed", () => {
    const ws = ws0();
    const before = progressOf(ws, "p_mkt");
    const { ws: next } = applyCommand(ws, DEMO_USER_ID, { type: "task.move", id: "t_mkt_11", status: "done", index: 0 });
    const after = progressOf(next, "p_mkt");
    expect(after.done).toBe(before.done + 1);
    expect(after.percentage).toBeGreaterThan(before.percentage);
    expect(next.activity[0]).toMatchObject({ type: "task_completed", actorId: DEMO_USER_ID, meta: { taskId: "t_mkt_11" } });
    expect(next.tasks.find((t) => t.id === "t_mkt_11")!.completedAt).not.toBeNull();
  });

  it("does not mutate the previous snapshot", () => {
    const ws = ws0();
    const json = JSON.stringify(ws);
    applyCommand(ws, DEMO_USER_ID, { type: "task.move", id: "t_mkt_11", status: "done", index: 0 });
    expect(JSON.stringify(ws)).toBe(json);
  });

  it("re-orders a column without gaps", () => {
    const { ws } = applyCommand(ws0(), DEMO_USER_ID, { type: "task.move", id: "t_mkt_12", status: "in_progress", index: 0 });
    const col = ws.tasks.filter((t) => t.projectId === "p_mkt" && t.status === "in_progress").sort((a, b) => a.order - b.order);
    expect(col[0].id).toBe("t_mkt_12");
    expect(col.map((t) => t.order)).toEqual(col.map((_, i) => i + 1));
  });

  it("reports when a project reaches 100%", () => {
    let ws = ws0();
    const open = ws.tasks.filter((t) => t.projectId === "p_mkt" && t.status !== "done");
    let completed: string | undefined;
    for (const t of open) {
      const r = applyCommand(ws, DEMO_USER_ID, { type: "task.move", id: t.id, status: "done", index: 0 });
      ws = r.ws;
      completed = r.completedProjectId ?? completed;
    }
    expect(completed).toBe("p_mkt");
    expect(progressOf(ws, "p_mkt").percentage).toBe(100);
    expect(ws.activity[0].type).toBe("project_completed");
  });

  it("rejects writes to projects the actor is not a member of", () => {
    // Alex is not a member of a project created by someone else only
    const { ws } = applyCommand(ws0(), "u_tiago", {
      type: "project.create",
      input: { name: "Secret project", description: "", course: "Thesis", courseCode: "", deadline: now.toISOString(), color: "#2563EB", emoji: "🔒" },
    });
    const secret = ws.projects.find((p) => p.name === "Secret project")!;
    expect(() =>
      applyCommand(ws, DEMO_USER_ID, { type: "task.create", projectId: secret.id, input: { title: "Snoop", description: "", status: "todo", priority: "low", assigneeId: null, dueDate: null, milestoneId: null } }),
    ).toThrow(CommandError);
  });

  it("validates task input", () => {
    expect(() =>
      applyCommand(ws0(), DEMO_USER_ID, { type: "task.create", projectId: "p_mkt", input: { title: " ", description: "", status: "todo", priority: "low", assigneeId: null, dueDate: null, milestoneId: null } }),
    ).toThrow(/title/);
  });

  it("assigning notifies the assignee", () => {
    const { ws } = applyCommand(ws0(), DEMO_USER_ID, { type: "task.update", id: "t_mkt_12", patch: { assigneeId: "u_sarah" } });
    expect(ws.notifications[0]).toMatchObject({ userId: "u_sarah", read: false });
    expect(ws.tasks.find((t) => t.id === "t_mkt_12")!.assigneeId).toBe("u_sarah");
  });

  it("partial updates keep untouched fields", () => {
    const { ws } = applyCommand(ws0(), DEMO_USER_ID, { type: "task.update", id: "t_mkt_12", patch: { priority: "urgent" } });
    const t = ws.tasks.find((t) => t.id === "t_mkt_12")!;
    expect(t.priority).toBe("urgent");
    expect(t.description).toContain("15-minute pitch");
    expect(t.status).toBe("todo");
  });
});

describe("meeting commands", () => {
  it("records availability and confirms a meeting into the calendar", () => {
    const ws = ws0();
    const m = ws.meetings.find((x) => x.id === "m_ent_workshop")!;
    const day = m.candidateDates[0];
    const r1 = applyCommand(ws, DEMO_USER_ID, { type: "meeting.availability", meetingId: m.id, userId: DEMO_USER_ID, slots: [`${day}T10:00`, `${day}T10:30`, "1999-01-01T10:00"] });
    const mine = r1.ws.availability.find((a) => a.meetingId === m.id && a.userId === DEMO_USER_ID)!;
    expect(mine.slots).toEqual([`${day}T10:00`, `${day}T10:30`]); // out-of-poll cells are dropped
    const start = new Date(`${day}T10:00`).toISOString();
    const end = new Date(`${day}T11:00`).toISOString();
    const r2 = applyCommand(r1.ws, DEMO_USER_ID, { type: "meeting.confirm", meetingId: m.id, start, end });
    const confirmed = r2.ws.meetings.find((x) => x.id === m.id)!;
    expect(confirmed).toMatchObject({ status: "confirmed", confirmedStart: start, confirmedEnd: end });
    expect(r2.ws.activity[0].type).toBe("meeting_confirmed");
  });

  it("refuses availability for people who were not invited", () => {
    expect(() =>
      applyCommand(ws0(), DEMO_USER_ID, { type: "meeting.availability", meetingId: "m_ent_workshop", userId: "u_tiago", slots: [] }),
    ).toThrow(/invited/);
  });
});

describe("membership", () => {
  it("joins a project with an invite code", () => {
    const { ws } = applyCommand(ws0(), "u_tiago", { type: "member.join", code: "mkt-g04x" });
    expect(ws.members.some((m) => m.projectId === "p_mkt" && m.userId === "u_tiago")).toBe(true);
  });
});
