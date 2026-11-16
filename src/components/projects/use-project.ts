"use client";

import { useParams } from "next/navigation";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";

/** The project for the current `/projects/[projectId]` route, if the user can see it. */
export function useCurrentProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const { ws, me } = useReadyWorkspace();
  const project = ws.projects.find((p) => p.id === projectId);
  const membership = ws.members.find((m) => m.projectId === projectId && m.userId === me.id);
  return { projectId, project: membership ? project : undefined, isOwner: membership?.role === "owner" };
}
