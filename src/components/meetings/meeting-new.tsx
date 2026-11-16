"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, isWeekend, startOfDay } from "date-fns";
import { ArrowRight, Check, Clock, Loader2, Sparkles } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, nativeSelectClass } from "@/components/app/dialogs/form-field";
import { dayKey, hourLabel } from "@/lib/dates";
import { meetingInputSchema } from "@/lib/data/commands";
import { projectMembers, projectsForUser } from "@/lib/selectors/workspace";
import { cn } from "@/lib/utils";

const DURATIONS = [30, 45, 60, 90, 120];

export function MeetingNew() {
  const { ws, me, run } = useReadyWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const projects = projectsForUser(ws, me.id).filter((p) => p.status !== "completed");
  const [projectId, setProjectId] = React.useState(params.get("project") ?? projects[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [duration, setDuration] = React.useState(60);
  const [startHour, setStartHour] = React.useState(9);
  const [endHour, setEndHour] = React.useState(19);
  const [slot, setSlot] = React.useState<15 | 30 | 60>(30);
  const today = startOfDay(new Date());
  const upcoming = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1));
  const [dates, setDates] = React.useState<string[]>(() => upcoming.filter((d) => !isWeekend(d)).slice(0, 5).map(dayKey));
  const members = projectId ? projectMembers(ws, projectId) : [];
  const [invitees, setInvitees] = React.useState<string[]>(() => (projectId ? projectMembers(ws, projectId).map((m) => m.id) : []));
  // Reset invitees to the whole team only when the project changes.
  const [inviteesFor, setInviteesFor] = React.useState(projectId);
  if (inviteesFor !== projectId) {
    setInviteesFor(projectId);
    setInvitees(projectId ? projectMembers(ws, projectId).map((m) => m.id) : []);
  }
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);


  if (projects.length === 0)
    return <EmptyState icon={Sparkles} title="You need a project first" description="Meeting polls belong to a project so the right people are invited." />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      projectId,
      title,
      description,
      location,
      durationMinutes: duration,
      candidateDates: dates,
      dayStartHour: startHour,
      dayEndHour: endHour,
      slotMinutes: slot,
      inviteeIds: invitees,
    };
    const parsed = meetingInputSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const r = await run({ type: "meeting.create", input: parsed.data }, { success: "Poll created — teammates have been notified" });
    setBusy(false);
    if (r?.createdId) router.push(`/meetings/${r.createdId}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={<span className="text-[12.5px] font-semibold text-primary">Smart Meeting Scheduler</span>}
        title="Find a time that works for everyone"
        description="Propose a few days. Everyone paints when they're free, and NOVA SYNC ranks the best slots — no more “when are you free?” threads."
      />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Card>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project" htmlFor="m-project" error={errors.projectId}>
                <select id="m-project" className={nativeSelectClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Meeting title" htmlFor="m-title" error={errors.title}>
                <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly sync" aria-invalid={!!errors.title} />
              </Field>
            </div>
            <Field label="Duration" error={errors.durationMinutes}>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Duration">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={duration === d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition",
                      duration === d ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
                    )}
                  >
                    <Clock className="size-3.5" />
                    {d < 60 ? `${d} min` : `${d / 60} h`.replace(".5 h", "½ h")}
                  </button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-5">
            <Field label="Propose dates" error={errors.candidateDates} hint={`${dates.length} selected · up to 14`}>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7" role="group" aria-label="Candidate dates">
                {upcoming.map((d) => {
                  const k = dayKey(d);
                  const on = dates.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDates((xs) => (on ? xs.filter((x) => x !== k) : [...xs, k].sort()))}
                      className={cn(
                        "relative flex cursor-pointer flex-col items-center rounded-xl border py-2 transition",
                        on ? "border-primary bg-primary/8 text-foreground ring-1 ring-primary" : "bg-card text-muted-foreground hover:bg-secondary",
                        isWeekend(d) && !on && "opacity-60",
                      )}
                    >
                      <span className="text-[10.5px] font-semibold uppercase">{format(d, "EEE")}</span>
                      <span className="text-[16px] font-semibold text-foreground tabular-nums">{format(d, "d")}</span>
                      <span className="text-[10px]">{format(d, "MMM")}</span>
                      {on && <Check className="absolute top-1 right-1 size-3 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Earliest time" htmlFor="m-start">
                <select id="m-start" className={nativeSelectClass} value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
                  {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Latest time" htmlFor="m-end" error={errors.dayEndHour}>
                <select id="m-end" className={nativeSelectClass} value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>
                  {Array.from({ length: 16 }, (_, i) => i + 9).map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Time slots" htmlFor="m-slot" hint="Grid granularity">
                <select id="m-slot" className={nativeSelectClass} value={slot} onChange={(e) => setSlot(Number(e.target.value) as 15 | 30 | 60)}>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4">
            <Field label="Invite" error={errors.inviteeIds} hint="Everyone invited can mark availability.">
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = invitees.includes(m.id);
                  const self = m.id === me.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={self}
                      aria-pressed={on}
                      onClick={() => setInvitees((xs) => (on ? xs.filter((x) => x !== m.id) : [...xs, m.id]))}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] transition disabled:cursor-default",
                        on ? "border-primary/40 bg-primary/8" : "text-muted-foreground opacity-70 hover:opacity-100",
                      )}
                    >
                      <Avatar person={m} size="sm" />
                      {m.name.split(" ")[0]}
                      {self ? " (you)" : on ? <Check className="size-3.5 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" htmlFor="m-loc">
                <Input id="m-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="NOVA SBE · Room B-104 or Zoom" />
              </Field>
              <Field label="Agenda" htmlFor="m-desc">
                <Textarea id="m-desc" rows={1} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should we decide?" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {dates.length} days × {endHour - startHour > 0 ? endHour - startHour : 0} hours · {invitees.length} people
          </p>
          <Button type="submit" size="lg" variant="brand" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} Create poll & add my availability <ArrowRight />
          </Button>
        </div>
      </form>
    </div>
  );
}
