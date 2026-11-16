import { describe, expect, it } from "vitest";
import { cellsForDay, matchMeeting, type MatchInput } from "@/lib/scheduling/matcher";

/** Build cell keys for `date` between two decimal hours, e.g. range("2026-03-04", 15, 17). */
function range(date: string, from: number, to: number, step = 0.5) {
  const out: string[] = [];
  for (let h = from; h < to; h += step) {
    const hh = String(Math.floor(h)).padStart(2, "0");
    const mm = h % 1 ? "30" : "00";
    out.push(`${date}T${hh}:${mm}`);
  }
  return out;
}

const MON = "2026-03-02";
const TUE = "2026-03-03";
const WED = "2026-03-04";

const base: Omit<MatchInput, "participants" | "availability"> = {
  candidateDates: [MON, TUE, WED],
  dayStartHour: 9,
  dayEndHour: 19,
  slotMinutes: 30,
  durationMinutes: 60,
};

const team = ["a", "b", "c", "d"].map((id) => ({ id, workStartHour: 9, workEndHour: 19 }));

describe("cellsForDay", () => {
  it("generates one cell per slot inside the window", () => {
    const cells = cellsForDay(WED, 9, 12, 30);
    expect(cells).toEqual([
      `${WED}T09:00`, `${WED}T09:30`, `${WED}T10:00`, `${WED}T10:30`, `${WED}T11:00`, `${WED}T11:30`,
    ]);
  });
});

