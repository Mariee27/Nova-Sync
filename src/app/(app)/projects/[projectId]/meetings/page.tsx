"use client";

import { useParams } from "next/navigation";
import { MeetingsList } from "@/components/meetings/meetings-list";

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <MeetingsList projectId={projectId} />;
}
