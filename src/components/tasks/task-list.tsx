"use client";

import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { DueLabel, PriorityTag, STATUS_STYLE } from "@/components/shared/task-meta";
import { STATUS_LABEL, TASK_STATUSES, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskList({
  tasks,
  onOpen,
  showProject = false,
  groupBy = "status",
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  showProject?: boolean;
  groupBy?: "status" | "none";
}) {
  const { ws, run } = useReadyWorkspace();
  const groups =
    groupBy === "status"
      ? TASK_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], dot: STATUS_STYLE[s].dot, items: tasks.filter((t) => t.status === s).sort((a, b) => a.order - b.order) }))
      : [{ key: "all", label: "", dot: "", items: tasks }];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="hidden grid-cols-[1fr_9rem_6rem_7rem_2.5rem] gap-3 border-b bg-secondary/40 px-4 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:grid">
        <span>Task</span>
        <span>{showProject ? "Project" : "Status"}</span>
        <span>Priority</span>
        <span>Due</span>
        <span className="sr-only">Assignee</span>
      </div>
      {groups.map((g) =>
        g.items.length === 0 && groupBy === "status" ? null : (
          <div key={g.key}>
            {g.label && (
              <div className="flex items-center gap-2 border-b bg-secondary/20 px-4 py-2 text-[12px] font-semibold">
                <span className={cn("size-2 rounded-full", g.dot)} /> {g.label}
                <span className="font-normal text-muted-foreground">{g.items.length}</span>
              </div>
            )}
            <ul>
              {g.items.map((t) => {
                const project = ws.projects.find((p) => p.id === t.projectId);
                const assignee = ws.profiles.find((p) => p.id === t.assigneeId);
                const done = t.status === "done";
                return (
                  <li key={t.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4 py-2.5 last:border-b-0 hover:bg-secondary/40 md:grid-cols-[auto_1fr_9rem_6rem_7rem_2.5rem]">
                    <Checkbox
                      checked={done}
                      onCheckedChange={(v) => run({ type: "task.update", id: t.id, patch: { status: v ? "done" : "todo" } }, { success: v ? `Completed “${t.title}”` : undefined })}
                      aria-label={`Mark ${t.title} as ${done ? "not done" : "done"}`}
                    />
                    <button type="button" onClick={() => onOpen(t)} className="min-w-0 cursor-pointer text-left outline-none focus-visible:underline">
                      <span className={cn("block truncate text-[13.5px] font-medium", done && "text-muted-foreground line-through")}>{t.title}</span>
                      <span className="flex items-center gap-2 md:hidden">
                        <PriorityTag priority={t.priority} compact />
                        <DueLabel date={t.dueDate} done={done} />
                        {showProject && project && <span className="truncate text-[11px] text-muted-foreground">{project.emoji} {project.name.split(" — ")[0]}</span>}
                      </span>
                    </button>
                    <span className="hidden truncate text-[12.5px] text-muted-foreground md:block">
                      {showProject ? `${project?.emoji} ${project?.name.split(" — ")[0]}` : STATUS_LABEL[t.status]}
                    </span>
                    <span className="hidden md:block">
                      <PriorityTag priority={t.priority} />
                    </span>
                    <span className="hidden md:block">
                      <DueLabel date={t.dueDate} done={done} />
                    </span>
                    <span className="flex justify-end">{assignee ? <Avatar person={assignee} size="sm" /> : <span className="size-6 rounded-full border border-dashed" title="Unassigned" />}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      )}
      {tasks.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">No tasks match these filters.</p>}
    </div>
  );
}
