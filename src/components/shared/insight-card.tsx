"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  CalendarCheck,
  ChevronDown,
  Flag,
  Hourglass,
  PartyPopper,
  Scale,
  Target,
  TrendingUp,
  UserX,
} from "lucide-react";
import type { Insight, InsightKind, InsightSeverity } from "@/lib/intelligence/engine";
import { SEVERITY_LABEL } from "@/lib/intelligence/engine";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<InsightKind, typeof Target> = {
  deadline: AlarmClock,
  overdue: Hourglass,
  workload: Scale,
  scheduling: CalendarCheck,
  stalled: TrendingUp,
  milestone: Flag,
  progress: PartyPopper,
  unassigned: UserX,
  personal: Target,
};

export const SEVERITY_STYLE: Record<InsightSeverity, { chip: string; icon: string; bar: string }> = {
  critical: { chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: "bg-rose-500/10 text-rose-600", bar: "bg-rose-500" },
  high: { chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300", icon: "bg-amber-500/12 text-amber-600", bar: "bg-amber-500" },
  medium: { chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300", icon: "bg-blue-500/10 text-blue-600", bar: "bg-blue-500" },
  low: { chip: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: "bg-slate-500/10 text-slate-500", bar: "bg-slate-400" },
  positive: { chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: "bg-emerald-500/10 text-emerald-600", bar: "bg-emerald-500" },
};

export function InsightCard({
  insight,
  projectLabel,
  compact,
  className,
}: {
  insight: Insight;
  projectLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const Icon = KIND_ICON[insight.kind];
  const s = SEVERITY_STYLE[insight.severity];
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lift", className)}>
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", s.bar)} aria-hidden />
      <div className={cn("flex gap-3.5", compact ? "p-4" : "p-5")}>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", s.icon)}>
          <Icon className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider", s.chip)}>
              {SEVERITY_LABEL[insight.severity]}
            </span>
            {projectLabel && <span className="truncate text-[11px] text-muted-foreground">{projectLabel}</span>}
          </div>
          <p className={cn("font-semibold leading-snug tracking-tight text-balance", compact ? "text-[13.5px]" : "text-[15px]")}>
            {insight.title}
          </p>
          {!compact && <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{insight.context}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={insight.action.href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-navy/85 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none dark:bg-white dark:text-navy"
            >
              {insight.action.label}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!compact && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                Why am I seeing this?
                <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-xl border bg-secondary/50 p-3 text-[12.5px]">
                  <p className="font-medium">Rule</p>
                  <p className="mt-0.5 text-muted-foreground">{insight.rule}</p>
                  {insight.evidence.length > 0 && (
                    <>
                      <p className="mt-2.5 font-medium">Based on</p>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {insight.evidence.map((e) => (
                          <li key={e} className="flex gap-1.5">
                            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
