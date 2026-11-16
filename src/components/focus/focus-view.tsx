"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Crosshair, ExternalLink, Pause, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { DueLabel, PriorityTag, StatusPill } from "@/components/shared/task-meta";
import { myOpenTasks } from "@/lib/selectors/workspace";
import { isOverdue, subtaskProgress } from "@/lib/selectors/progress";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const SESSION_MIN = 25;

function useTimer() {
  const [left, setLeft] = React.useState(SESSION_MIN * 60);
  const [running, setRunning] = React.useState(false);
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);
  return {
    left,
    running,
    toggle: () => setRunning((r) => (left === 0 ? false : !r)),
    reset: () => {
      setRunning(false);
      setLeft(SESSION_MIN * 60);
    },
  };
}

/** Why this task is first: mirrors sortTasksByUrgency. */
function reasonFor(t: Task, now: Date) {
  if (isOverdue(t, now)) return "It's overdue, so it comes first.";
  if (t.dueDate) return `It has the nearest due date among your open tasks${t.priority === "urgent" || t.priority === "high" ? " and high priority" : ""}.`;
  return "It's your highest-priority task without a due date.";
}

export function FocusView() {
  const { ws, me, run } = useReadyWorkspace();
  const now = new Date();
  const queue = myOpenTasks(ws, me.id, now);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [draft, setDraft] = React.useState("");
  const timer = useTimer();

  const ordered = [...queue.filter((t) => !skipped.includes(t.id)), ...queue.filter((t) => skipped.includes(t.id))];
  const task = ordered[0];
  const upNext = ordered.slice(1, 4);

  if (!task) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <EmptyState
          icon={CheckCircle2}
          title="Nothing left on your plate"
          description="You have no open tasks assigned to you. Pick something up from a project board, or enjoy the break."
          action={
            <Button asChild variant="outline">
              <Link href="/tasks?view=team">Browse open team tasks</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const project = ws.projects.find((p) => p.id === task.projectId);
  const subtasks = ws.subtasks.filter((s) => s.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sub = subtaskProgress(subtasks);
  const mm = String(Math.floor(timer.left / 60)).padStart(2, "0");
  const ss = String(timer.left % 60).padStart(2, "0");

  const complete = async () => {
    const r = await run({ type: "task.update", id: task.id, patch: { status: "done" } }, { success: `Completed “${task.title}”` });
    if (r) setSkipped((s) => s.filter((id) => id !== task.id));
  };

  const addSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const r = await run({ type: "subtask.add", taskId: task.id, title: draft.trim() });
    if (r) setDraft("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
          <Crosshair className="size-3.5" /> Focus Mode
        </span>
        <span className="text-[12.5px] text-muted-foreground tabular-nums">
          {queue.length} open {queue.length === 1 ? "task" : "tasks"} assigned to you
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={task.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-lift sm:p-8"
          aria-labelledby="focus-title"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand-gradient opacity-10 blur-3xl" aria-hidden />
          <p className="text-[12px] font-medium text-muted-foreground">
            {project?.emoji} {project?.name}
          </p>
          <h1 id="focus-title" className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {task.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PriorityTag priority={task.priority} />
            <StatusPill status={task.status} />
            {task.dueDate && <DueLabel date={task.dueDate} />}
          </div>
          <p className="mt-3 text-[12.5px] text-muted-foreground">Why this one: {reasonFor(task, now)}</p>
          {task.description && <p className="mt-4 text-[14px] leading-relaxed whitespace-pre-line text-foreground/85">{task.description}</p>}

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Steps</h2>
              {sub.total > 0 && (
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {sub.done}/{sub.total}
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {subtasks.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary/60">
                    <Checkbox checked={s.done} onCheckedChange={() => run({ type: "subtask.toggle", id: s.id })} />
                    <span className={cn("text-[13.5px]", s.done && "text-muted-foreground line-through")}>{s.title}</span>
                  </label>
                </li>
              ))}
            </ul>
            <form onSubmit={addSubtask} className="mt-2 flex gap-2">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Break it down: add a step" aria-label="New step" />
              <Button type="submit" variant="outline" size="icon" disabled={!draft.trim()} aria-label="Add step">
                <Plus />
              </Button>
            </form>
          </div>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" variant="brand" onClick={complete} className="sm:flex-1">
              <CheckCircle2 /> Mark complete
            </Button>
            <Button size="lg" variant="outline" onClick={() => setSkipped((s) => [...s.filter((id) => id !== task.id), task.id])} disabled={ordered.length < 2}>
              <SkipForward /> Not now
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href={`/projects/${task.projectId}/tasks?task=${task.id}`}>
                <ExternalLink /> Open task
              </Link>
            </Button>
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border bg-card p-5 text-center shadow-soft">
          <p className="text-[12px] font-medium text-muted-foreground">Focus session</p>
          <p className="mt-1 font-mono text-4xl font-semibold tabular-nums" aria-live="off">
            {mm}:{ss}
          </p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">{timer.left === 0 ? "Session done. Take a short break." : `${SESSION_MIN}-minute block`}</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" onClick={timer.toggle} disabled={timer.left === 0}>
              {timer.running ? <Pause /> : <Play />} {timer.running ? "Pause" : "Start"}
            </Button>
            <Button size="sm" variant="ghost" onClick={timer.reset} aria-label="Reset timer">
              <RotateCcw />
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <p className="text-[12px] font-medium text-muted-foreground">Up next</p>
          {upNext.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">This is your last open task.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {upNext.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[13.5px]">{t.title}</span>
                  {t.dueDate ? <DueLabel date={t.dueDate} /> : <PriorityTag priority={t.priority} compact />}
                </li>
              ))}
            </ul>
          )}
          <Link href="/tasks" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
            All my tasks <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