describe("matchMeeting", () => {
  it("finds the slot where everyone overlaps (4/4, 100%)", () => {
    const r = matchMeeting({
      ...base,
      participants: team,
      availability: {
        a: [...range(MON, 10, 12), ...range(WED, 13, 17)],
        b: [...range(TUE, 14, 18), ...range(WED, 14.5, 18)],
        c: [...range(WED, 15, 17)],
        d: [...range(WED, 15, 16), ...range(MON, 9, 11)],
      },
    });
    expect(r.best).not.toBeNull();
    expect(r.best!.startKey).toBe(`${WED}T15:00`);
    expect(r.best!.availableCount).toBe(4);
    expect(r.best!.teamPercentage).toBe(100);
    expect(r.best!.unavailableIds).toEqual([]);
  });

  it("requires the whole duration to be free, not just the start cell", () => {
    const r = matchMeeting({
      ...base,
      durationMinutes: 90,
      participants: team.slice(0, 2),
      availability: {
        a: range(WED, 15, 16), // only 60 minutes
        b: range(WED, 15, 17),
      },
    });
    // 'a' can never make a 90-minute meeting; best must be a slot only 'b' can attend
    expect(r.best!.availableIds).toEqual(["b"]);
    expect(r.ranked.every((s) => !s.availableIds.includes("a"))).toBe(true);
    // 'a' covers part of the slot → counted as partial
    const at15 = r.ranked.find((s) => s.startKey === `${WED}T15:00`)!;
    expect(at15.partialIds).toContain("a");
  });

  it("maximises participation even when nobody is free for everyone", () => {
    const r = matchMeeting({
      ...base,
      participants: team,
      availability: {
        a: range(MON, 10, 11),
        b: range(MON, 10, 11),
        c: range(TUE, 16, 17),
        d: range(MON, 10, 11),
      },
    });
    expect(r.best!.startKey).toBe(`${MON}T10:00`);
    expect(r.best!.availableCount).toBe(3);
    expect(r.best!.teamPercentage).toBe(75);
    expect(r.best!.unavailableIds).toEqual(["c"]);
  });

  it("treats non-responders as pending, not unavailable", () => {
    const r = matchMeeting({
      ...base,
      participants: team,
      availability: { a: range(WED, 15, 16), b: range(WED, 15, 16) },
    });
    expect(r.pendingIds).toEqual(["c", "d"]);
    expect(r.best!.availableCount).toBe(2);
    expect(r.best!.responsePercentage).toBe(100);
    expect(r.best!.teamPercentage).toBe(50);
  });

  it("returns no best slot when nobody has responded", () => {
    const r = matchMeeting({ ...base, participants: team, availability: {} });
    expect(r.best).toBeNull();
    expect(r.alternatives).toEqual([]);
    expect(r.feasible).toBe(true);
  });

  it("returns no best slot when responses never overlap with anyone", () => {
    const r = matchMeeting({ ...base, participants: team.slice(0, 1), availability: { a: [] } });
    expect(r.best).toBeNull();
  });

  it("counts existing confirmed meetings as conflicts", () => {
    const r = matchMeeting({
      ...base,
      candidateDates: [WED],
      participants: [
        { id: "a" },
        { id: "b", busy: [{ start: new Date(`${WED}T15:00`).toISOString(), end: new Date(`${WED}T16:00`).toISOString(), label: "Other class" }] },
      ],
      availability: { a: range(WED, 15, 17), b: range(WED, 15, 17) },
    });
    const at15 = r.ranked.find((s) => s.startKey === `${WED}T15:00`)!;
    expect(at15.conflicts).toEqual([{ userId: "b", label: "Other class" }]);
    expect(at15.availableCount).toBe(1);
    // the best slot avoids the conflict
    expect(r.best!.startKey).toBe(`${WED}T16:00`);
    expect(r.best!.availableCount).toBe(2);
  });

  it("prefers slots inside members' preferred working hours on ties", () => {
    const r = matchMeeting({
      ...base,
      candidateDates: [WED],
      dayStartHour: 8,
      dayEndHour: 22,
      participants: [
        { id: "a", workStartHour: 18, workEndHour: 22 },
        { id: "b", workStartHour: 18, workEndHour: 22 },
      ],
      availability: { a: [...range(WED, 9, 10), ...range(WED, 19, 20)], b: [...range(WED, 9, 10), ...range(WED, 19, 20)] },
    });
    expect(r.best!.startKey).toBe(`${WED}T19:00`);
    expect(r.best!.preferredFit).toBe(1);
  });

  it("breaks remaining ties by earliest start", () => {
    const r = matchMeeting({
      ...base,
      participants: team.slice(0, 2),
      availability: { a: [...range(MON, 10, 11), ...range(TUE, 10, 11)], b: [...range(MON, 10, 11), ...range(TUE, 10, 11)] },
    });
    expect(r.best!.startKey).toBe(`${MON}T10:00`);
    expect(r.alternatives[0].startKey).toBe(`${TUE}T10:00`);
  });

  it("offers non-overlapping alternatives", () => {
    const r = matchMeeting({
      ...base,
      participants: team.slice(0, 2),
      availability: { a: range(WED, 9, 19), b: range(WED, 9, 19) },
    });
    const all = [r.best!, ...r.alternatives];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const overlap = all[i].start < all[j].end && all[j].start < all[i].end;
        expect(overlap).toBe(false);
      }
    expect(r.alternatives.length).toBe(3);
  });

  it("never proposes slots that run past the daily window", () => {
    const r = matchMeeting({
      ...base,
      candidateDates: [WED],
      durationMinutes: 120,
      participants: team.slice(0, 1),
      availability: { a: range(WED, 9, 19) },
    });
    const last = r.ranked.map((s) => s.startKey).sort().at(-1);
    expect(last).toBe(`${WED}T17:00`);
  });

  it("handles durations that are not a multiple of the slot size", () => {
    const r = matchMeeting({
      ...base,
      candidateDates: [WED],
      durationMinutes: 45,
      participants: team.slice(0, 1),
      availability: { a: range(WED, 10, 11) },
    });
    // 45 min needs 2 half-hour cells → only 10:00 fits within 10–11
    expect(r.best!.startKey).toBe(`${WED}T10:00`);
    const end = new Date(r.best!.end);
    expect(end.getHours() * 60 + end.getMinutes()).toBe(10 * 60 + 45);
  });

  it("computes a heatmap of how many people marked each cell", () => {
    const r = matchMeeting({
      ...base,
      participants: team.slice(0, 2),
      availability: { a: range(WED, 15, 16), b: range(WED, 15.5, 16) },
    });
    expect(r.heat[`${WED}T15:00`]).toBe(1);
    expect(r.heat[`${WED}T15:30`]).toBe(2);
  });

  it("rejects invalid configurations safely", () => {
    const r = matchMeeting({ ...base, dayStartHour: 18, dayEndHour: 9, participants: team, availability: { a: [] } });
    expect(r.feasible).toBe(false);
    expect(r.best).toBeNull();
  });
});
