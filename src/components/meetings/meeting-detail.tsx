"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { addMinutes, format } from "date-fns";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarX,
  Check,
  CircleDashed,
  Clock,
  Download,
  Eraser,
  Grid3x3,
  MapPin,
  MousePointer2,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Hint } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useLookups } from "@/lib/hooks";
import { cellKey } from "@/lib/dates";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { cellsForDay, matchMeeting, type SlotSuggestion } from "@/lib/scheduling/matcher";
import { busyFor } from "@/lib/selectors/workspace";
import type { Profile } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { AvailabilityGrid, type GridMode } from "./availability-grid";

function slotTitle(s: Pick<SlotSuggestion, "start" | "end">) {
  return `${format(new Date(s.start), "EEEE")}, ${format(new Date(s.start), "HH:mm")}–${format(new Date(s.end), "HH:mm")}`;
}

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function MeetingDetail() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { ws, me, run, mode: dataMode } = useReadyWorkspace();
  const { people } = useLookups();
  const meeting = ws.meetings.find((m) => m.id === meetingId);
  const project = meeting ? ws.projects.find((p) => p.id === meeting.projectId) : undefined;
  const isMember = !!meeting && ws.members.some((m) => m.projectId === meeting.projectId && m.userId === me.id);

  const [actingAsChoice, setActingAs] = React.useState(me.id);
  // Fall back to the first invitee if the chosen person isn't invited (e.g. a viewer who isn't on the poll).
  const actingAs = meeting && !meeting.inviteeIds.includes(actingAsChoice) ? meeting.inviteeIds[0] : actingAsChoice;
  const [gridMode, setGridMode] = React.useState<GridMode>("edit");
  // Key on the slot list itself so unrelated writes don't reset an unsaved draft.
  const savedKey = JSON.stringify(ws.availability.find((a) => a.meetingId === meetingId && a.userId === actingAs)?.slots ?? []);
  const saved = React.useMemo(() => new Set<string>(JSON.parse(savedKey)), [savedKey]);
  const hasResponded = ws.availability.some((a) => a.meetingId === meetingId && a.userId === actingAs);
  const [draft, setDraft] = React.useState<Set<string>>(saved);
  const [confirming, setConfirming] = React.useState<SlotSuggestion | null>(null);
  const [location, setLocation] = React.useState("");

  // Reset the draft when switching who we're responding as (or after saving).
  const [draftSource, setDraftSource] = React.useState(saved);
  if (draftSource !== saved) {
    setDraftSource(saved);
    setDraft(new Set(saved));
  }

  if (!meeting || !project || !isMember)
    return (
      <EmptyState
        icon={CalendarX}
        title="Meeting not found"
        description="It may have been deleted, or it belongs to a project you're not part of."
        action={
          <Button asChild>
            <Link href="/meetings">All meetings</Link>
          </Button>
        }
      />
    );

  const invitees = meeting.inviteeIds.map((id) => people.get(id)).filter((p): p is Profile => !!p);
  const dirty = !sameSet(draft, saved) || (!hasResponded && draft.size > 0);

  // Live matching: the draft of the person responding is included as if saved.
  const availability: Record<string, string[] | undefined> = {};
  for (const a of ws.availability.filter((a) => a.meetingId === meeting.id)) availability[a.userId] = a.slots;
  if (meeting.status === "polling" && (dirty || hasResponded)) availability[actingAs] = [...draft];
  const result = matchMeeting({
    ...meeting,
    participants: invitees.map((p) => ({ id: p.id, workStartHour: p.workStartHour, workEndHour: p.workEndHour, busy: busyFor(ws, p.id, meeting.id) })),
    availability,
  });

  const whoByCell = new Map<string, Profile[]>();
  for (const [uid, slots] of Object.entries(availability))
    for (const k of slots ?? []) whoByCell.set(k, [...(whoByCell.get(k) ?? []), people.get(uid)!].filter(Boolean));

  const bestCells = new Set<string>();
  const markCells = (s: SlotSuggestion | null) => {
    if (!s) return;
    const startKey = s.startKey;
    const n = Math.ceil(meeting.durationMinutes / meeting.slotMinutes);
    const day = cellsForDay(startKey.slice(0, 10), meeting.dayStartHour, meeting.dayEndHour, meeting.slotMinutes);
    const i = day.indexOf(startKey);
    day.slice(i, i + n).forEach((k) => bestCells.add(k));
  };
  if (meeting.status === "polling") markCells(result.best);
  else if (meeting.confirmedStart) {
    const k = cellKey(new Date(meeting.confirmedStart));
    markCells({ startKey: k } as SlotSuggestion);
  }

  const busyCells = new Map<string, string>();
  for (const b of busyFor(ws, actingAs, meeting.id)) {
    for (let t = new Date(b.start); t < new Date(b.end); t = addMinutes(t, meeting.slotMinutes)) busyCells.set(cellKey(t), b.label);
  }

  const save = async () => {
    const r = await run(
      { type: "meeting.availability", meetingId: meeting.id, userId: actingAs, slots: [...draft] },
      { success: actingAs === me.id ? "Availability saved" : `Saved ${firstName(people.get(actingAs)?.name ?? "")}'s availability` },
    );
    if (r) setGridMode("edit");
  };

  const fillWorkingHours = () => {
    const p = people.get(actingAs);
    if (!p) return;
    const next = new Set<string>();
    for (const d of meeting.candidateDates)
      for (const k of cellsForDay(d, meeting.dayStartHour, meeting.dayEndHour, meeting.slotMinutes)) {
        const h = Number(k.slice(11, 13));
        if (h >= p.workStartHour && h < p.workEndHour && !busyCells.has(k)) next.add(k);
      }
    setDraft(next);
  };

  const confirm = async () => {
    if (!confirming) return;
    const r = await run(
      { type: "meeting.confirm", meetingId: meeting.id, start: confirming.start, end: confirming.end, location },
      { success: "Meeting confirmed — it's on everyone's calendar" },
    );
    if (r) setConfirming(null);
  };

  const ics = () => {
    if (!meeting.confirmedStart || !meeting.confirmedEnd) return;
    const organizer = people.get(meeting.organizerId);
    downloadIcs(
      `${meeting.title.replace(/[^\w-]+/g, "-").toLowerCase()}`,
      buildIcs({
        uid: `${meeting.id}@novasync.app`,
        title: `${meeting.title} · ${project.name}`,
        description: `${meeting.description}\n\nScheduled with NOVA SYNC.`,
        location: meeting.location,
        start: meeting.confirmedStart,
        end: meeting.confirmedEnd,
        organizer: organizer ? { name: organizer.name, email: organizer.email } : undefined,
        attendees: invitees.map((p) => ({ name: p.name, email: p.email })),
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    );
    toast.success("Calendar invite downloaded", { description: "Open the .ics file to add it to Google, Outlook or Apple Calendar." });
  };

  const best = result.best;
  const organizer = people.get(meeting.organizerId);
  // Header ticks reflect saved responses only, not the live draft preview.
  const responded = new Set(ws.availability.filter((a) => a.meetingId === meeting.id).map((a) => a.userId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link href={`/projects/${project.id}/meetings`} className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
            {project.emoji} {project.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{meeting.title}</h1>
            {meeting.status === "polling" ? (
              <Badge variant="warning">
                <CircleDashed /> Finding a time
              </Badge>
            ) : meeting.status === "confirmed" ? (
              <Badge variant="success">
                <CalendarCheck2 /> Confirmed
              </Badge>
            ) : (
              <Badge variant="danger">Cancelled</Badge>
            )}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {meeting.durationMinutes} min
            </span>
            {meeting.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {meeting.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" /> Organised by {organizer ? firstName(organizer.name) : "—"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {invitees.map((p) => (
            <Hint key={p.id} label={`${p.name} · ${responded.has(p.id) ? "responded" : "hasn't responded yet"}`}>
              <span className="relative">
                <Avatar person={p} size="md" className={cn(!responded.has(p.id) && meeting.status === "polling" && "opacity-45 grayscale")} />
                {responded.has(p.id) && (
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                    <Check className="size-2 text-white" strokeWidth={4} />
                  </span>
                )}
              </span>
            </Hint>
          ))}
        </div>
      </div>

      {meeting.status === "confirmed" && meeting.confirmedStart && meeting.confirmedEnd && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
          <div className="absolute -top-20 -right-20 size-72 rounded-full bg-[#2563EB] opacity-40 blur-[90px]" aria-hidden />
          <div className="absolute -bottom-24 left-10 size-64 rounded-full bg-[#8B5CF6] opacity-30 blur-[90px]" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.18em] text-white/60 uppercase">Meeting confirmed</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{format(new Date(meeting.confirmedStart), "EEEE, d MMMM")}</p>
              <p className="mt-1 text-lg text-white/80 tabular-nums">
                {format(new Date(meeting.confirmedStart), "HH:mm")}–{format(new Date(meeting.confirmedEnd), "HH:mm")}
                {meeting.location ? ` · ${meeting.location}` : ""}
              </p>
              <p className="mt-3 text-[13px] text-white/60">It&apos;s on the project calendar and every member&apos;s dashboard.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={ics} className="bg-white text-navy hover:bg-white/90">
                <Download /> Download .ics invite
              </Button>
              <Button
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => run({ type: "meeting.reopen", meetingId: meeting.id }, { success: "Poll reopened" })}
              >
                <RotateCcw /> Reopen poll
              </Button>
            </div>
          </div>
          <p className="relative mt-5 text-[11.5px] text-white/50">
            Calendar integration: NOVA SYNC exports a standard .ics file. No Google or Outlook account is connected{dataMode === "demo" ? " in demo mode" : ""}.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
        {/* Grid side */}
        <div className="min-w-0 space-y-4">
          {meeting.status === "polling" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex rounded-lg border bg-card p-0.5 shadow-soft" role="group" aria-label="Grid view">
                {(
                  [
                    ["edit", MousePointer2, actingAs === me.id ? "My availability" : `${firstName(people.get(actingAs)?.name ?? "")}'s availability`],
                    ["group", Grid3x3, "Group heatmap"],
                  ] as const
                ).map(([m, Icon, label]) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={gridMode === m}
                    onClick={() => setGridMode(m)}
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition",
                      gridMode === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
              {dataMode === "demo" && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] whitespace-nowrap text-muted-foreground">Responding as</span>
                  <Select value={actingAs} onValueChange={(v) => { setActingAs(v); setGridMode("edit"); }}>
                    <SelectTrigger className="h-8 w-48" aria-label="Respond as">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {invitees.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <Avatar person={p} size="xs" /> {p.id === me.id ? `${firstName(p.name)} (you)` : `${firstName(p.name)} · demo`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          {meeting.status === "polling" && actingAs !== me.id && (
            <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <strong>Demo simulation:</strong> you&apos;re filling in {people.get(actingAs)?.name}&apos;s availability to show how responses combine. In a real workspace each teammate responds from their own account.
            </p>
          )}

          <AvailabilityGrid
            meeting={meeting}
            mode={meeting.status === "polling" ? gridMode : "group"}
            selected={draft}
            onChange={setDraft}
            whoByCell={whoByCell}
            totalInvitees={invitees.length}
            highlight={bestCells}
            busyCells={gridMode === "edit" ? busyCells : undefined}
            readOnly={meeting.status !== "polling"}
          />

          {meeting.status === "polling" && gridMode === "edit" && (
            <div className="sticky bottom-20 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card/95 p-2.5 pl-4 shadow-lift backdrop-blur lg:bottom-4">
              <p className="text-[12.5px] text-muted-foreground">
                {dirty ? (
                  <span className="font-medium text-foreground">Unsaved changes · {draft.size} slots selected</span>
                ) : hasResponded ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-600" /> Saved · {draft.size} slots
                  </span>
                ) : (
                  "Select every time you could make it."
                )}
              </p>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={fillWorkingHours}>
                  <Wand2 /> Working hours
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDraft(new Set())} disabled={draft.size === 0}>
                  <Eraser /> Clear
                </Button>
                <Button size="sm" onClick={save} disabled={!dirty}>
                  Save availability
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results side */}
        <aside className="space-y-4" aria-label="Scheduling results">
          {meeting.status === "polling" ? (
            <>
              <AnimatePresence mode="popLayout">
                {best ? (
                  <motion.div key={best.startKey + best.availableCount} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
                    <Card className="relative overflow-hidden border-transparent bg-gradient-to-br from-[#101828] to-[#1e2a4a] text-white">
                      <div className="absolute -top-16 -right-16 size-48 rounded-full bg-[#2563EB] opacity-40 blur-3xl" aria-hidden />
                      <CardContent className="relative">
                        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.16em] text-[#93C5FD] uppercase">
                          <Trophy className="size-3.5" /> Best match
                        </p>
                        <p className="mt-3 text-[22px] leading-tight font-semibold tracking-tight">{slotTitle(best)}</p>
                        <p className="text-[13px] text-white/60">{format(new Date(best.start), "d MMMM yyyy")}</p>
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <p className="text-3xl font-semibold tabular-nums">
                              {best.availableCount}/{best.totalCount}
                            </p>
                            <p className="text-[12px] text-white/60">members available</p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-semibold tabular-nums">{best.teamPercentage}%</p>
                            <p className="text-[12px] text-white/60">team availability</p>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#A78BFA]" initial={{ width: 0 }} animate={{ width: `${best.teamPercentage}%` }} transition={{ duration: 0.6 }} />
                        </div>
                        <div className="mt-4 flex -space-x-1.5">
                          {best.availableIds.map((id) => people.get(id) && <Avatar key={id} person={people.get(id)!} size="sm" ring className="ring-[#101828]" />)}
                        </div>
                        {(best.unavailableIds.length > 0 || best.pendingIds.length > 0) && (
                          <ul className="mt-3 space-y-1 text-[12px] text-white/70">
                            {best.conflicts.map((c) => (
                              <li key={c.userId} className="flex items-center gap-1.5">
                                <AlertTriangle className="size-3 text-amber-300" /> {firstName(people.get(c.userId)?.name ?? "")} has “{c.label}”
                              </li>
                            ))}
                            {best.unavailableIds
                              .filter((id) => !best.conflicts.some((c) => c.userId === id))
                              .map((id) => (
                                <li key={id} className="flex items-center gap-1.5">
                                  <AlertTriangle className="size-3 text-amber-300" /> {firstName(people.get(id)?.name ?? "")} {best.partialIds.includes(id) ? "is only free for part of it" : "isn't free"}
                                </li>
                              ))}
                            {best.pendingIds.length > 0 && (
                              <li className="flex items-center gap-1.5">
                                <CircleDashed className="size-3" /> Waiting on {best.pendingIds.map((id) => firstName(people.get(id)?.name ?? "")).join(", ")}
                              </li>
                            )}
                          </ul>
                        )}
                        <Button className="mt-5 w-full bg-white text-navy hover:bg-white/90" onClick={() => { setConfirming(best); setLocation(meeting.location); }}>
                          <CalendarCheck2 /> Confirm this time
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card>
                      <CardContent className="text-center">
                        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-secondary">
                          <Sparkles className="size-5 text-primary" />
                        </div>
                        <p className="text-[14px] font-semibold">{result.respondedIds.length === 0 ? "Waiting for responses" : "No overlap yet"}</p>
                        <p className="mt-1 text-[12.5px] text-muted-foreground">
                          {result.respondedIds.length === 0
                            ? "As soon as people mark their availability, the best time appears here."
                            : "Nobody's free at the same time yet. Ask the team to add more options or propose other days."}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {result.alternatives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[14px]">Alternative suggestions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-3">
                    {result.alternatives.map((s) => (
                      <div key={s.startKey} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13.5px] font-medium">{slotTitle(s)}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {s.availableCount}/{s.totalCount} available
                              {s.conflicts.length > 0 && ` · ${s.conflicts.length} conflict${s.conflicts.length > 1 ? "s" : ""}`}
                            </p>
                          </div>
                          <span className="text-[13px] font-semibold tabular-nums">{s.teamPercentage}%</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${s.teamPercentage}%` }} />
                          </div>
                          <Button variant="ghost" size="xs" onClick={() => { setConfirming(s); setLocation(meeting.location); }}>
                            Choose
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-[14px]">How we rank times</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 text-[12.5px] text-muted-foreground">
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Most members free for the full {meeting.durationMinutes} minutes</li>
                    <li>Fewest clashes with meetings already confirmed</li>
                    <li>Closest partial availability for those who can&apos;t make it</li>
                    <li>Inside everyone&apos;s preferred working hours</li>
                    <li>Earliest option wins a tie</li>
                  </ol>
                  <p className="mt-3">
                    {result.respondedIds.length}/{invitees.length} responded · {result.ranked.length} possible start times evaluated.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px]">Attendees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {invitees.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <Avatar person={p} size="sm" />
                    <span className="text-[13px]">{p.name}</span>
                    {p.id === meeting.organizerId && <Badge variant="secondary" className="ml-auto">Organiser</Badge>}
                  </div>
                ))}
                {meeting.description && <p className="border-t pt-3 text-[12.5px] text-muted-foreground">{meeting.description}</p>}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {meeting.title}?</DialogTitle>
            <DialogDescription>
              {confirming && `${slotTitle(confirming)} · ${format(new Date(confirming.start), "d MMMM")} · ${confirming.availableCount}/${confirming.totalCount} available`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            The poll closes, the meeting appears on the project calendar and every member&apos;s dashboard, and you can download an .ics invite.
          </p>
          <div className="grid gap-1.5">
            <label htmlFor="loc" className="text-[13px] font-medium">
              Location <span className="font-normal text-muted-foreground">(shown in the confirmation)</span>
            </label>
            <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room, Zoom link…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button onClick={confirm}>
              <CalendarCheck2 /> Confirm meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
