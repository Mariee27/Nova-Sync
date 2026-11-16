import { AlertTriangle, ArrowDown, ArrowUp, CalendarClock, ChevronsUp, Equal } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PRIORITY_STYLE: Record<TaskPriority, { dot: string; text: string; icon: typeof ArrowUp }> = {
  urgent: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-300", icon: ChevronsUp },
  high: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-300", icon: ArrowUp },
  medium: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-300", icon: Equal },
  low: { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400", icon: ArrowDown },
};

export const STATUS_STYLE: Record<TaskStatus, { dot: string; ring: string; bg: string }> = {
  todo: { dot: "bg-slate-400", ring: "ring-slate-300", bg: "bg-slate-50 dark:bg-slate-500/10" },
  in_progress: { dot: "bg-blue-500", ring: "ring-blue-300", bg: "bg-blue-50/70 dark:bg-blue-500/10" },
  in_review: { dot: "bg-violet-500", ring: "ring-violet-300", bg: "bg-violet-50/70 dark:bg-violet-500/10" },
  done: { dot: "bg-emerald-500", ring: "ring-emerald-300", bg: "bg-emerald-50/70 dark:bg-emerald-500/10" },
};

export function PriorityTag({ priority, className, compact }: { priority: TaskPriority; className?: string; compact?: boolean }) {
  const s = PRIORITY_STYLE[priority];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", s.text, className)} title={`${PRIORITY_LABEL[priority]} priority`}>
      <Icon className="size-3.5" strokeWidth={2.4} />
      {!compact && PRIORITY_LABEL[priority]}
    </span>
  );
}

export function StatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground", className)}>
      <span className={cn("size-1.5 rounded-full", STATUS_STYLE[status].dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DueLabel({
  date,
  done,
  className,
  now = new Date(),
}: {
  date: string | null;
  done?: boolean;
  className?: string;
  now?: Date;
}) {
  if (!date) return null;
  const d = new Date(date);
  const diff = differenceInCalendarDays(d, now);
  const overdue = !done && d < now;
  const soon = !done && !overdue && diff <= 2;
  const text =
    diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : Math.abs(diff) < 7 ? format(d, "EEE") : format(d, "d MMM");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        overdue
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
          : soon
            ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
            : "bg-secondary text-muted-foreground",
        done && "line-through opacity-70",
        className,
      )}
      title={format(d, "EEEE, d MMMM yyyy")}
    >
      {overdue ? <AlertTriangle className="size-3" /> : <CalendarClock className="size-3" />}
      {overdue ? `Overdue · ${text}` : text}
    </span>
  );
}
