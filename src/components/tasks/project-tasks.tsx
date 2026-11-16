"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, KanbanSquare, List, Plus, Search, X } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hint } from "@/components/ui/tooltip";
import { useCurrentProject } from "@/components/projects/use-project";
import { isOverdue } from "@/lib/selectors/progress";
import { projectMembers } from "@/lib/selectors/workspace";
import { PRIORITY_LABEL, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocalPref } from "@/lib/hooks";
import { KanbanBoard } from "./kanban-board";
import { TaskList } from "./task-list";
import { TaskDrawer } from "./task-drawer";

const VIEW_KEY = "nova-sync:task-view";

export function ProjectTasks() {
  const { project } = useCurrentProject();
  const { ws } = useReadyWorkspace();
  const ui = useUI();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openTaskId = params.get("task");
  const overdueOnly = params.get("filter") === "overdue";
  const [view, setView] = useLocalPref<"board" | "list">(VIEW_KEY, "board", ["board", "list"]);
  const [assignee, setAssignee] = React.useState<string | null>(null);
  const [priority, setPriority] = React.useState<TaskPriority | null>(null);
  const [query, setQuery] = React.useState("");


  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const tasks = React.useMemo(() => (project ? ws.tasks.filter((t) => t.projectId === project.id) : []), [ws.tasks, project]);
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return tasks.filter(
      (t) =>
        (!assignee || (assignee === "none" ? !t.assigneeId : t.assigneeId === assignee)) &&
        (!priority || t.priority === priority) &&
        (!overdueOnly || isOverdue(t, now)) &&
        (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
  }, [tasks, assignee, priority, overdueOnly, query]);

  if (!project) return null;
  const members = projectMembers(ws, project.id);
  const filtered = !!(assignee || priority || overdueOnly || query);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter tasks" className="h-8 w-44 pl-8" aria-label="Filter tasks by text" />
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5 shadow-soft" role="group" aria-label="Filter by assignee">
            {members.map((m) => (
              <Hint key={m.id} label={m.name}>
                <button
                  type="button"
                  aria-pressed={assignee === m.id}
                  onClick={() => setAssignee(assignee === m.id ? null : m.id)}
                  className={cn("cursor-pointer rounded-full p-0.5 transition", assignee === m.id ? "ring-2 ring-primary" : assignee ? "opacity-40 hover:opacity-100" : "")}
                >
                  <Avatar person={m} size="sm" />
                </button>
              </Hint>
            ))}
            <Hint label="Unassigned">
              <button
                type="button"
                aria-pressed={assignee === "none"}
                onClick={() => setAssignee(assignee === "none" ? null : "none")}
                className={cn("flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed text-[10px] text-muted-foreground", assignee === "none" && "border-primary text-primary")}
              >
                ?
              </button>
            </Hint>
          </div>
          <select
            value={priority ?? ""}
            onChange={(e) => setPriority((e.target.value || null) as TaskPriority | null)}
            className="h-8 cursor-pointer rounded-lg border bg-card px-2 text-[13px] shadow-soft"
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <Button
            variant={overdueOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setParam("filter", overdueOnly ? null : "overdue")}
            aria-pressed={overdueOnly}
          >
            <AlertTriangle /> Overdue
          </Button>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAssignee(null);
                setPriority(null);
                setQuery("");
                setParam("filter", null);
              }}
            >
              <X /> Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5 shadow-soft" role="group" aria-label="View">
            {(
              [
                ["board", KanbanSquare, "Board"],
                ["list", List, "List"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition",
                  view === v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => ui.open({ kind: "task", projectId: project.id })}>
            <Plus /> New task
          </Button>
        </div>
      </div>

      {filtered && (
        <p className="text-[12.5px] text-muted-foreground">
          Showing {visible.length} of {tasks.length} tasks{overdueOnly ? " · overdue only" : ""}
        </p>
      )}

      {view === "board" ? (
        <KanbanBoard projectId={project.id} visible={visible} onOpen={(id) => setParam("task", id)} />
      ) : (
        <TaskList tasks={visible} onOpen={(t) => setParam("task", t.id)} />
      )}

      <TaskDrawer taskId={openTaskId} onClose={() => setParam("task", null)} />
    </div>
  );
}
