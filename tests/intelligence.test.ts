import { describe, expect, it } from "vitest";
import { generateInsights } from "@/lib/intelligence/engine";
import { applyCommand } from "@/lib/data/commands";
import { createDemoWorkspace, DEMO_USER_ID } from "@/lib/data/seed";
import { matchMeeting } from "@/lib/scheduling/matcher";
import { busyFor } from "@/lib/selectors/workspace";

const now = new Date();

describe("Sync Intelligence on the demo workspace", () => {
  const ws = createDemoWorkspace(now);
  const insights = generateInsights(ws, DEMO_USER_ID, now);
  const byId = (prefix: string) => insights.filter((i) => i.id.startsWith(prefix));

  it("flags the Marketing deadline with the real number of open tasks", () => {
    const d = byId("deadline:p_mkt")[0];
    expect(d).toBeDefined();
    expect(d.severity).toBe("critical");
    expect(d.title).toContain("in 3 days");
    expect(d.title).toContain("4 tasks are still incomplete");
  });

  it("detects the two overdue high-priority tasks", () => {
    const o = byId("overdue:p_mkt")[0];
    expect(o.title).toBe("Two high-priority tasks are overdue in Marketing Strategy — Group 04.");
    expect(o.action.href).toContain("filter=overdue");
  });

  it("notices uneven workload without ranking people", () => {
    const w = byId("workload:p_ba")[0];
    expect(w.title).toContain("Tiago");
    expect(w.context).toContain("3 of 4");
  });

  it("celebrates 75% progress on Business Analytics", () => {
    expect(byId("progress:p_ba")[0].title).toBe("Your group has completed 75% of the Business Analytics — Final Project project.");
  });

  it("detects the stalled Entrepreneurship project", () => {
    expect(byId("stalled:p_ent")[0].title).toMatch(/hasn't moved in \d+ days/);
  });

  it("asks Alex to respond to the open poll, then recommends the best slot", () => {
    expect(byId("respond:m_ent_workshop")[0]).toBeDefined();
    const m = ws.meetings.find((x) => x.id === "m_ent_workshop")!;
    const wed = m.candidateDates.find((d) => new Date(`${d}T12:00`).getDay() === 3)!;
    const { ws: next } = applyCommand(ws, DEMO_USER_ID, {
      type: "meeting.availability",
      meetingId: m.id,
      userId: DEMO_USER_ID,
      slots: [`${wed}T15:00`, `${wed}T15:30`, `${wed}T16:00`, `${wed}T16:30`],
    });
    const after = generateInsights(next, DEMO_USER_ID, now);
    const s = after.find((i) => i.id === "schedule:m_ent_workshop")!;
    expect(s.title).toMatch(/^Wednesday at 15:00 is the best meeting time/);
    expect(s.context).toContain("4/4 members available (100%)");
  });

  it("seeded poll overlaps on Wednesday 15:00 for the three responders", () => {
    const m = ws.meetings.find((x) => x.id === "m_ent_workshop")!;
    const availability = Object.fromEntries(ws.availability.filter((a) => a.meetingId === m.id).map((a) => [a.userId, a.slots]));
    const r = matchMeeting({
      ...m,
      participants: m.inviteeIds.map((id) => ({ id, busy: busyFor(ws, id, m.id) })),
      availability,
    });
    expect(new Date(r.best!.start).getDay()).toBe(3);
    expect(new Date(r.best!.start).getHours()).toBe(15);
    expect(r.best!.availableCount).toBe(3);
    expect(r.pendingIds).toEqual([DEMO_USER_ID]);
  });

  it("reminds Alex about personal tasks due in the next 48 hours", () => {
    expect(byId("personal:")[0].title).toBe("You have 2 tasks due in the next 48 hours.");
  });

  it("orders insights by severity", () => {
    const rank = { critical: 4, high: 3, medium: 2, low: 1, positive: 0 };
    for (let i = 1; i < insights.length; i++)
      expect(rank[insights[i - 1].severity]).toBeGreaterThanOrEqual(rank[insights[i].severity]);
  });

  it("is deterministic", () => {
    expect(generateInsights(ws, DEMO_USER_ID, now)).toEqual(insights);
  });
});
