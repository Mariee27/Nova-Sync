import type { Profile, WorkspaceSnapshot } from "@/lib/types";

export interface AvailabilityStatus {
  state: "available" | "busy" | "away";
  label: string;
}

/**
 * Derived availability — not live presence. It combines the member's
 * preferred working hours with meetings confirmed in NOVA SYNC.
 */
export function availabilityStatus(p: Profile, ws: WorkspaceSnapshot, now = new Date()): AvailabilityStatus {
  const meeting = ws.meetings.find(
    (m) =>
      m.status === "confirmed" &&
      m.inviteeIds.includes(p.id) &&
      m.confirmedStart &&
      m.confirmedEnd &&
      new Date(m.confirmedStart) <= now &&
      new Date(m.confirmedEnd) > now,
  );
  if (meeting) return { state: "busy", label: `In “${meeting.title}”` };
  const h = now.getHours() + now.getMinutes() / 60;
  const pad = (n: number) => `${String(n).padStart(2, "0")}:00`;
  if (h >= p.workStartHour && h < p.workEndHour) return { state: "available", label: `Usually available until ${pad(p.workEndHour)}` };
  return { state: "away", label: `Outside working hours · from ${pad(p.workStartHour)}` };
}
