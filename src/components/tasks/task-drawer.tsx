"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Flag, MessageSquare, Plus, Send, Trash2, UserRound, X } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_STYLE, STATUS_STYLE } from "@/components/shared/task-meta";
import { dateInputToIso, isoToDateInput } from "@/components/app/dialogs/form-field";
import { describeActivity } from "@/components/shared/activity-item";
import { useLookups } from "@/lib/hooks";
import type { TaskInput } from "@/lib/data/commands";
import { isOverdue } from "@/lib/selectors/progress";
import { projectMembers } from "@/lib/selectors/workspace";
import { timeAgo } from "@/lib/dates";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";

function Row({ icon: Icon, label, children }: { icon: typeof Flag; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2 py-1">
      <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { ws, me, run } = useReadyWorkspace();
  const { people } = useLookups();
  const task = taskId ? ws.tasks.find((t) => t.id === taskId) : undefined;
  const [title, setTitle] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [newSub, setNewSub] = React.useState("");
  const [comment, setComment] = React.useState("");

  // Reset local drafts only when switching tasks.
  const [draftFor, setDraftFor] = React.useState<string | undefined>(undefined);
  if (task && draftFor !== task.id) {
    setDraftFor(task.id);
    setTitle(task.title);
    setDesc(task.description);
  }

  const open = !!taskId;
  const members = task ? projectMembers(ws, task.projectId) : [];
  const milestones = task ? ws.milestones.filter((m) => m.projectId === task.projectId) : [];
  const subtasks = task ? ws.subtasks.filter((s) => s.taskId === task.id) : [];
  const comments = task ? ws.comments.filter((c) => c.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [];
  const history = task ? ws.activity.filter((a) => a.meta.taskId === task.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6) : [];
  const project = task ? ws.projects.find((p) => p.id === task.projectId) : undefined;
  const subDone = subtasks.filter((s) => s.done).length;

  const update = (patch: Partial<TaskInput>, success?: string) =>
    task ? run({ type: "task.update", id: task.id, patch }, { success }) : Promise.resolve(null);

  const saveTitle = () => {
    if (!task) return;
    const t = title.trim();
    if (t.length < 2) {
      setTitle(task.title);
      return;
    }
    if (t !== task.title) void update({ title: t });
  };
  const saveDesc = () => {
    if (task && desc.trim() !== task.description) void update({ description: desc.trim() }, "Description saved");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
        {!task ? (
          <div className="p-8">
            <SheetTitle>Task not found</SheetTitle>
            <SheetDescription className="mt-1">It may have been deleted.</SheetDescription>
          </div>
        ) : (
          <div className="flex min-h-full flex-col">
            <div className={cn("border-b px-6 pt-6 pb-4", STATUS_STYLE[task.status].bg)}>
              <p className="mb-2 flex items-center gap-1.5 pr-8 text-[12px] text-muted-foreground">
                <span>{project?.emoji}</span>
                <span className="truncate">{project?.name}</span>
              </p>
              <SheetTitle className="sr-only">{task.title}</SheetTitle>
              <SheetDescription className="sr-only">Task details, subtasks and comments</SheetDescription>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).blur();
                  }
                }}
                rows={1}
                aria-label="Task title"
                className="field-sizing-content w-full resize-none bg-transparent text-xl leading-snug font-semibold tracking-tight outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => s !== task.status && update({ status: s }, s === "done" ? `Completed “${task.title}” 🎉` : `Moved to ${STATUS_LABEL[s]}`)}
                    aria-pressed={task.status === s}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition",
                      task.status === s ? "border-foreground/15 bg-card text-foreground shadow-soft" : "border-transparent text-muted-foreground hover:bg-card/70",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", STATUS_STYLE[s].dot)} />
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-6 px-6 py-5">
              <div>
                <Row icon={UserRound} label="Assignee">
                  <Select value={task.assigneeId ?? "none"} onValueChange={(v) => update({ assigneeId: v === "none" ? null : v }, v === "none" ? "Unassigned" : `Assigned to ${firstName(people.get(v)?.name ?? "")}`)}>
                    <SelectTrigger className="h-8" aria-label="Assignee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <Avatar person={m} size="xs" /> {m.name}
                          {m.id === me.id ? " (you)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row icon={Flag} label="Priority">
                  <Select value={task.priority} onValueChange={(v) => update({ priority: v as TaskPriority })}>
                    <SelectTrigger className="h-8" aria-label="Priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className={cn("size-2 rounded-full", PRIORITY_STYLE[p].dot)} /> {PRIORITY_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row icon={CalendarDays} label="Due date">
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      className={cn("h-8", isOverdue(task) && "border-rose-300 text-rose-600")}
                      value={isoToDateInput(task.dueDate)}
                      onChange={(e) => update({ dueDate: e.target.value ? dateInputToIso(e.target.value) : null })}
                      aria-label="Due date"
                    />
                    {task.dueDate && (
                      <Button variant="ghost" size="icon-xs" aria-label="Clear due date" onClick={() => update({ dueDate: null })}>
                        <X />
                      </Button>
                    )}
                  </div>
                </Row>
                {milestones.length > 0 && (
                  <Row icon={CheckCircle2} label="Milestone">
                    <Select value={task.milestoneId ?? "none"} onValueChange={(v) => update({ milestoneId: v === "none" ? null : v })}>
                      <SelectTrigger className="h-8" aria-label="Milestone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {milestones.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Row>
                )}
              </div>

              <section>
                <h3 className="mb-2 text-[13px] font-semibold">Description</h3>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onBlur={saveDesc}
                  rows={4}
                  placeholder="Add context, links, or what 'done' looks like…"
                  aria-label="Task description"
                />
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold">Subtasks</h3>
                  {subtasks.length > 0 && (
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {subDone}/{subtasks.length} done
                    </span>
                  )}
                </div>
                {subtasks.length > 0 && <Progress value={(subDone / subtasks.length) * 100} className="mb-2" indicatorClassName="bg-emerald-500 bg-none" />}
                <ul className="space-y-0.5">
                  {subtasks.map((s) => (
                    <li key={s.id} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-secondary/60">
                      <Checkbox checked={s.done} onCheckedChange={() => run({ type: "subtask.toggle", id: s.id })} aria-label={`Toggle ${s.title}`} />
                      <span className={cn("flex-1 text-[13.5px]", s.done && "text-muted-foreground line-through")}>{s.title}</span>
                      <button
                        type="button"
                        onClick={() => run({ type: "subtask.delete", id: s.id })}
                        className="cursor-pointer rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                        aria-label={`Delete subtask ${s.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-1.5 flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newSub.trim()) return;
                    const r = await run({ type: "subtask.add", taskId: task.id, title: newSub });
                    if (r) setNewSub("");
                  }}
                >
                  <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a subtask" className="h-8" aria-label="New subtask" />
                  <Button type="submit" variant="outline" size="sm" disabled={!newSub.trim()}>
                    <Plus /> Add
                  </Button>
                </form>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                  <MessageSquare className="size-4" /> Comments <span className="font-normal text-muted-foreground">{comments.length}</span>
                </h3>
                <div className="space-y-3">
                  {comments.map((c) => {
                    const a = people.get(c.authorId);
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        {a && <Avatar person={a} size="sm" className="mt-0.5" />}
                        <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-secondary/70 px-3 py-2">
                          <p className="text-[12px]">
                            <span className="font-semibold">{a?.name ?? "Someone"}</span>{" "}
                            <span className="text-muted-foreground">· {timeAgo(c.createdAt)}</span>
                          </p>
                          <p className="mt-0.5 text-[13.5px] whitespace-pre-wrap">{c.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form
                  className="mt-3 flex gap-2.5"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!comment.trim()) return;
                    const r = await run({ type: "comment.add", taskId: task.id, body: comment });
                    if (r) setComment("");
                  }}
                >
                  <Avatar person={me} size="sm" className="mt-1.5" />
                  <div className="flex-1">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      placeholder="Write a comment…"
                      aria-label="New comment"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          (e.currentTarget.form as HTMLFormElement).requestSubmit();
                        }
                      }}
                    />
                    <div className="mt-1.5 flex justify-end">
                      <Button type="submit" size="sm" disabled={!comment.trim()}>
                        <Send /> Comment
                      </Button>
                    </div>
                  </div>
                </form>
              </section>

              {history.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[13px] font-semibold">History</h3>
                  <ul className="space-y-1.5 border-l pl-3">
                    {history.map((h) => {
                      const d = describeActivity(h, people) as { verb: string };
                      return (
                        <li key={h.id} className="text-[12px] text-muted-foreground">
                          <span className="font-medium text-foreground">{firstName(people.get(h.actorId)?.name ?? "")}</span> {d.verb} · {timeAgo(h.createdAt)}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>

            <footer className="flex items-center justify-between border-t px-6 py-3 text-[11.5px] text-muted-foreground">
              <span>
                Created by {firstName(people.get(task.createdBy)?.name ?? "someone")} · {format(new Date(task.createdAt), "d MMM")}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="xs" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                    <AlertDialogDescription>“{task.title}” and its subtasks and comments will be removed for the whole team.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      destructive
                      onClick={async () => {
                        const r = await run({ type: "task.delete", id: task.id }, { success: "Task deleted" });
                        if (r) onClose();
                      }}
                    >
                      Delete task
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </footer>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export type { TaskStatus };
