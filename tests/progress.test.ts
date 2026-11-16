import { describe, expect, it } from "vitest";
import { computeProgress, isOverdue, subtaskProgress } from "@/lib/selectors/progress";
import { computeHealth } from "@/lib/selectors/health";
import type { Task } from "@/lib/types";

const now = new Date("2026-03-04T12:00:00Z");

function t(status: Task["status"], overrides: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36),
    projectId: "p",
    title: "x",
    description: "",
    status,
    priority: "medium",
    assigneeId: null,
    dueDate: null,
    milestoneId: null,
    order: 1,
    createdBy: "u",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedAt: status === "done" ? now.toISOString() : null,
    ...overrides,
  };
}

describe("computeProgress", () => {
  it("is 0% with no tasks", () => {
    expect(computeProgress([])).toMatchObject({ total: 0, done: 0, percentage: 0 });
  });
  it("counts only Done tasks as complete", () => {
    const p = computeProgress([t("done"), t("done"), t("in_review"), t("in_progress"), t("todo")]);
    expect(p).toMatchObject({ total: 5, done: 2, remaining: 3, percentage: 40 });
    expect(p.byStatus).toEqual({ todo: 1, in_progress: 1, in_review: 1, done: 2 });
  });
  it("rounds to whole percentages", () => {
    expect(computeProgress([t("done"), t("todo"), t("todo")]).percentage).toBe(33);
    expect(computeProgress([t("done"), t("done"), t("todo")]).percentage).toBe(67);
  });
  it("reaches 100% only when all tasks are done", () => {
    expect(computeProgress([t("done"), t("done")]).percentage).toBe(100);
    expect(computeProgress(Array.from({ length: 199 }, () => t("done")).concat(t("todo"))).percentage).toBe(100 - 1);
  });
});

describe("isOverdue", () => {
  it("flags open tasks past their due date", () => {
    expect(isOverdue(t("todo", { dueDate: "2026-03-03T23:59:00Z" }), now)).toBe(true);
    expect(isOverdue(t("in_review", { dueDate: "2026-03-05T23:59:00Z" }), now)).toBe(false);
  });
  it("never flags done tasks or tasks without a date", () => {
    expect(isOverdue(t("done", { dueDate: "2026-03-01T00:00:00Z" }), now)).toBe(false);
    expect(isOverdue(t("todo"), now)).toBe(false);
  });
});

describe("subtaskProgress", () => {
  it("counts done subtasks", () => {
    expect(subtaskProgress([{ done: true }, { done: false }, { done: true }])).toEqual({ done: 2, total: 3 });
  });
});

describe("computeHealth", () => {
  const project = { createdAt: "2026-02-01T00:00:00Z", deadline: "2026-03-30T23:59:00Z", status: "active" as const };
  const recent = [{ createdAt: "2026-03-04T09:00:00Z" }];

  it("is completed when every task is done", () => {
    expect(computeHealth(project, [t("done"), t("done")], recent, now).level).toBe("completed");
  });

  it("is on track for a healthy, active project", () => {
    const tasks = [t("done"), t("done"), t("done"), t("done"), t("done"), t("todo"), t("todo")];
    const h = computeHealth(project, tasks, recent, now);
    expect(h.level).toBe("on_track");
    expect(h.reasons.some((r) => r.label === "No overdue tasks")).toBe(true);
  });

  it("drops when work is overdue and the deadline is close", () => {
    const close = { ...project, deadline: "2026-03-06T23:59:00Z" };
    const tasks = [
      t("done"),
      t("todo", { dueDate: "2026-03-02T23:59:00Z" }),
      t("in_progress", { dueDate: "2026-03-03T23:59:00Z" }),
      t("todo"),
    ];
    const h = computeHealth(close, tasks, recent, now);
    expect(h.level).toBe("critical");
    expect(h.reasons.map((r) => r.label)).toContain("2 overdue tasks");
  });

  it("explains inactivity", () => {
    const h = computeHealth(project, [t("done"), t("todo")], [{ createdAt: "2026-02-20T09:00:00Z" }], now);
    expect(h.reasons.some((r) => r.label.startsWith("No team activity in"))).toBe(true);
  });
});
