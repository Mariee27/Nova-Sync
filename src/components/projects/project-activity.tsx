"use client";

import * as React from "react";
import { Megaphone } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityItem } from "@/components/shared/activity-item";
import { EmptyState } from "@/components/shared/empty-state";
import { useLookups } from "@/lib/hooks";
import { timeAgo } from "@/lib/dates";
import { format, isToday, isYesterday } from "date-fns";
import { useCurrentProject } from "./use-project";
import { UpdateComposer } from "./update-composer";

function dayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM");
}

export function ProjectActivity() {
  const { project } = useCurrentProject();
  const { ws, mode } = useReadyWorkspace();
  const { people } = useLookups();
  if (!project) return null;
  const updates = ws.updates.filter((u) => u.projectId === project.id);
  const activity = ws.activity.filter((a) => a.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = new Map<string, typeof activity>();
  for (const a of activity) {
    const k = dayLabel(a.createdAt);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr] lg:gap-6">
      <Card className="self-start">
        <CardHeader>
          <div>
            <CardTitle>Team updates</CardTitle>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {mode === "demo" ? "Posts are saved in this browser (other tabs update instantly)." : "Updates sync to everyone in real time."}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UpdateComposer projectId={project.id} />
          {updates.length === 0 && <EmptyState compact icon={Megaphone} title="No updates yet" description="Share progress, decisions or blockers with the team." />}
          {updates.map((u) => {
            const a = people.get(u.authorId);
            return (
              <article key={u.id} className="flex gap-3 border-t pt-4">
                {a && <Avatar person={a} size="md" />}
                <div className="min-w-0">
                  <p className="text-[12.5px]">
                    <span className="font-semibold">{a?.name}</span> <span className="text-muted-foreground">· {timeAgo(u.createdAt)}</span>
                  </p>
                  <p className="mt-0.5 text-[13.5px] whitespace-pre-wrap">{u.body}</p>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-3">
          {[...groups.entries()].map(([day, items]) => (
            <div key={day}>
              <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{day}</p>
              {items.map((a) => (
                <ActivityItem key={a.id} event={a} people={people} showProject={false} />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
