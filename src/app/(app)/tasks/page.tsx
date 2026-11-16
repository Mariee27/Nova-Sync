import { Suspense } from "react";
import type { Metadata } from "next";
import { MyTasks } from "@/components/tasks/my-tasks";

export const metadata: Metadata = { title: "My Tasks" };

export default function Page() {
  return (
    <Suspense>
      <MyTasks />
    </Suspense>
  );
}
