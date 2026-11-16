"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarClock,
  CalendarRange,
  FolderX,
  KanbanSquare,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { HealthBadge } from "@/components/shared/health-badge";
import { ProjectDialog } from "@/components/app/dialogs/project-dialog";
import { computeHealth } from "@/lib/selectors/health";
import { computeProgress } from "@/lib/selectors/progress";
import { projectMembers } from "@/lib/selectors/workspace";
import type { ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./use-project";

const STATUS_TEXT: Record<ProjectStatus, string> = { active: "Active", on_hold: "On hold", completed: "Completed" };

function Countdown({ deadline, done }: { deadline: string; done: boolean }) {
  const d = differenceInCalendarDays(new Date(deadline), new Date());
  if (done) return <span className="text-emerald-600">All tasks done</span>;
  return (
    <span className={cn(d <= 3 ? "text-rose-600" : "text-foreground")}>
      {d < 0 ? `${-d} days overdue` : d === 0 ? "Due today" : `${d} ${d === 1 ? "day" : "days"} left`}
    </span>
  );
}

export function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { project, isOwner } = useCurrentProject();
  const { ws, run } = useReadyWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (!project)
    return (
      <EmptyState
        icon={FolderX}
        title="Project not found"
        description="It may have been deleted, or you're not a member of this workspace."
        action={
          <Button asChild>
            <Link href="/projects">Back to projects</Link>
          </Button>
        }
      />
    );

  const tasks = ws.tasks.filter((t) => t.projectId === project.id);
  const progress = computeProgress(tasks);
  const health = computeHealth(project, tasks, ws.activity.filter((a) => a.projectId === project.id));
  const members = projectMembers(ws, project.id);
  const base = `/projects/${project.id}`;
  const tabs = [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/tasks`, label: "Tasks", icon: KanbanSquare, count: progress.remaining },
    { href: `${base}/meetings`, label: "Meetings", icon: CalendarRange },
    { href: `${base}/team`, label: "Team", icon: Users, count: members.length },
    { href: `${base}/activity`, label: "Activity", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-soft sm:p-7">
        <div className="pointer-events-none absolute -top-24 -right-10 size-72 rounded-full opacity-[0.14] blur-3xl" style={{ background: project.color }} aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-lavender opacity-[0.07] blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-[28px] shadow-soft"
              style={{ background: `color-mix(in oklab, ${project.color} 13%, var(--card))` }}
              aria-hidden
            >
              {project.emoji}
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="font-mono">{project.courseCode || "Course"}</Badge>
                <Badge variant="secondary">{project.course}</Badge>
                <Badge variant={project.status === "active" ? "default" : project.status === "completed" ? "lavender" : "warning"}>
                  {STATUS_TEXT[project.status]}
                </Badge>
              </div>
              <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-balance sm:text-[26px]">{project.name}</h1>
              {project.description && <p className="mt-1.5 line-clamp-2 max-w-2xl text-[13.5px] text-muted-foreground">{project.description}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            <AvatarStack people={members} max={5} size="md" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Project options">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil /> Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={project.status}
                  onValueChange={(v) => run({ type: "project.update", id: project.id, patch: { status: v as ProjectStatus } }, { success: `Marked as ${STATUS_TEXT[v as ProjectStatus].toLowerCase()}` })}
                >
                  {(Object.keys(STATUS_TEXT) as ProjectStatus[]).map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {STATUS_TEXT[s]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                      <Trash2 /> Delete project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
          <div>
            <p className="text-[11.5px] font-medium text-muted-foreground">Progress</p>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="text-xl font-semibold tabular-nums">{progress.percentage}%</span>
              <Progress value={progress.percentage} className="h-1.5 max-w-28" />
            </div>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
              {progress.done} of {progress.total} tasks done
            </p>
          </div>
          <div>
            <p className="text-[11.5px] font-medium text-muted-foreground">Deadline</p>
            <p className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
              <CalendarClock className="size-4 text-muted-foreground" />
              <Countdown deadline={project.deadline} done={progress.total > 0 && progress.remaining === 0} />
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{format(new Date(project.deadline), "EEEE, d MMMM")}</p>
          </div>
          <div>
            <p className="text-[11.5px] font-medium text-muted-foreground">Project health</p>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="mt-1.5 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40" aria-label="Why this health status?">
                  <HealthBadge level={health.level} className="px-2.5 py-1 text-[12px]" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80">
                <p className="text-sm font-semibold">Health score {health.score}/100</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Based on deadline, outstanding and overdue work, pace and team activity.</p>
                <ul className="mt-3 space-y-1.5">
                  {health.reasons.map((r) => (
                    <li key={r.label} className="flex items-start gap-2 text-[13px]">
                      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", r.impact === "positive" ? "bg-emerald-500" : r.impact === "negative" ? "bg-rose-500" : "bg-slate-400")} />
                      {r.label}
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
            <p className="mt-1 text-[11.5px] text-muted-foreground">Tap to see why</p>
          </div>
          <div>
            <p className="text-[11.5px] font-medium text-muted-foreground">Team</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{members.length} members</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Invite code <span className="font-mono font-medium text-foreground">{project.inviteCode}</span>
            </p>
          </div>
        </div>
      </header>

      <nav className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Project sections">
        <div className="flex w-max gap-1 border-b sm:w-full">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 pt-1 pb-3 text-[13.5px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-4" />
                {t.label}
                {!!t.count && <span className="rounded-full bg-secondary px-1.5 text-[11px] tabular-nums">{t.count}</span>}
                {active && <motion.span layoutId="project-tab" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-gradient" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div>{children}</div>

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the workspace with its {tasks.length} tasks, meetings, milestones and activity for every member. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              destructive
              onClick={async () => {
                const r = await run({ type: "project.delete", id: project.id }, { success: "Project deleted" });
                if (r) router.replace("/projects");
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
