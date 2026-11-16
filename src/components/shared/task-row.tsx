"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { DueLabel, PriorityTag } from "./task-meta";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskRow({
  task,
  showProject = true,
  showAssignee = false,
  className,
}: {
  task: Task;
  showProject?: boolean;
  showAssignee?: boolean;
  className?: string;
}) {
  const { ws, run } = useReadyWorkspace();
  const project = ws.projects.find((p) => p.id === task.projectId);
  const assignee = ws.profiles.find((p) => p.id === task.assigneeId);
  const comments = ws.comments.filter((c) => c.taskId === task.id).length;
  const done = task.status === "done";
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60", className)}
    >
      <Checkbox
        checked={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onCheckedChange={(v) =>
          run(
            { type: "task.update", id: task.id, patch: { status: v ? "done" : "todo" } },
            { success: v ? `Completed “${task.title}”` : undefined },
          )
        }
      />
      <Link href={`/projects/${task.projectId}/tasks?task=${task.id}`} className="min-w-0 flex-1 outline-none focus-visible:underline">
        <p className={cn("truncate text-[13.5px] font-medium", done && "text-muted-foreground line-through")}>{task.title}</p>
        {showProject && project && (
          <p className="truncate text-[11.5px] text-muted-foreground">
            {project.emoji} {project.name.split(" — ")[0]}
          </p>
        )}
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {comments > 0 && (
          <span className="hidden items-center gap-0.5 text-[11px] text-muted-foreground sm:inline-flex">
            <MessageSquare className="size-3" /> {comments}
          </span>
        )}
        <PriorityTag priority={task.priority} compact />
        <DueLabel date={task.dueDate} done={done} />
        {showAssignee && assignee && <Avatar person={assignee} size="sm" />}
      </div>
    </motion.div>
  );
}
