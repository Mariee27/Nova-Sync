import type { Task, TaskStatus } from "@/lib/types";

export interface ProgressSummary {
  total: number;
  done: number;
  remaining: number;
  /** Whole-number percentage, 0–100. A project with no tasks is 0%. */
  percentage: number;
  byStatus: Record<TaskStatus, number>;
}

/**
 * Project completion is derived purely from task state: done / total.
 * We intentionally keep it simple and explainable ("9 of 12 tasks done")
 * instead of weighting in-progress work, so the number is never surprising.
 */
export function computeProgress(tasks: Pick<Task, "status">[]): ProgressSummary {
  const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  for (const t of tasks) byStatus[t.status] += 1;
  const total = tasks.length;
  const done = byStatus.done;
  return {
    total,
    done,
    remaining: total - done,
    // Never round an unfinished project up to 100%.
    percentage: total === 0 ? 0 : Math.min(done < total ? 99 : 100, Math.round((done / total) * 100)),
    byStatus,
  };
}

export function isOverdue(task: Pick<Task, "status" | "dueDate">, now = new Date()): boolean {
  return task.status !== "done" && !!task.dueDate && new Date(task.dueDate) < now;
}

/** Subtask completion for a single task, used on cards. */
export function subtaskProgress(subtasks: { done: boolean }[]) {
  const done = subtasks.filter((s) => s.done).length;
  return { done, total: subtasks.length };
}
