import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, fold } from "@/lib/ics";

describe("buildIcs", () => {
  const ics = buildIcs(
    {
      uid: "m1@novasync.app",
      title: "Pitch strategy workshop",
      description: "Agenda: interviews, storyline; owners",
      location: "NOVA SBE, Startup Lab",
      start: "2026-03-04T15:00:00.000Z",
      end: "2026-03-04T16:00:00.000Z",
      organizer: { name: "Beatriz Rocha", email: "beatriz@example.com" },
      attendees: [{ name: "Alex Costa", email: "alex@example.com" }],
    },
    new Date("2026-03-01T10:00:00.000Z"),
  );

  it("produces a valid VCALENDAR envelope with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.split("\r\n").every((l) => !l.includes("\n"))).toBe(true);
  });

  it("writes UTC timestamps", () => {
    expect(ics).toContain("DTSTART:20260304T150000Z");
    expect(ics).toContain("DTEND:20260304T160000Z");
    expect(ics).toContain("DTSTAMP:20260301T100000Z");
  });

  it("escapes special characters", () => {
    expect(ics).toContain("LOCATION:NOVA SBE\\, Startup Lab");
    expect(ics).toContain("DESCRIPTION:Agenda: interviews\\, storyline\; owners");
    expect(escapeText("a\nb")).toBe("a\\nb");
  });

  it("includes organizer and attendees", () => {
    expect(ics).toContain("ORGANIZER;CN=Beatriz Rocha:mailto:beatriz@example.com");
    expect(ics).toContain("ATTENDEE;CN=Alex Costa");
  });
});

describe("fold", () => {
  it("folds long lines at 75 octets", () => {
    const line = "DESCRIPTION:" + "x".repeat(200);
    const folded = fold(line).split("\r\n");
    expect(folded[0].length).toBe(75);
    expect(folded.slice(1).every((l) => l.startsWith(" ") && l.length <= 75)).toBe(true);
    expect(folded.map((l, i) => (i === 0 ? l : l.slice(1))).join("")).toBe(line);
  });
});
