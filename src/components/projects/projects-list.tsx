"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderPlus, KeyRound } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectCard } from "@/components/shared/project-card";
import { projectsForUser } from "@/lib/selectors/workspace";
import { cn } from "@/lib/utils";

type Filter = "active" | "completed" | "all";

export function ProjectsList() {
  const { ws, me, run, mode } = useReadyWorkspace();
  const ui = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const [joinOpen, setJoinOpen] = React.useState(params.get("join") === "1");
  const [code, setCode] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("active");
  const all = projectsForUser(ws, me.id);
  const list = all.filter((p) => (filter === "all" ? true : filter === "completed" ? p.status === "completed" : p.status !== "completed"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Every group project you're part of, with live progress and health."
        actions={
          <>
            <Button variant="outline" onClick={() => setJoinOpen(true)}>
              <KeyRound /> Join with code
            </Button>
            <Button onClick={() => ui.open({ kind: "project" })}>
              <FolderPlus /> New project
            </Button>
          </>
        }
      />
      <div className="flex gap-1 rounded-lg border bg-card p-0.5 shadow-soft w-fit" role="group" aria-label="Filter projects">
        {(["active", "completed", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn("h-7 cursor-pointer rounded-md px-3 text-[13px] font-medium capitalize transition", filter === f ? "bg-secondary" : "text-muted-foreground hover:text-foreground")}
          >
            {f}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title={filter === "completed" ? "No completed projects yet" : "No projects here"}
          description={filter === "completed" ? "Finished projects will show up here." : "Create a workspace for your group or join one with a code."}
          action={<Button onClick={() => ui.open({ kind: "project" })}>Create project</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a project</DialogTitle>
            <DialogDescription>Ask a teammate for the invite code — it&apos;s on their project&apos;s Team tab.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await run({ type: "member.join", code }, { success: "You joined the project" });
              if (r?.createdId) {
                setJoinOpen(false);
                router.push(`/projects/${r.createdId}`);
              }
            }}
          >
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MKT-G04X" className="h-11 font-mono text-lg tracking-widest" autoFocus aria-label="Invite code" />
            {mode === "demo" && <p className="text-[12px] text-muted-foreground">Demo codes: MKT-G04X · BA-33FP · ENT-MESA (you&apos;re already in all three as Alex).</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setJoinOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={code.trim().length < 4}>
                Join project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
