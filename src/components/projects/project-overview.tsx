"use client";

import * as React from "react";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, CalendarPlus, CalendarRange, Check, Flag, Megaphone, Plus, Trash2 } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Hint } from "@/components/ui/tooltip";
import { ActivityItem } from "@/components/shared/activity-item";
import { EmptyState } from "@/components/shared/empty-state";
import { STATUS_STYLE } from "@/components/shared/task-meta";
import { dateInputToIso } from "@/components/app/dialogs/form-field";
import { useLookups } from "@/lib/hooks";
import { computeProgress } from "@/lib/selectors/progress";
import { timeAgo } from "@/lib/dates";
import { STATUS_LABEL, TASK_STATUSES } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { useCurrentProject } from "./use-project";
import { UpdateComposer } from "./update-composer";

export function ProjectOverview() {
  const { project } = useCurrentProject();
  const { ws, run } = useReadyWorkspace();
  const { people } = useLookups();
  const [adding, setAdding] = React.useState(false);
  const [msTitle, setMsTitle] = React.useState("");
  const [msDate, setMsDate] = React.useState("");
  if (!project) return null;

  const tasks = ws.tasks.filter((t) => t.projectId === project.id);
  const progress = computeProgress(tasks);
  const milestones = ws.milestones.filter((m) => m.projectId === project.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const meetings = ws.meetings
    .filter((m) => m.projectId === project.id && m.status !== "cancelled" && (m.status === "polling" || new Date(m.confirmedEnd!) >= new Date()))
    .sort((a, b) => (a.confirmedStart ?? "9").localeCompare(b.confirmedStart ?? "9"));
  const updates = ws.updates.filter((u) => u.projectId === project.id).slice(0, 3);
  const activity = ws.activity.filter((a) => a.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim() || !msDate) return;
    const r = await run({ type: "milestone.create", projectId: project.id, title: msTitle, dueDate: dateInputToIso(msDate) }, { success: "Milestone added" });
    if (r) {
      setMsTitle("");
      setMsDate("");
      setAdding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4 lg:space-y-6">
        {/* Status breakdown */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Work breakdown</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Progress is calculated live from task status</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${project.id}/tasks`}>
                Open board <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {progress.total === 0 ? (
              <EmptyState compact icon={Plus} title="No tasks yet" description="Break the project into tasks so progress can be tracked." />
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label={TASK_STATUSES.map((s) => `${STATUS_LABEL[s]} ${progress.byStatus[s]}`).join(", ")}>
                  {TASK_STATUSES.map((s) => (
                    <motion.div
                      key={s}
                      className={cn("h-full", STATUS_STYLE[s].dot)}
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress.byStatus[s] / progress.total) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TASK_STATUSES.map((s) => (
                    <div key={s} className={cn("rounded-xl p-3", STATUS_STYLE[s].bg)}>
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                        <span className={cn("size-2 rounded-full", STATUS_STYLE[s].dot)} /> {STATUS_LABEL[s]}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">{progress.byStatus[s]}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Milestones</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {milestones.filter((m) => m.completedAt).length} of {milestones.length} reached
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAdding((a) => !a)}>
              <Plus /> Milestone
            </Button>
          </CardHeader>
          <CardContent>
            {adding && (
              <form onSubmit={addMilestone} className="mb-4 flex flex-col gap-2 rounded-xl border bg-secondary/40 p-3 sm:flex-row">
                <Input autoFocus placeholder="e.g. First draft to professor" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} aria-label="Milestone title" />
                <Input type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} className="sm:w-44" aria-label="Milestone due date" required />
                <Button type="submit" disabled={!msTitle.trim() || !msDate}>Add</Button>
              </form>
            )}
            {milestones.length === 0 && !adding && (
              <EmptyState compact icon={Flag} title="No milestones" description="Milestones break a long project into checkpoints." />
            )}
            <ol className="relative space-y-1">
              {milestones.map((m, i) => {
                const linked = tasks.filter((t) => t.milestoneId === m.id);
                const lp = computeProgress(linked);
                const days = differenceInCalendarDays(new Date(m.dueDate), new Date());
                const late = !m.completedAt && days < 0;
                return (
                  <li key={m.id} className="group relative flex gap-3 rounded-xl px-2 py-2.5 hover:bg-secondary/50">
                    {i < milestones.length - 1 && <span className="absolute top-10 bottom-[-6px] left-[21px] w-px bg-border" aria-hidden />}
                    <Hint label={m.completedAt ? "Mark as not reached" : "Mark as reached"}>
                      <button
                        type="button"
                        onClick={() => run({ type: "milestone.toggle", id: m.id }, { success: m.completedAt ? undefined : `Milestone reached: ${m.title}` })}
                        aria-label={`${m.completedAt ? "Unmark" : "Mark"} milestone ${m.title}`}
                        className={cn(
                          "relative z-10 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition",
                          m.completedAt ? "border-emerald-500 bg-emerald-500 text-white" : late ? "border-rose-400 bg-card" : "border-border bg-card hover:border-primary",
                        )}
                      >
                        {m.completedAt ? <Check className="size-3.5" strokeWidth={3} /> : <Flag className={cn("size-3", late ? "text-rose-500" : "text-muted-foreground")} />}
                      </button>
                    </Hint>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-[13.5px] font-medium", m.completedAt && "text-muted-foreground")}>{m.title}</p>
                        <span className={cn("shrink-0 text-[12px] tabular-nums", late ? "font-medium text-rose-600" : "text-muted-foreground")}>
                          {m.completedAt ? `Reached ${format(new Date(m.completedAt), "d MMM")}` : format(new Date(m.dueDate), "d MMM")}
                        </span>
                      </div>
                      {m.description && <p className="text-[12px] text-muted-foreground">{m.description}</p>}
                      {linked.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 w-24 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${lp.percentage}%` }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{lp.done}/{lp.total} linked tasks</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => run({ type: "milestone.delete", id: m.id }, { success: "Milestone removed" })}
                      className="cursor-pointer self-start rounded-md p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-secondary hover:text-destructive focus-visible:opacity-100"
                      aria-label={`Delete milestone ${m.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Updates */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Team updates</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Announcements for everyone on the project</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${project.id}/activity`}>
                All updates <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <UpdateComposer projectId={project.id} />
            {updates.map((u) => {
              const a = people.get(u.authorId);
              return (
                <div key={u.id} className="flex gap-3 rounded-xl border bg-secondary/30 p-3">
                  {a && <Avatar person={a} size="md" />}
                  <div className="min-w-0">
                    <p className="text-[12.5px]">
                      <span className="font-semibold">{a?.name}</span> <span className="text-muted-foreground">· {timeAgo(u.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-[13.5px] whitespace-pre-wrap">{u.body}</p>
                  </div>
                </div>
              );
            })}
            {updates.length === 0 && <p className="flex items-center gap-2 text-[13px] text-muted-foreground"><Megaphone className="size-4" /> No updates yet — be the first to post one.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Meetings</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Upcoming and open polls</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/meetings/new?project=${project.id}`}>
                <CalendarPlus /> Schedule
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {meetings.length === 0 && <EmptyState compact icon={CalendarRange} title="No meetings planned" description="Create a poll and let the team pick a time." />}
            {meetings.map((m) => {
              const responded = ws.availability.filter((a) => a.meetingId === m.id).length;
              return (
                <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary/60">
                  <div className={cn("flex size-10 shrink-0 flex-col items-center justify-center rounded-lg", m.status === "polling" ? "bg-amber-500/12 text-amber-700" : "bg-blue-500/10 text-blue-600")}>
                    {m.status === "polling" ? (
                      <CalendarRange className="size-4" />
                    ) : (
                      <>
                        <span className="text-[9.5px] font-semibold uppercase">{format(new Date(m.confirmedStart!), "EEE")}</span>
                        <span className="text-[14px] leading-tight font-semibold">{format(new Date(m.confirmedStart!), "d")}</span>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{m.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {m.status === "polling" ? `Poll open · ${responded}/${m.inviteeIds.length} responded` : `${format(new Date(m.confirmedStart!), "HH:mm")}–${format(new Date(m.confirmedEnd!), "HH:mm")} · ${m.location || "No location"}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-2">
            {activity.map((a) => (
              <ActivityItem key={a.id} event={a} people={people} showProject={false} />
            ))}
            {activity.length === 0 && <p className="text-[13px] text-muted-foreground">Nothing yet.</p>}
          </CardContent>
        </Card>

        {project.description && (
          <Card>
            <CardHeader>
              <CardTitle>Brief</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              {project.description}
              <p className="mt-3 text-[12px]">Owner: {firstName(people.get(project.ownerId)?.name ?? "")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
