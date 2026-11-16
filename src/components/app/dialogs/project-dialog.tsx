"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, format } from "date-fns";
import { Check } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { Field, dateInputToIso, isoToDateInput } from "./form-field";

export const PROJECT_COLORS = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#0EA5E9", "#F43F5E", "#14B8A6"];
export const PROJECT_EMOJIS = ["📣", "📊", "🚀", "🧪", "💡", "📚", "🌍", "🎯", "🛠️", "💼"];

const schema = z.object({
  name: z.string().trim().min(3, "Give your project a name (3+ characters)").max(80),
  course: z.string().trim().min(2, "Which course is this for?").max(80),
  courseCode: z.string().trim().max(16),
  description: z.string().trim().max(600),
  deadline: z.string().min(1, "Pick a deadline"),
  color: z.string(),
  emoji: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When given, the dialog edits this project. */
  project?: Project;
}) {
  const { ws, me, run } = useReadyWorkspace();
  const router = useRouter();
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  // People you already collaborate with, for quick adding.
  const myProjects = new Set(ws.members.filter((m) => m.userId === me.id).map((m) => m.projectId));
  const collaborators = ws.profiles.filter(
    (p) => p.id !== me.id && ws.members.some((m) => m.userId === p.id && myProjects.has(m.projectId)),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      course: "",
      courseCode: "",
      description: "",
      deadline: format(addDays(new Date(), 21), "yyyy-MM-dd"),
      color: PROJECT_COLORS[0],
      emoji: PROJECT_EMOJIS[0],
    },
  });

  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setMemberIds([]);
  }

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      project
        ? {
            name: project.name,
            course: project.course,
            courseCode: project.courseCode,
            description: project.description,
            deadline: isoToDateInput(project.deadline),
            color: project.color,
            emoji: project.emoji,
          }
        : undefined,
    );
  }, [open, project, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    const input = { ...v, deadline: dateInputToIso(v.deadline) };
    if (project) {
      const r = await run({ type: "project.update", id: project.id, patch: input }, { success: "Project updated" });
      if (r) onOpenChange(false);
      return;
    }
    const r = await run({ type: "project.create", input, memberIds }, { success: `${v.name} created` });
    if (r?.createdId) {
      onOpenChange(false);
      router.push(`/projects/${r.createdId}`);
    }
  });

  const color = useWatch({ control: form.control, name: "color" });
  const emoji = useWatch({ control: form.control, name: "emoji" });
  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "Create a project workspace"}</DialogTitle>
          <DialogDescription>
            {project ? "Update the details your team sees." : "A shared space for your group's tasks, meetings and deadlines."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="flex items-start gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
              style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}
              aria-hidden
            >
              {emoji}
            </div>
            <Field label="Project name" htmlFor="p-name" error={errors.name?.message} className="flex-1">
              <Input id="p-name" placeholder="Marketing Strategy — Group 04" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="Course" htmlFor="p-course" error={errors.course?.message}>
              <Input id="p-course" placeholder="Marketing Management" aria-invalid={!!errors.course} {...form.register("course")} />
            </Field>
            <Field label="Course code" htmlFor="p-code">
              <Input id="p-code" placeholder="MKT 2104" {...form.register("courseCode")} />
            </Field>
          </div>
          <Field label="Description" htmlFor="p-desc" hint="What are you delivering, and to whom?">
            <Textarea id="p-desc" rows={3} placeholder="Go-to-market strategy for…" {...form.register("description")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Final deadline" htmlFor="p-deadline" error={errors.deadline?.message}>
              <Input id="p-deadline" type="date" aria-invalid={!!errors.deadline} {...form.register("deadline")} />
            </Field>
            <Field label="Look & feel">
              <div className="flex flex-wrap items-center gap-1.5">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={c === color}
                    onClick={() => form.setValue("color", c)}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-card transition hover:scale-110 aria-pressed:ring-2"
                    style={{ background: c, ["--tw-ring-color" as string]: c }}
                  >
                    {c === color && <Check className="size-3 text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Project icon">
            {PROJECT_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => form.setValue("emoji", e)}
                aria-pressed={e === emoji}
                className={cn(
                  "flex size-9 cursor-pointer items-center justify-center rounded-lg border text-lg transition hover:bg-secondary",
                  e === emoji && "border-primary bg-primary/5",
                )}
              >
                {e}
              </button>
            ))}
          </div>
          {!project && collaborators.length > 0 && (
            <Field label="Add teammates" hint="You can invite anyone else later from the Team tab.">
              <div className="flex flex-wrap gap-1.5">
                {collaborators.map((p) => {
                  const on = memberIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setMemberIds((ids) => (on ? ids.filter((i) => i !== p.id) : [...ids, p.id]))}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-[12.5px] transition",
                        on ? "border-primary bg-primary/8 text-foreground" : "text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      <Avatar person={p} size="xs" />
                      {p.name.split(" ")[0]}
                      {on && <Check className="size-3 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
