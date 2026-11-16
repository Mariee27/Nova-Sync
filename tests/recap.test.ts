import { describe, expect, it } from "vitest";
import { createDemoWorkspace, DEMO_USER_ID } from "@/lib/data/seed";
import { weeklyRecap } from "@/lib/selectors/recap";
import { applyCommand } from "@/lib/data/commands";

const now = new Date("2026-11-18T12:00:00");

describe("weeklyRecap", () => {
  const ws = createDemoWorkspace(now);

  it("only counts tasks completed in the last 7 days", () => {
    const r = weeklyRecap(ws, DEMO_USER_ID, now);
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    expect(r.completed.length).toBeGreaterThan(0);
    for (const t of r.completed) {
      expect(t.status).toBe("done");
      expect(new Date(t.completedAt!).getTime()).toBeGreaterThanOrEqual(weekAgo.getTime() - 86_400_000);
    }
  });

  it("reports progress growth per project that matches completions", () => {
    const r = weeklyRecap(ws, DEMO_USER_ID, now);
    for (const p of r.projects) {
      expect(p.endPct).toBeGreaterThanOrEqual(p.startPct);
      if (p.completed.length === 0) expect(p.endPct).toBe(p.startPct);
    }
  });

  it("updates when a task is completed", () => {
    const before = weeklyRecap(ws, DEMO_USER_ID, now);
    const open = ws.tasks.find((t) => t.projectId === "p_mkt" && t.status !== "done")!;
    const { ws: next } = applyCommand(ws, DEMO_USER_ID, { type: "task.update", id: open.id, patch: { status: "done" } }, now);
    const after = weeklyRecap(next, DEMO_USER_ID, now);
    expect(after.completed.length).toBe(before.completed.length + 1);
    expect(after.projects.find((p) => p.projectId === "p_mkt")!.endPct).toBeGreaterThan(before.projects.find((p) => p.projectId === "p_mkt")!.endPct);
  });
});
