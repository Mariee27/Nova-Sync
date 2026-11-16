"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Crosshair,
  Flag,
  FolderKanban,
  MapPin,
  Target,
} from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarStack } from "@/components/ui/avatar";
import { ActivityItem } from "@/components/shared/activity-item";
import { EmptyState } from "@/components/shared/empty-state";
import { InsightCard } from "@/components/shared/insight-card";
import { ProgressRing } from "@/components/shared/progress-ring";
import { ProjectCard } from "@/components/shared/project-card";
import { TaskRow } from "@/components/shared/task-row";
import { useInsights, useLookups, useNow } from "@/lib/hooks";
import { computeProgress, isOverdue } from "@/lib/selectors/progress";
import {
  activityForUser,
  completionSeries,
  myOpenTasks,
  projectMembers,
  projectsForUser,
  tasksDueThisWeek,
  upcomingDeadlines,
  upcomingMeetings,
} from "@/lib/selectors/workspace";
import { relativeDay } from "@/lib/dates";
import { cn, firstName } from "@/lib/utils";
import { StatCard } from "./stat-card";
import { ProductivityChart } from "./productivity-chart";

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function DashboardView() {
  const { ws, me } = useReadyWorkspace();
  const ui = useUI();
  const now = useNow();
  const { people, projects: projectMap } = useLookups();
  const insights = useInsights();

  const projects = projectsForUser(ws, me.id);
  const active = projects.filter((p) => p.status !== "completed");
  const activeIds = new Set(active.map((p) => p.id));
  const activeTasks = ws.tasks.filter((t) => activeIds.has(t.projectId));
  const overall = computeProgress(activeTasks);
  const dueWeek = tasksDueThisWeek(ws, me.id, now);
  const overdueCount = dueWeek.filter((t) => isOverdue(t, now)).length;
  const meetings = upcomingMeetings(ws, me.id, now);
  const nextMeeting = meetings[0];
  const myTasks = myOpenTasks(ws, me.id, now);
  const teamDue = dueWeek.filter((t) => t.assigneeId !== me.id);
  const deadlines = upcomingDeadlines(ws, me.id, now, 21).slice(0, 4);
  const activity = activityForUser(ws, me.id, 8);
  const series = completionSeries(ws, { userId: me.id, projectIds: new Set(projects.map((p) => p.id)), days: 7 }, now);
  const myWeek = series.reduce((s, d) => s + d.mine, 0);
  const teamWeek = series.reduce((s, d) => s + d.completed, 0);
  const urgentInsights = insights.filter((i) => i.severity !== "positive" && i.severity !== "low").length;

  if (projects.length === 0)
    return (
      <div className="space-y-8">
        <Header now={now} name={firstName(me.name)} subtitle="Let's set up your first group project." />
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a workspace for your group, or join one with an invite code from a teammate."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => ui.open({ kind: "project" })}>Create project</Button>
              <Button variant="outline" asChild>
                <Link href="/projects?join=1">Join with a code</Link>
              </Button>
            </div>
          }
        />
      </div>
    );

  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        now={now}
        name={firstName(me.name)}
        subtitle={
          urgentInsights > 0
            ? `Here's what's happening across your projects. ${urgentInsights} ${urgentInsights === 1 ? "thing needs" : "things need"} your attention.`
            : "Here's what's happening across your projects. Everything is on track."
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/focus">
                <Crosshair /> Focus Mode
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/meetings/new">
                <CalendarRange /> Find a meeting time
              </Link>
            </Button>
          </>
        }
      />

      {/* Key numbers */}
      <motion.div initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          <StatCard key="a" icon={FolderKanban} label="Active projects" value={active.length} href="/projects" sub={`${ws.members.filter((m) => activeIds.has(m.projectId) && m.userId !== me.id).length} teammate seats across groups`}>
            <AvatarStack people={[...new Map(active.flatMap((p) => projectMembers(ws, p.id)).map((p) => [p.id, p])).values()]} max={3} size="xs" />
          </StatCard>,
          <StatCard key="b" icon={CalendarClock} tone="amber" label="Tasks due this week" value={dueWeek.length} href="/tasks?view=week" sub={overdueCount ? <span className="text-rose-600">{overdueCount} overdue · act today</span> : "Nothing overdue"} />,
          <StatCard key="c" icon={CalendarRange} tone="violet" label="Upcoming meetings" value={meetings.length} href="/meetings" sub={nextMeeting ? `Next: ${relativeDay(nextMeeting.confirmedStart!, now)} ${format(new Date(nextMeeting.confirmedStart!), "HH:mm")} · ${nextMeeting.title}` : "No meetings scheduled"} />,
          <StatCard key="d" icon={Target} tone="emerald" label="Overall progress" value={`${overall.percentage}%`} href="/projects" sub={`${overall.done} of ${overall.total} tasks done`}>
            <ProgressRing value={overall.percentage} size={30} stroke={4} color="var(--success)">
              <span />
            </ProgressRing>
          </StatCard>,
        ].map((el, i) => (
          <motion.div key={i} custom={i} variants={fadeUp} className="h-full">
            {el}
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1.35fr_1fr]">
        {/* Sync Intelligence preview */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-gradient opacity-[0.07] blur-3xl" aria-hidden />
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
                <BrainCircuit className="size-4" />
              </span>
              <div>
                <CardTitle>Sync Intelligence</CardTitle>
                <p className="text-[12px] text-muted-foreground">{insights.length} insights from your live workspace data</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/intelligence">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            {insights.slice(0, 3).map((i) => (
              <InsightCard key={i.id} insight={i} compact projectLabel={i.projectId ? projectMap.get(i.projectId)?.name : "Personal"} />
            ))}
            {insights.length === 0 && (
              <EmptyState compact icon={CheckCircle2} title="All clear" description="No risks detected. Keep the momentum going." />
            )}
          </CardContent>
        </Card>

        {/* Priority tasks */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Your priority tasks</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Sorted by overdue, deadline and priority</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks">
                All tasks <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-3">
            {myTasks.slice(0, 6).map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
            {myTasks.length === 0 && (
              <EmptyState compact icon={CheckCircle2} title="Inbox zero" description="Nothing assigned to you right now." />
            )}
            {teamDue.length > 0 && (
              <div className="pt-4">
                <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Also due for your teams this week</p>
                {teamDue.slice(0, Math.max(2, 6 - myTasks.length)).map((t) => (
                  <TaskRow key={t.id} task={t} showAssignee />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <section aria-labelledby="projects-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="projects-heading" className="text-[15px] font-semibold tracking-tight">Project progress</h2>
          <Link href="/projects" className="text-[13px] font-medium text-primary hover:underline">
            All projects
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-3">
        {/* Productivity */}
        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Personal productivity</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Tasks completed, last 7 days</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-2">
            <div className="mb-3 flex gap-6">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{myWeek}</p>
                <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className="size-2 rounded-full bg-[#8B5CF6]" /> by you
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{teamWeek}</p>
                <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className="size-2 rounded-full bg-[#2563EB]" /> by your teams
                </p>
              </div>
            </div>
            <div className="min-h-44 flex-1">
              <ProductivityChart data={series} />
            </div>
            <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-[12px] text-muted-foreground">
              Counts completed tasks only — a view of momentum, not a ranking.
            </p>
          </CardContent>
        </Card>

        {/* Meetings + deadlines */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Coming up</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Meetings and deadlines, next 3 weeks</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">
                Calendar <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pt-3">
            {meetings.slice(0, 3).map((m) => {
              const p = projectMap.get(m.projectId);
              return (
                <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60">
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-blue-500/10 py-1 text-blue-600">
                    <span className="text-[10px] font-semibold uppercase">{format(new Date(m.confirmedStart!), "EEE")}</span>
                    <span className="text-[15px] leading-tight font-semibold tabular-nums">{format(new Date(m.confirmedStart!), "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{m.title}</p>
                    <p className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground">
                      {format(new Date(m.confirmedStart!), "HH:mm")}–{format(new Date(m.confirmedEnd!), "HH:mm")}
                      {m.location && (
                        <>
                          <MapPin className="ml-1 size-3" /> {m.location}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-sm" title={p?.name}>{p?.emoji}</span>
                </Link>
              );
            })}
            {deadlines.map((d) => (
              <Link key={d.id} href={d.href} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    d.kind === "project" ? "bg-rose-500/10 text-rose-600" : d.kind === "milestone" ? "bg-emerald-500/10 text-emerald-600" : "bg-violet-500/10 text-violet-600",
                  )}
                >
                  {d.kind === "milestone" ? <Flag className="size-4" /> : <CalendarClock className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{d.title}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {d.kind === "project" ? "Project deadline" : d.kind === "milestone" ? "Milestone" : "High-priority task"} · {projectMap.get(d.projectId)?.name.split(" — ")[0]}
                  </p>
                </div>
                <span className={cn("shrink-0 text-[12px] font-medium tabular-nums", new Date(d.date) < now ? "text-rose-600" : "text-muted-foreground")}>
                  {relativeDay(d.date, now)}
                </span>
              </Link>
            ))}
            {meetings.length === 0 && deadlines.length === 0 && (
              <EmptyState compact icon={CalendarClock} title="A quiet few weeks" description="No meetings or deadlines coming up." />
            )}
          </CardContent>
        </Card>

        {/* Team activity */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Team activity</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Across all your projects</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-2">
            {activity.map((a) => (
              <ActivityItem key={a.id} event={a} people={people} project={projectMap.get(a.projectId)} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Header({
  now,
  name,
  subtitle,
  actions,
}: {
  now: Date;
  name: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[12.5px] font-medium text-muted-foreground">{format(now, "EEEE, d MMMM")}</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight sm:text-[30px]">
          {greeting(now)}, {name} <span className="inline-block origin-[70%_70%] animate-[wave_2.2s_ease-in-out_1]">👋</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
