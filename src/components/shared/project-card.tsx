"use client";

import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "./progress-ring";
import { HealthBadge, HEALTH_COLOR } from "./health-badge";
import { computeHealth } from "@/lib/selectors/health";
import { computeProgress } from "@/lib/selectors/progress";
import { projectMembers } from "@/lib/selectors/workspace";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function deadlineLabel(iso: string, now = new Date()) {
  const d = differenceInCalendarDays(new Date(iso), now);
  if (d < 0) return `${-d}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `${d} days left`;
}

export function ProjectCard({ project, className }: { project: Project; className?: string }) {
  const { ws } = useReadyWorkspace();
  const tasks = ws.tasks.filter((t) => t.projectId === project.id);
  const progress = computeProgress(tasks);
  const health = computeHealth(project, tasks, ws.activity.filter((a) => a.projectId === project.id));
  const members = projectMembers(ws, project.id);
  const days = differenceInCalendarDays(new Date(project.deadline), new Date());
  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition-all duration-200 outline-none hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-20"
        style={{ background: project.color }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg" aria-hidden>{project.emoji}</span>
            <Badge variant="outline" className="font-mono text-[10.5px]">{project.courseCode || project.course}</Badge>
          </div>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">{project.name}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{project.course}</p>
        </div>
        <ProgressRing value={progress.percentage} size={54} stroke={5} color={project.color} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <HealthBadge level={health.level} />
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[12px] font-medium tabular-nums",
            days <= 3 && progress.remaining > 0 ? "text-rose-600" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="size-3.5" />
          {project.status === "completed" || (progress.remaining === 0 && progress.total > 0) ? "Completed" : deadlineLabel(project.deadline)}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-3.5">
        <AvatarStack people={members} max={4} size="md" />
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {progress.done}/{progress.total} tasks
        </span>
      </div>
      <span className="sr-only">Health score {health.score}, color {HEALTH_COLOR[health.level]}</span>
    </Link>
  );
}
