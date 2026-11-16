import { ProjectLayout } from "@/components/projects/project-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProjectLayout>{children}</ProjectLayout>;
}
