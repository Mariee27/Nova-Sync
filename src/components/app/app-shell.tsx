"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { UIProvider, useUI } from "@/components/providers/ui-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoMark } from "@/components/shared/logo";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { CommandMenu } from "./command-menu";
import { Celebration } from "./celebration";
import { ProjectDialog } from "./dialogs/project-dialog";
import { TaskDialog } from "./dialogs/task-dialog";
import { EventDialog } from "./dialogs/event-dialog";

function GlobalDialogs() {
  const { dialog, close } = useUI();
  const onOpenChange = (o: boolean) => !o && close();
  return (
    <>
      <ProjectDialog open={dialog.kind === "project"} onOpenChange={onOpenChange} />
      <TaskDialog
        open={dialog.kind === "task"}
        onOpenChange={onOpenChange}
        projectId={dialog.kind === "task" ? dialog.projectId : undefined}
        status={dialog.kind === "task" ? dialog.status : undefined}
      />
      <EventDialog
        open={dialog.kind === "event"}
        onOpenChange={onOpenChange}
        date={dialog.kind === "event" ? dialog.date : undefined}
        eventId={dialog.kind === "event" ? dialog.eventId : undefined}
      />
      <CommandMenu />
    </>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading your workspace">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar p-4 lg:block">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mt-8 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-5 lg:p-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, me, error, retry } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "signed_out") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "ready" && me && !me.onboarded) router.replace("/onboarding");
  }, [status, me, router, pathname]);

  if (status === "error")
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-lg font-semibold">We couldn&apos;t load your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-5" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    );

  if (status !== "ready" || !me || !me.onboarded) return <ShellSkeleton />;

  return (
    <UIProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <Sidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <GlobalDialogs />
      <Celebration />
    </UIProvider>
  );
}
