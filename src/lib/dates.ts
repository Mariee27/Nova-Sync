import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
} from "date-fns";

/** Local calendar-day key, e.g. `2026-11-18`. */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Local grid-cell key, e.g. `2026-11-18T15:30`. */
export function cellKey(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/** Parse a `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` key as a *local* date. */
export function parseLocalKey(key: string): Date {
  const [d, t] = key.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = (t ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, day, hh || 0, mm || 0, 0, 0);
}

export function daysUntil(iso: string, now = new Date()): number {
  return differenceInCalendarDays(new Date(iso), now);
}

/** "Today", "Tomorrow", "in 3 days", "2 days ago", or a date for anything far. */
export function relativeDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  const diff = differenceInCalendarDays(d, now);
  if (diff > 0 && diff < 14) return `in ${diff} days`;
  if (diff < 0 && diff > -14) return `${-diff} days ago`;
  return format(d, "d MMM");
}

export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const secs = (Date.now() - d.getTime()) / 1000;
  if (secs < 45) return "just now";
  return `${formatDistanceToNowStrict(d)} ago`;
}

export function fmtTime(iso: string | Date): string {
  return format(typeof iso === "string" ? new Date(iso) : iso, "HH:mm");
}

export function fmtDate(iso: string | Date, pattern = "EEE, d MMM"): string {
  return format(typeof iso === "string" ? new Date(iso) : iso, pattern);
}

export function fmtRange(start: string | Date, end: string | Date): string {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return `${format(s, "EEEE, d MMM")} · ${format(s, "HH:mm")}–${format(e, "HH:mm")}`;
}

/** End of the local day `offset` days from `base`, as ISO. Used for deadlines. */
export function endOfDayIn(offset: number, base = new Date()): string {
  return endOfDay(addDays(base, offset)).toISOString();
}

/** A local time `offset` days from `base` at `hour:minute`, as ISO. */
export function atDayTime(offset: number, hour: number, minute = 0, base = new Date()): string {
  const d = startOfDay(addDays(base, offset));
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}
