"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Crown, Info, Mail, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Hint } from "@/components/ui/tooltip";
import { DueLabel } from "@/components/shared/task-meta";
import { Field } from "@/components/app/dialogs/form-field";
import { describeActivity } from "@/components/shared/activity-item";
import { useLookups, useNow } from "@/lib/hooks";
import { availabilityStatus } from "@/lib/selectors/presence";
import { workload } from "@/lib/selectors/workspace";
import { timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./use-project";

function InviteDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  const { run, mode } = useReadyWorkspace();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName("");
      setEmail("");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            {mode === "demo"
              ? "Demo mode: the teammate is added to the project right away as a local profile. No email is sent."
              : "They need a NOVA SYNC account with this email. Otherwise, share the invite code."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await run({ type: "member.invite", projectId, name, email }, { success: `${name.split(" ")[0] || "Teammate"} joined the project` });
            setBusy(false);
            if (r) onOpenChange(false);
          }}
        >
          <Field label="Name" htmlFor="inv-name">
            <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Carolina Mendes" autoFocus required />
          </Field>
          <Field label="Email" htmlFor="inv-email">
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="carolina@novasbe.pt" required />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2 || !email.includes("@")}>
              <Mail /> {mode === "demo" ? "Add teammate" : "Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATE_DOT = { available: "bg-emerald-500", busy: "bg-amber-500", away: "bg-slate-400" };

export function ProjectTeam() {
  const { project, isOwner } = useCurrentProject();
  const { ws, me, run } = useReadyWorkspace();
  const { people } = useLookups();
  const now = useNow();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  if (!project) return null;

  const rows = workload(ws, project.id, now);
  const maxOpen = Math.max(1, ...rows.map((r) => r.open));
  const totalOpen = rows.reduce((s, r) => s + r.open, 0);
  const unassigned = ws.tasks.filter((t) => t.projectId === project.id && t.status !== "done" && !t.assigneeId).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(project.inviteCode);
      setCopied(true);
      toast.success("Invite code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't access the clipboard — copy the code manually.");
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Workload distribution</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Open tasks per person — to spot who might need a hand, not to rank anyone.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {rows.map((r) => (
              <div key={r.profile.id} className="flex items-center gap-3">
                <Avatar person={r.profile} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <span className="truncate font-medium">{r.profile.name}{r.profile.id === me.id && <span className="text-muted-foreground"> (you)</span>}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {r.open} open · {r.done} done
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.open / maxOpen) * 100}%`, background: r.profile.color }} />
                  </div>
                </div>
              </div>
            ))}
            <p className="flex items-center gap-1.5 pt-1 text-[12px] text-muted-foreground">
              <Info className="size-3.5" /> {totalOpen} assigned open tasks{unassigned ? ` · ${unassigned} unassigned` : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -bottom-16 size-48 rounded-full bg-brand-gradient opacity-10 blur-2xl" aria-hidden />
          <CardHeader>
            <div>
              <CardTitle>Grow the team</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">Share the code, or add someone directly.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Invite code</p>
                <p className="font-mono text-xl font-semibold tracking-[0.15em]">{project.inviteCode}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copy} aria-label="Copy invite code">
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button className="w-full" onClick={() => setInviteOpen(true)}>
              <UserPlus /> Invite teammate
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const p = r.profile;
          const member = ws.members.find((m) => m.projectId === project.id && m.userId === p.id);
          const status = availabilityStatus(p, ws, now);
          const contributions = ws.activity
            .filter((a) => a.projectId === project.id && a.actorId === p.id && a.type !== "member_joined")
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 2);
          const upcoming = ws.tasks
            .filter((t) => t.projectId === project.id && t.assigneeId === p.id && t.status !== "done")
            .sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))
            .slice(0, 3);
          return (
            <Card key={p.id} className="flex flex-col">
              <CardContent className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar person={p} size="lg" />
                    <Hint label={status.label}>
                      <span className={cn("absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card", STATE_DOT[status.state])} />
                    </Hint>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[14px] font-semibold">{p.name}</p>
                      {member?.role === "owner" && (
                        <Hint label="Project owner">
                          <Crown className="size-3.5 shrink-0 text-amber-500" />
                        </Hint>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">{p.degree || p.email}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{status.label}</p>
                  </div>
                  {isOwner && p.id !== me.id && (
                    <Hint label="Remove from project">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => run({ type: "member.remove", projectId: project.id, userId: p.id }, { success: `${p.name} removed · their tasks are now unassigned` })}
                      >
                        <UserMinus />
                      </Button>
                    </Hint>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Open", r.open],
                    ["Active", r.inProgress],
                    ["Done", r.done],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-secondary/60 py-2">
                      <p className="text-lg font-semibold tabular-nums">{v}</p>
                      <p className="text-[11px] text-muted-foreground">{l}</p>
                    </div>
                  ))}
                </div>
                {p.interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.interests.slice(0, 3).map((i) => (
                      <Badge key={i} variant="secondary">{i}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Upcoming responsibilities</p>
                  {upcoming.length === 0 && <p className="text-[12.5px] text-muted-foreground">Nothing open right now.</p>}
                  <ul className="space-y-1">
                    {upcoming.map((t) => (
                      <li key={t.id}>
                        <Link href={`/projects/${project.id}/tasks?task=${t.id}`} className="flex items-center justify-between gap-2 rounded-md py-0.5 text-[12.5px] hover:text-primary">
                          <span className="truncate">{t.title}</span>
                          <DueLabel date={t.dueDate} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {contributions.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Recent contributions</p>
                    <ul className="space-y-1">
                      {contributions.map((a) => {
                        const d = describeActivity(a, people) as { verb: string; object?: string };
                        return (
                          <li key={a.id} className="text-[12px] text-muted-foreground">
                            <span className="text-foreground">
                              {d.verb.charAt(0).toUpperCase() + d.verb.slice(1)} {d.object}
                            </span>{" "}
                            · {timeAgo(a.createdAt)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-center text-[12px] text-muted-foreground">
        Availability is estimated from each person&apos;s working hours and meetings confirmed in NOVA SYNC — it isn&apos;t live presence.
      </p>
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} projectId={project.id} />
    </div>
  );
}
