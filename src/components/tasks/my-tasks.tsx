"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { endOfDay, addDays } from "date-fns";
import { Plus } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { isOverdue } from "@/lib/selectors/progress";
import { projectsForUser, sortTasksByUrgency } from "@/lib/selectors/workspace";
import { cn } from "@/lib/utils";
import { TaskList } from "./task-list";
import { TaskDrawer } from "./task-drawer";

type View = "mine" | "week" | "overdue" | "team" | "done";

export function MyTasks() {
  const { ws, me } = useReadyWorkspace();
  const ui = useUI();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = (params.get("view") as View) || "mine";
  const openTask = params.get("task");
  const ids = new Set(projectsForUser(ws, me.id).map((p) => p.id));
  const now = new Date();
  const weekEnd = endOfDay(addDays(now, 7));
  const scoped = ws.tasks.filter((t) => ids.has(t.projectId));
  const views: { id: View; label: string; tasks: typeof scoped }[] = [
    { id: "mine", label: "Assigned to me", tasks: scoped.filter((t) => t.assigneeId === me.id && t.status !== "done") },
    { id: "week", label: "Due this week", tasks: scoped.filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) <= weekEnd) },
    { id: "overdue", label: "Overdue", tasks: scoped.filter((t) => isOverdue(t, now)) },
    { id: "team", label: "All open", tasks: scoped.filter((t) => t.status !== "done") },
    { id: "done", label: "Completed by me", tasks: scoped.filter((t) => t.assigneeId === me.id && t.status === "done") },
  ];
  const current = views.find((v) => v.id === view) ?? views[0];
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="Everything on your plate across projects, most urgent first."
        actions={
          <Button onClick={() => ui.open({ kind: "task" })}>
            <Plus /> New task
          </Button>
        }
      />
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Task views">
        {views.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={current.id === v.id}
            onClick={() => set("view", v.id)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
              current.id === v.id ? "border-navy bg-navy text-white dark:border-white dark:bg-white dark:text-navy" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
            <span className={cn("tabular-nums", current.id === v.id ? "opacity-70" : "")}>{v.tasks.length}</span>
          </button>
        ))}
      </div>
      <TaskList tasks={current.id === "done" ? current.tasks : sortTasksByUrgency(current.tasks, now)} onOpen={(t) => set("task", t.id)} showProject groupBy="none" />
      <TaskDrawer taskId={openTask} onClose={() => set("task", null)} />
    </div>
  );
}
