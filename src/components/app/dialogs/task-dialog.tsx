"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { projectMembers, projectsForUser } from "@/lib/selectors/workspace";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/types";
import { Field, dateInputToIso, nativeSelectClass } from "./form-field";

const schema = z.object({
  projectId: z.string().min(1, "Choose a project"),
  title: z.string().trim().min(2, "Tasks need a title").max(140),
  description: z.string().trim().max(2000),
  status: z.enum(["todo", "in_progress", "in_review", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeId: z.string(),
  dueDate: z.string(),
  milestoneId: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function TaskDialog({
  open,
  onOpenChange,
  projectId,
  status,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId?: string;
  status?: TaskStatus;
}) {
  const { ws, me, run } = useReadyWorkspace();
  const router = useRouter();
  const projects = projectsForUser(ws, me.id).filter((p) => p.status !== "completed");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: "", title: "", description: "", status: "todo", priority: "medium", assigneeId: me.id, dueDate: "", milestoneId: "" },
  });

  React.useEffect(() => {
    if (open)
      form.reset({
        projectId: projectId ?? projects[0]?.id ?? "",
        title: "",
        description: "",
        status: status ?? "todo",
        priority: "medium",
        assigneeId: me.id,
        dueDate: "",
        milestoneId: "",
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, status]);

  const selectedProject = useWatch({ control: form.control, name: "projectId" });
  const members = selectedProject ? projectMembers(ws, selectedProject) : [];
  const milestones = ws.milestones.filter((m) => m.projectId === selectedProject && !m.completedAt);
  const { errors, isSubmitting } = form.formState;

  // Keep assignee valid when switching project.
  React.useEffect(() => {
    const a = form.getValues("assigneeId");
    if (a && !members.some((m) => m.id === a)) form.setValue("assigneeId", "");
    form.setValue("milestoneId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const onSubmit = form.handleSubmit(async (v) => {
    const r = await run(
      {
        type: "task.create",
        projectId: v.projectId,
        input: {
          title: v.title,
          description: v.description,
          status: v.status,
          priority: v.priority,
          assigneeId: v.assigneeId || null,
          dueDate: v.dueDate ? dateInputToIso(v.dueDate) : null,
          milestoneId: v.milestoneId || null,
        },
      },
      { success: "Task created" },
    );
    if (r?.createdId) {
      onOpenChange(false);
      if (projectId !== v.projectId) router.push(`/projects/${v.projectId}/tasks?task=${r.createdId}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Make it clear what &ldquo;done&rdquo; means and who owns it.</DialogDescription>
        </DialogHeader>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create or join a project first — tasks live inside project workspaces.</p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <Field label="Project" htmlFor="t-project" error={errors.projectId?.message}>
              <select id="t-project" className={nativeSelectClass} {...form.register("projectId")}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" htmlFor="t-title" error={errors.title?.message}>
              <Input id="t-title" autoFocus placeholder="e.g. Draft the competitor analysis" aria-invalid={!!errors.title} {...form.register("title")} />
            </Field>
            <Field label="Description" htmlFor="t-desc">
              <Textarea id="t-desc" rows={3} placeholder="Context, links, definition of done…" {...form.register("description")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" htmlFor="t-status">
                <select id="t-status" className={nativeSelectClass} {...form.register("status")}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority" htmlFor="t-priority">
                <select id="t-priority" className={nativeSelectClass} {...form.register("priority")}>
                  {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assignee" htmlFor="t-assignee">
                <select id="t-assignee" className={nativeSelectClass} {...form.register("assigneeId")}>
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.id === me.id ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Due date" htmlFor="t-due">
                <Input id="t-due" type="date" {...form.register("dueDate")} />
              </Field>
            </div>
            {milestones.length > 0 && (
              <Field label="Milestone" htmlFor="t-ms">
                <select id="t-ms" className={nativeSelectClass} {...form.register("milestoneId")}>
                  <option value="">None</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Create task
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
