import { Suspense } from "react";
import { ProjectTasks } from "@/components/tasks/project-tasks";

export default function ProjectTasksPage() {
  return (
    <Suspense>
      <ProjectTasks />
    </Suspense>
  );
}
