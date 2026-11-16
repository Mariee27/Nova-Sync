"use client";

import * as React from "react";
import { BrainCircuit, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { PageHeader } from "@/components/shared/page-header";
import { InsightCard, SEVERITY_STYLE } from "@/components/shared/insight-card";
import { EmptyState } from "@/components/shared/empty-state";
import { HealthBadge } from "@/components/shared/health-badge";
import { useInsights } from "@/lib/hooks";
import { SEVERITY_LABEL, STALL_DAYS, type InsightSeverity } from "@/lib/intelligence/engine";
import { computeHealth } from "@/lib/selectors/health";
import { projectsForUser } from "@/lib/selectors/workspace";
import { cn } from "@/lib/utils";

const FILTERS: (InsightSeverity | "all")[] = ["all", "critical", "high", "medium", "low", "positive"];

const RULES: { name: string; text: string }[] = [
  { name: "Deadline pressure", text: "A project deadline is within 7 days and tasks are still open. Critical within 3 days, or when more than 1.5 tasks per day remain." },
  { name: "Overdue work", text: "Any open task whose due date has passed. High when an overdue task is High or Urgent priority." },
  { name: "Workload balance", text: "One teammate holds at least 1.75× the team average of open tasks, and 3 or more than the lightest load." },
  { name: "Stalled project", text: `No task in an active project was created, moved, completed or commented on for ${STALL_DAYS} days or more.` },
  { name: "Milestones", text: "An unfinished milestone is due within 5 days, or one was just completed." },
  { name: "Unassigned priority", text: "High or urgent tasks that nobody owns yet." },
  { name: "Scheduling", text: "A meeting poll is waiting for your availability, and the matcher's current best slot for every open poll." },
  { name: "Your next 48 hours", text: "Tasks assigned to you that are due in the next two days." },
  { name: "Momentum", text: "A project has passed 75% completion. Positive signals are shown too, not only warnings." },
];

export function IntelligenceView() {
  const { ws, me } = useReadyWorkspace();
  const insights = useInsights();
  const [filter, setFilter] = React.useState<InsightSeverity | "all">("all");
  const [project, setProject] = React.useState<string>("all");
  const projects = projectsForUser(ws, me.id);
  const now = new Date();

  const shown = insights.filter((i) => (filter === "all" || i.severity === filter) && (project === "all" || i.projectId === project));
  const counts = Object.fromEntries(FILTERS.map((f) => [f, insights.filter((i) => f === "all" || i.severity === f).length]));
  const projectName = (id?: string) => ws.projects.find((p) => p.id === id)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender/10 px-2.5 py-1 text-[11.5px] font-semibold text-lavender">
            <BrainCircuit className="size-3.5" /> Rule-based, fully explainable
          </span>
        }
        title="Sync Intelligence"
        description="NOVA SYNC reads your tasks, deadlines, workload and meeting polls and points out what needs attention. Every insight shows the rule that produced it and the data it used."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {projects.map((p) => {
          const h = computeHealth(p, ws.tasks.filter((t) => t.projectId === p.id), ws.activity.filter((a) => a.projectId === p.id), now);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setProject((cur) => (cur === p.id ? "all" : p.id))}
              aria-pressed={project === p.id}
              className={cn(
                "min-w-0 cursor-pointer rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:shadow-lift",
                project === p.id && "border-primary ring-2 ring-primary/15",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[13.5px] font-semibold">
                  {p.emoji} {p.name}
                </span>
                <HealthBadge level={h.level} />
              </div>
              <p className="mt-2 line-clamp-2 text-[12.5px] text-muted-foreground">{(h.reasons.find((r) => r.impact === "negative") ?? h.reasons[0])?.label ?? "No issues detected."}</p>
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by severity">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition",
              filter === f ? "border-navy bg-navy text-white dark:border-white dark:bg-white dark:text-navy" : "bg-card hover:border-foreground/20",
            )}
          >
            {f !== "all" && <span className={cn("size-1.5 rounded-full", SEVERITY_STYLE[f].bar)} />}
            {f === "all" ? "All" : SEVERITY_LABEL[f]}
            <span className="tabular-nums opacity-60">{counts[f]}</span>
          </button>
        ))}
        {project !== "all" && (
          <button type="button" onClick={() => setProject("all")} className="shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] text-primary hover:underline">
            Clear project filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {shown.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={insights.length === 0 ? "Everything looks in sync" : "Nothing matches this filter"}
              description={insights.length === 0 ? "No rule fired for your projects right now. Insights update instantly as work changes." : "Try another severity or project."}
            />
          ) : (
            shown.map((i) => <InsightCard key={i.id} insight={i} projectLabel={projectName(i.projectId)} />)
          )}
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border bg-card p-5 shadow-soft lg:sticky lg:top-20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="text-[14px] font-semibold">How it works</h2>
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            There is no black box here. Insights come from transparent rules that run in your browser over your workspace data. Nothing is sent to an AI model.
          </p>
          <ul className="space-y-3">
            {RULES.map((r) => (
              <li key={r.name} className="text-[12.5px]">
                <p className="font-medium">{r.name}</p>
                <p className="mt-0.5 leading-relaxed text-muted-foreground">{r.text}</p>
              </li>
            ))}
          </ul>
          <p className="flex gap-1.5 rounded-xl bg-secondary/60 p-3 text-[12px] text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Complete a task, move a deadline or answer a poll and the list recalculates immediately.
          </p>
        </aside>
      </div>
    </div>
  );
}
