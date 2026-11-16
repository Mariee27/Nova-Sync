"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { CalendarPlus, FolderPlus, Search, SquarePen } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { projectsForUser } from "@/lib/selectors/workspace";
import { NAV, NAV_EXTRA } from "./sidebar";
import { STATUS_LABEL } from "@/lib/types";

const itemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] data-[selected=true]:bg-secondary [&_svg]:size-4 [&_svg]:text-muted-foreground";
const groupClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground";

/** ⌘K palette: jump to any page, project or task, or create something. */
export function CommandMenu() {
  const ui = useUI();
  const router = useRouter();
  const { ws, me } = useReadyWorkspace();
  const open = ui.dialog.kind === "command";

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) ui.close();
        else ui.open({ kind: "command" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, ui]);

  const projects = projectsForUser(ws, me.id);
  const projectIds = new Set(projects.map((p) => p.id));
  const tasks = ws.tasks.filter((t) => projectIds.has(t.projectId));
  const go = (href: string) => {
    ui.close();
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? ui.open({ kind: "command" }) : ui.close())}>
      <DialogContent hideClose className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search NOVA SYNC</DialogTitle>
        <Command loop className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search pages, projects and tasks…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
            <Command.Empty className="py-10 text-center text-sm text-muted-foreground">No results.</Command.Empty>
            <Command.Group heading="Create" className={groupClass}>
              <Command.Item className={itemClass} onSelect={() => ui.open({ kind: "task" })}>
                <SquarePen /> New task
              </Command.Item>
              <Command.Item className={itemClass} onSelect={() => go("/meetings/new")}>
                <CalendarPlus /> New meeting poll
              </Command.Item>
              <Command.Item className={itemClass} onSelect={() => ui.open({ kind: "project" })}>
                <FolderPlus /> New project
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Go to" className={groupClass}>
              {[...NAV, ...NAV_EXTRA].map(({ href, label, icon: Icon }) => (
                <Command.Item key={href} className={itemClass} onSelect={() => go(href)}>
                  <Icon /> {label}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Projects" className={groupClass}>
              {projects.map((p) => (
                <Command.Item key={p.id} value={`${p.name} ${p.course}`} className={itemClass} onSelect={() => go(`/projects/${p.id}`)}>
                  <span className="w-4 text-center">{p.emoji}</span> {p.name}
                  <span className="ml-auto text-[11px] text-muted-foreground">{p.courseCode}</span>
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Tasks" className={groupClass}>
              {tasks.map((t) => (
                <Command.Item key={t.id} value={`${t.title} ${t.id}`} className={itemClass} onSelect={() => go(`/projects/${t.projectId}/tasks?task=${t.id}`)}>
                  <SquarePen /> <span className="truncate">{t.title}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{STATUS_LABEL[t.status]}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ to navigate · ↵ to open</span>
            <span>esc to close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
