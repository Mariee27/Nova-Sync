"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarCheck2, CalendarPlus, CircleDashed, History, MapPin } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useLookups } from "@/lib/hooks";
import { matchMeeting } from "@/lib/scheduling/matcher";
import { busyFor, projectsForUser } from "@/lib/selectors/workspace";
import type { Meeting, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function PollCard({ m }: { m: Meeting }) {
  const { ws, me } = useReadyWorkspace();
  const { people, projects } = useLookups();
  const project = projects.get(m.projectId);
  const invitees = m.inviteeIds.map((id) => people.get(id)).filter((p): p is Profile => !!p);
  const availability: Record<string, string[] | undefined> = {};
  for (const a of ws.availability.filter((a) => a.meetingId === m.id)) availability[a.userId] = a.slots;
  const r = matchMeeting({ ...m, participants: invitees.map((p) => ({ id: p.id, workStartHour: p.workStartHour, workEndHour: p.workEndHour, busy: busyFor(ws, p.id, m.id) })), availability });
  const needsMe = m.inviteeIds.includes(me.id) && availability[me.id] === undefined;
  return (
    <Link href={`/meetings/${m.id}`} className="group flex flex-col rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-muted-foreground">
            {project?.emoji} {project?.name}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold">{m.title}</p>
        </div>
        {needsMe ? <Badge variant="warning">Your turn</Badge> : <Badge variant="secondary"><CircleDashed /> Polling</Badge>}
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        {invitees.map((p) => (
          <span key={p.id} className={cn("relative", availability[p.id] === undefined && "opacity-40 grayscale")}>
            <Avatar person={p} size="sm" />
          </span>
        ))}
        <span className="ml-1 text-[12px] text-muted-foreground">
          {r.respondedIds.length}/{invitees.length} responded
        </span>
      </div>
      <div className="mt-4 rounded-xl bg-secondary/60 p-3">
        {r.best ? (
          <>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Best so far</p>
            <p className="mt-0.5 text-[14px] font-semibold">
              {format(new Date(r.best.start), "EEEE HH:mm")}–{format(new Date(r.best.end), "HH:mm")}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {r.best.availableCount}/{r.best.totalCount} available · {r.best.teamPercentage}%
            </p>
          </>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">Waiting for availability…</p>
        )}
      </div>
      <p className="mt-3 text-[12px] font-medium text-primary group-hover:underline">{needsMe ? "Add your availability →" : "View results →"}</p>
    </Link>
  );
}

function MeetingRow({ m, past }: { m: Meeting; past?: boolean }) {
  const { people, projects } = useLookups();
  const project = projects.get(m.projectId);
  const invitees = m.inviteeIds.map((id) => people.get(id)).filter((p): p is Profile => !!p);
  return (
    <Link href={`/meetings/${m.id}`} className={cn("flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-secondary/60", past && "opacity-70")}>
      <div className={cn("flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5", past ? "bg-secondary" : "bg-blue-500/10 text-blue-600")}>
        <span className="text-[10px] font-semibold uppercase">{format(new Date(m.confirmedStart!), "MMM")}</span>
        <span className="text-[18px] leading-tight font-semibold tabular-nums">{format(new Date(m.confirmedStart!), "d")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{m.title}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-[12px] text-muted-foreground">
          <span>
            {format(new Date(m.confirmedStart!), "EEEE HH:mm")}–{format(new Date(m.confirmedEnd!), "HH:mm")}
          </span>
          {m.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {m.location}
            </span>
          )}
          <span>
            {project?.emoji} {project?.name.split(" — ")[0]}
          </span>
        </p>
      </div>
      <AvatarStack people={invitees} max={4} size="sm" className="hidden sm:flex" />
    </Link>
  );
}

export function MeetingsList({ projectId }: { projectId?: string }) {
  const { ws, me } = useReadyWorkspace();
  const ids = new Set(projectId ? [projectId] : projectsForUser(ws, me.id).map((p) => p.id));
  const all = ws.meetings.filter((m) => ids.has(m.projectId));
  const now = new Date();
  const polls = all.filter((m) => m.status === "polling");
  const upcoming = all.filter((m) => m.status === "confirmed" && new Date(m.confirmedEnd!) >= now).sort((a, b) => a.confirmedStart!.localeCompare(b.confirmedStart!));
  const past = all.filter((m) => m.status === "confirmed" && new Date(m.confirmedEnd!) < now).sort((a, b) => b.confirmedStart!.localeCompare(a.confirmedStart!));
  const newHref = projectId ? `/meetings/new?project=${projectId}` : "/meetings/new";

  return (
    <div className="space-y-8">
      {!projectId && (
        <PageHeader
          title="Meetings"
          description="Polls in progress, confirmed meetings and history across all your projects."
          actions={
            <Button asChild>
              <Link href={newHref}>
                <CalendarPlus /> New meeting poll
              </Link>
            </Button>
          }
        />
      )}
      {projectId && (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={newHref}>
              <CalendarPlus /> New meeting poll
            </Link>
          </Button>
        </div>
      )}
      {all.length === 0 ? (
        <EmptyState icon={CalendarPlus} title="No meetings yet" description="Create a poll and let NOVA SYNC find the time that works for everyone." action={<Button asChild><Link href={newHref}>Find a time</Link></Button>} />
      ) : (
        <>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><CircleDashed className="size-4 text-amber-500" /> Finding a time <span className="text-muted-foreground font-normal">{polls.length}</span></h2>
            {polls.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No open polls.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{polls.map((m) => <PollCard key={m.id} m={m} />)}</div>
            )}
          </section>
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold"><CalendarCheck2 className="size-4 text-emerald-500" /> Upcoming <span className="text-muted-foreground font-normal">{upcoming.length}</span></h2>
            <div className="rounded-2xl border bg-card p-1.5 shadow-soft">
              {upcoming.length === 0 ? <p className="p-4 text-[13px] text-muted-foreground">Nothing scheduled.</p> : upcoming.map((m) => <MeetingRow key={m.id} m={m} />)}
            </div>
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold"><History className="size-4 text-muted-foreground" /> Past</h2>
              <div className="rounded-2xl border bg-card p-1.5 shadow-soft">{past.map((m) => <MeetingRow key={m.id} m={m} past />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
