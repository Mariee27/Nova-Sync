"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  Crosshair,
  LayoutGrid,
  Newspaper,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Logo } from "@/components/shared/logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Hint } from "@/components/ui/tooltip";
import { useInsights } from "@/lib/hooks";
import { projectsForUser, myOpenTasks, openPolls } from "@/lib/selectors/workspace";
import { computeProgress } from "@/lib/selectors/progress";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/meetings", label: "Meetings", icon: CalendarRange },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/intelligence", label: "Sync Intelligence", icon: BrainCircuit },
] as const;

export const NAV_EXTRA = [
  { href: "/focus", label: "Focus Mode", icon: Crosshair },
  { href: "/recap", label: "Weekly Recap", icon: Newspaper },
] as const;

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { ws, me, mode, resetDemo } = useReadyWorkspace();
  const ui = useUI();
  const insights = useInsights();
  const projects = projectsForUser(ws, me.id);
  const counts: Record<string, number> = {
    "/tasks": myOpenTasks(ws, me.id).length,
    "/meetings": openPolls(ws, me.id).filter(
      (m) => m.inviteeIds.includes(me.id) && !ws.availability.some((a) => a.meetingId === m.id && a.userId === me.id),
    ).length,
    "/intelligence": insights.filter((i) => i.severity === "critical" || i.severity === "high").length,
  };

  const item = (href: string, label: string, Icon: typeof LayoutGrid, badge?: number) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        )}
      >
        {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-gradient" />}
        <Icon className={cn("size-[17px]", active ? "text-primary" : "")} />
        <span className="flex-1 truncate">{label}</span>
        {!!badge && (
          <span
            className={cn(
              "min-w-5 rounded-full px-1.5 text-center text-[10.5px] leading-5 font-semibold tabular-nums",
              href === "/intelligence" ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary",
            )}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4">
        <Logo href="/dashboard" />
      </div>

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Main">
        <div className="space-y-0.5">{NAV.map((n) => item(n.href, n.label, n.icon, counts[n.href]))}</div>

        <div>
          <div className="mb-1.5 flex items-center justify-between px-2.5">
            <Link href="/projects" onClick={onNavigate} className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground">
              Projects
            </Link>
            <Hint label="New project">
              <button
                type="button"
                onClick={() => {
                  onNavigate?.();
                  ui.open({ kind: "project" });
                }}
                className="cursor-pointer rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="New project"
              >
                <Plus className="size-3.5" />
              </button>
            </Hint>
          </div>
          <div className="space-y-0.5">
            {projects.map((p) => {
              const active = isActive(pathname, `/projects/${p.id}`);
              const prog = computeProgress(ws.tasks.filter((t) => t.projectId === p.id));
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <span className="flex size-5 items-center justify-center rounded-md text-[12px]" style={{ background: `color-mix(in oklab, ${p.color} 14%, transparent)` }}>
                    {p.emoji}
                  </span>
                  <span className="flex-1 truncate">{p.name.split(" — ")[0]}</span>
                  <span className="text-[10.5px] tabular-nums text-muted-foreground">{prog.percentage}%</span>
                </Link>
              );
            })}
            {projects.length === 0 && (
              <p className="px-2.5 py-1 text-[12px] text-muted-foreground">No projects yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Personal</p>
          {NAV_EXTRA.map((n) => item(n.href, n.label, n.icon))}
        </div>
      </nav>

      {mode === "demo" && (
        <div className="m-3 rounded-xl border bg-gradient-to-br from-blue-50 to-violet-50 p-3 dark:from-blue-500/10 dark:to-violet-500/10">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <p className="text-[12px] font-semibold">Demo workspace</p>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
            Data is stored in this browser only. No real accounts or servers.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md text-[12px] font-medium text-primary hover:underline"
              >
                <RotateCcw className="size-3" /> Reset demo
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset the demo workspace?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every project, task, meeting and change you made in this browser will be replaced with the original
                  demonstration data, with dates recalculated for today.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void resetDemo()}>Reset demo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
