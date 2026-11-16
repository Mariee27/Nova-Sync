import { differenceInCalendarDays } from "date-fns";
import type { ActivityEvent, Project, Task } from "@/lib/types";
import { computeProgress, isOverdue } from "./progress";

export type HealthLevel = "on_track" | "at_risk" | "critical" | "completed";

export interface HealthReason {
  label: string;
  impact: "positive" | "negative" | "neutral";
}

export interface ProjectHealth {
  level: HealthLevel;
  /** 0–100, higher is healthier. */
  score: number;
  reasons: HealthReason[];
}

export const HEALTH_LABEL: Record<HealthLevel, string> = {
  on_track: "On track",
  at_risk: "At risk",
  critical: "Needs attention",
  completed: "Completed",
};

/**
 * Transparent project-health model. Starts at 100 and subtracts points for
 * concrete, explainable signals. Every deduction adds a human-readable reason.
 */
export function computeHealth(
  project: Pick<Project, "deadline" | "createdAt" | "status">,
  tasks: Task[],
  activity: Pick<ActivityEvent, "createdAt">[],
  now = new Date(),
): ProjectHealth {
  const progress = computeProgress(tasks);
  const reasons: HealthReason[] = [];

  if (project.status === "completed" || (progress.total > 0 && progress.remaining === 0)) {
    return {
      level: "completed",
      score: 100,
      reasons: [{ label: `All ${progress.total} tasks are done`, impact: "positive" }],
    };
  }

  let score = 100;
  const daysLeft = differenceInCalendarDays(new Date(project.deadline), now);
  const overdue = tasks.filter((t) => isOverdue(t, now));

  // 1. Overdue work
  if (overdue.length > 0) {
    score -= Math.min(36, overdue.length * 12);
    reasons.push({
      label: `${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"}`,
      impact: "negative",
    });
  } else if (progress.total > 0) {
    reasons.push({ label: "No overdue tasks", impact: "positive" });
  }

  // 2. Deadline proximity vs. remaining work
  if (daysLeft < 0) {
    score -= 40;
    reasons.push({ label: `Deadline passed ${-daysLeft} days ago`, impact: "negative" });
  } else if (daysLeft <= 3 && progress.remaining > 0) {
    score -= Math.min(25, progress.remaining * 5);
    reasons.push({
      label: `${progress.remaining} tasks left with ${daysLeft === 0 ? "the deadline today" : `${daysLeft} days to go`}`,
      impact: "negative",
    });
  } else {
    reasons.push({ label: `${daysLeft} days until the deadline`, impact: "neutral" });
  }

  // 3. Pace: progress compared with time elapsed
  const start = new Date(project.createdAt).getTime();
  const end = new Date(project.deadline).getTime();
  if (end > start && progress.total > 0) {
    const elapsed = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
    const gap = Math.round(elapsed * 100 - progress.percentage);
    if (gap > 15) {
      score -= Math.min(30, Math.round(gap * 0.6));
      reasons.push({
        label: `${progress.percentage}% done with ${Math.round(elapsed * 100)}% of the time used`,
        impact: "negative",
      });
    } else if (gap < -5) {
      reasons.push({ label: "Ahead of schedule", impact: "positive" });
    } else {
      reasons.push({ label: "Progress is keeping pace with time", impact: "positive" });
    }
  } else if (progress.total === 0) {
    score -= 10;
    reasons.push({ label: "No tasks planned yet", impact: "negative" });
  }

  // 4. Team activity
  const last = activity.reduce<number>(
    (max, a) => Math.max(max, new Date(a.createdAt).getTime()),
    0,
  );
  if (last === 0) {
    reasons.push({ label: "No team activity yet", impact: "neutral" });
  } else {
    const quietDays = differenceInCalendarDays(now, new Date(last));
    if (quietDays >= 5) {
      score -= 15;
      reasons.push({ label: `No team activity in ${quietDays} days`, impact: "negative" });
    } else {
      reasons.push({ label: "Team is active this week", impact: "positive" });
    }
  }

  score = Math.max(0, Math.min(100, score));
  const level: HealthLevel = score >= 70 ? "on_track" : score >= 45 ? "at_risk" : "critical";
  return { level, score, reasons };
}
