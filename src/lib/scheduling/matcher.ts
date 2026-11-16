/**
 * Smart meeting matcher.
 *
 * Given a meeting poll (candidate days, a daily window, grid granularity and a
 * meeting duration) plus each participant's marked availability, this module
 * enumerates every feasible start time, scores it and returns a ranked list.
 *
 * Ranking criteria, in order of weight:
 *   1. Maximum participation — how many invitees are free for the whole slot.
 *   2. Minimal conflicts — participants who are free in the grid but already
 *      have a confirmed meeting at that time are counted as conflicts.
 *   3. Partial coverage — among people who are not fully free, slots that
 *      overlap more of their availability rank higher (easier to negotiate).
 *   4. Preferred working hours — slots inside members' preferred hours win.
 *   5. Earliest start breaks remaining ties.
 *
 * Everything is pure and deterministic so it can be unit-tested.
 */
import { addMinutes } from "date-fns";
import { cellKey, parseLocalKey } from "@/lib/dates";

export interface MatchParticipant {
  id: string;
  workStartHour?: number;
  workEndHour?: number;
  /** Already-confirmed commitments (ISO strings). */
  busy?: { start: string; end: string; label: string }[];
}

export interface MatchInput {
  candidateDates: string[];
  dayStartHour: number;
  dayEndHour: number;
  slotMinutes: number;
  durationMinutes: number;
  participants: MatchParticipant[];
  /** userId → marked cell keys. Missing entry = has not responded yet. */
  availability: Record<string, string[] | undefined>;
}

export interface SlotConflict {
  userId: string;
  label: string;
}

export interface SlotSuggestion {
  /** Local cell key of the start, e.g. `2026-11-18T15:00`. */
  startKey: string;
  start: string;
  end: string;
  availableIds: string[];
  /** Responded, but not free for the entire slot. */
  unavailableIds: string[];
  /** Subset of unavailable who are free for part of the slot. */
  partialIds: string[];
  /** Free in the grid but booked elsewhere at that time. */
  conflicts: SlotConflict[];
  pendingIds: string[];
  availableCount: number;
  respondedCount: number;
  totalCount: number;
  /** Share of the whole team that can attend (0–100). */
  teamPercentage: number;
  /** Share of respondents that can attend (0–100). */
  responsePercentage: number;
  /** 0–1: how much of the slot falls inside attendees' preferred hours. */
  preferredFit: number;
  score: number;
}

export interface MatchResult {
  ranked: SlotSuggestion[];
  best: SlotSuggestion | null;
  alternatives: SlotSuggestion[];
  /** cell key → number of participants who marked it. */
  heat: Record<string, number>;
  respondedIds: string[];
  pendingIds: string[];
  /** Whether the poll can produce any suggestion at all. */
  feasible: boolean;
}

