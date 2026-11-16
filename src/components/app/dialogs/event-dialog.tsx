"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { projectsForUser } from "@/lib/selectors/workspace";
import { Field, isoToDateTimeInput, nativeSelectClass } from "./form-field";

const schema = z
  .object({
    title: z.string().trim().min(2, "Add a title").max(100),
    description: z.string().trim().max(500),
    projectId: z.string(),
    start: z.string().min(1, "Pick a start time"),
    end: z.string().min(1, "Pick an end time"),
  })
  .refine((v) => new Date(v.end) > new Date(v.start), { message: "End must be after start", path: ["end"] });
type FormValues = z.infer<typeof schema>;

function defaultTimes(date?: string) {
  const base = date ? new Date(`${date}T10:00`) : new Date();
  if (!date) base.setHours(base.getHours() + 1, 0, 0, 0);
  const end = new Date(base.getTime() + 60 * 60_000);
  return { start: isoToDateTimeInput(base.toISOString()), end: isoToDateTimeInput(end.toISOString()) };
}

export function EventDialog({
  open,
  onOpenChange,
  date,
  eventId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date?: string;
  eventId?: string;
}) {
  const { ws, me, run } = useReadyWorkspace();
  const projects = projectsForUser(ws, me.id);
  const existing = eventId ? ws.events.find((e) => e.id === eventId) : undefined;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", projectId: "", ...defaultTimes(date) },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      existing
        ? {
            title: existing.title,
            description: existing.description,
            projectId: existing.projectId ?? "",
            start: isoToDateTimeInput(existing.start),
            end: isoToDateTimeInput(existing.end),
          }
        : { title: "", description: "", projectId: "", ...defaultTimes(date) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId, date]);

  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    const input = {
      title: v.title,
      description: v.description,
      projectId: v.projectId || null,
      start: new Date(v.start).toISOString(),
      end: new Date(v.end).toISOString(),
    };
    const r = existing
      ? await run({ type: "event.update", id: existing.id, input }, { success: "Event updated" })
      : await run({ type: "event.create", input }, { success: "Added to your calendar" });
    if (r) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit event" : "New calendar event"}</DialogTitle>
          <DialogDescription>Study blocks, lectures, presentations — anything your team should see.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field label="Title" htmlFor="e-title" error={errors.title?.message}>
            <Input id="e-title" autoFocus placeholder="Library study block" aria-invalid={!!errors.title} {...form.register("title")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts" htmlFor="e-start" error={errors.start?.message}>
              <Input id="e-start" type="datetime-local" {...form.register("start")} />
            </Field>
            <Field label="Ends" htmlFor="e-end" error={errors.end?.message}>
              <Input id="e-end" type="datetime-local" aria-invalid={!!errors.end} {...form.register("end")} />
            </Field>
          </div>
          <Field label="Project" htmlFor="e-project" hint="Project events are visible to the whole team.">
            <select id="e-project" className={nativeSelectClass} {...form.register("projectId")}>
              <option value="">Personal (only you)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes" htmlFor="e-notes">
            <Textarea id="e-notes" rows={2} {...form.register("description")} />
          </Field>
          <DialogFooter className="sm:justify-between">
            {existing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={async () => {
                  const r = await run({ type: "event.delete", id: existing.id }, { success: "Event deleted" });
                  if (r) onOpenChange(false);
                }}
              >
                <Trash2 /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {existing ? "Save" : "Add event"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
