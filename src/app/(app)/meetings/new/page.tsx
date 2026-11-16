import { Suspense } from "react";
import type { Metadata } from "next";
import { MeetingNew } from "@/components/meetings/meeting-new";

export const metadata: Metadata = { title: "New meeting poll" };

export default function Page() {
  return (
    <Suspense>
      <MeetingNew />
    </Suspense>
  );
}