export function cellsForDay(
  date: string,
  dayStartHour: number,
  dayEndHour: number,
  slotMinutes: number,
): string[] {
  const out: string[] = [];
  const start = parseLocalKey(date);
  start.setHours(dayStartHour, 0, 0, 0);
  const end = parseLocalKey(date);
  end.setHours(dayEndHour, 0, 0, 0);
  for (let t = start; t < end; t = addMinutes(t, slotMinutes)) out.push(cellKey(t));
  return out;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function preferredFraction(start: Date, end: Date, p: MatchParticipant): number {
  const ws = p.workStartHour ?? 9;
  const we = p.workEndHour ?? 18;
  const winStart = new Date(start);
  winStart.setHours(ws, 0, 0, 0);
  const winEnd = new Date(start);
  winEnd.setHours(we, 0, 0, 0);
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  const inside = Math.max(
    0,
    Math.min(end.getTime(), winEnd.getTime()) - Math.max(start.getTime(), winStart.getTime()),
  );
  return inside / total;
}

export function matchMeeting(input: MatchInput): MatchResult {
  const { candidateDates, dayStartHour, dayEndHour, slotMinutes, durationMinutes, participants } =
    input;

  const respondedIds = participants
    .filter((p) => input.availability[p.id] !== undefined)
    .map((p) => p.id);
  const pendingIds = participants
    .filter((p) => input.availability[p.id] === undefined)
    .map((p) => p.id);

  const sets = new Map<string, Set<string>>();
  for (const id of respondedIds) sets.set(id, new Set(input.availability[id] ?? []));

  const heat: Record<string, number> = {};
  for (const set of sets.values()) for (const k of set) heat[k] = (heat[k] ?? 0) + 1;

  const valid =
    slotMinutes > 0 && durationMinutes > 0 && dayEndHour > dayStartHour && participants.length > 0;
  const cellsNeeded = Math.ceil(durationMinutes / Math.max(slotMinutes, 1));
  const ranked: SlotSuggestion[] = [];

  if (valid) {
    for (const date of [...candidateDates].sort()) {
      const cells = cellsForDay(date, dayStartHour, dayEndHour, slotMinutes);
      const dayEnd = parseLocalKey(date);
      dayEnd.setHours(dayEndHour, 0, 0, 0);

      for (let i = 0; i + cellsNeeded <= cells.length; i++) {
        const start = parseLocalKey(cells[i]);
        const end = addMinutes(start, durationMinutes);
        if (end > dayEnd) break;
        const window = cells.slice(i, i + cellsNeeded);

        const availableIds: string[] = [];
        const unavailableIds: string[] = [];
        const partialIds: string[] = [];
        const conflicts: SlotConflict[] = [];
        let partialCoverage = 0;
        let preferredSum = 0;

        for (const p of participants) {
          const set = sets.get(p.id);
          if (!set) continue; // pending
          const covered = window.filter((c) => set.has(c)).length;
          if (covered === window.length) {
            const clash = (p.busy ?? []).find((b) =>
              overlaps(start, end, new Date(b.start), new Date(b.end)),
            );
            if (clash) {
              conflicts.push({ userId: p.id, label: clash.label });
              unavailableIds.push(p.id);
            } else {
              availableIds.push(p.id);
              preferredSum += preferredFraction(start, end, p);
            }
          } else {
            unavailableIds.push(p.id);
            if (covered > 0) {
              partialIds.push(p.id);
              partialCoverage += covered / window.length;
            }
          }
        }

        const availableCount = availableIds.length;
        const preferredFit = availableCount ? preferredSum / availableCount : 0;
        const score =
          availableCount * 100 - conflicts.length * 15 + partialCoverage * 10 + preferredFit * 8;

        ranked.push({
          startKey: cells[i],
          start: start.toISOString(),
          end: end.toISOString(),
          availableIds,
          unavailableIds,
          partialIds,
          conflicts,
          pendingIds,
          availableCount,
          respondedCount: respondedIds.length,
          totalCount: participants.length,
          teamPercentage: Math.round((availableCount / participants.length) * 100),
          responsePercentage: respondedIds.length
            ? Math.round((availableCount / respondedIds.length) * 100)
            : 0,
          preferredFit,
          score,
        });
      }
    }
  }

  ranked.sort((a, b) => b.score - a.score || a.start.localeCompare(b.start));

  const viable = ranked.filter((s) => s.availableCount > 0);
  const best = viable[0] ?? null;

  // Alternatives: next best slots that don't overlap the best or each other,
  // so the suggestions are genuinely different options.
  const alternatives: SlotSuggestion[] = [];
  if (best) {
    const picked = [best];
    for (const s of viable.slice(1)) {
      if (alternatives.length >= 3) break;
      const sS = new Date(s.start);
      const sE = new Date(s.end);
      if (picked.some((p) => overlaps(sS, sE, new Date(p.start), new Date(p.end)))) continue;
      alternatives.push(s);
      picked.push(s);
    }
  }

  return {
    ranked,
    best,
    alternatives,
    heat,
    respondedIds,
    pendingIds,
    feasible: valid && ranked.length > 0,
  };
}
