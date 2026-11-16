"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, ClipboardCopy, Flag, MessageSquareText, Newspaper, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useLookups } from "@/lib/hooks";
import { weeklyRecap } from "@/lib/selectors/recap";
import { fmtDate, fmtTime } from "@/lib/dates";
import { firstName, pluralize } from "@/lib/utils";

export function RecapView() {
  const { ws, me } = useReadyWorkspace();
  const { people, projects } = useLookups();
  const recap = React.useMemo(() => weeklyRecap(ws, me.id, new Date()), [ws, me.id]);
  const range = `${format(recap.start, "d MMM")} – ${format(recap.end, "d MMM yyyy")}`;

  const stats = [
    { label: "Tasks completed", value: recap.completed.length, icon: CheckCircle2, hint: `${recap.completedByMe} by you` },
    { label: "Meetings held", value: recap.meetingsHeld.length, icon: CalendarCheck, hint: "confirmed and finished" },
    { label: "Updates posted", value: recap.updatesPosted, icon: MessageSquareText, hint: "across your projects" },
    { label: "Due in 7 days", value: recap.nextWeek.deadlines.length, icon: Flag, hint: "deadlines and key tasks" },
  ];

  const asText = () => {
    const lines = [`NOVA SYNC weekly recap (${range})`, ""];
    lines.push(`${pluralize(recap.completed.length, "task")} completed, ${pluralize(recap.meetingsHeld.length, "meeting")} held.`, "");
    for (const p of recap.projects) {
      const proj = projects.get(p.projectId);
      if (!proj) continue;
      lines.push(`${proj.name}: ${p.startPct}% → ${p.endPct}%`);
      for (const t of p.completed) lines.push(`  ✓ ${t.title}${t.assigneeId ? ` (${firstName(people.get(t.assigneeId)?.name ?? "")})` : ""}`);
    }
    if (recap.nextWeek.deadlines.length) {
      lines.push("", "Next 7 days:");
      for (const d of recap.nextWeek.deadlines) lines.push(`  • ${fmtDate(d.date)}: ${d.title}`);
    }
    return lines.join("\n");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      toast.success("Recap copied to your clipboard");
    } catch {
      toast.error("Your browser blocked clipboard access");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<span className="text-[12px] font-semibold text-primary">{range}</span>}
        title="Weekly Recap"
        description="What your teams got done in the last 7 days and what's coming in the next 7. Built from your workspace data."
        actions={
          <Button variant="outline" onClick={copy}>
            <ClipboardCopy /> Copy as text
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5"
          >
            <s.icon className="size-4 text-primary" />
            <p className="mt-3 text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-[13px] font-medium">{s.label}</p>
            <p className="text-[11.5px] text-muted-foreground">{s.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4" aria-labelledby="recap-projects">
          <h2 id="recap-projects" className="text-[15px] font-semibold">
            By project
          </h2>
          {recap.projects.length === 0 && <EmptyState icon={Newspaper} title="No projects yet" description="Join or create a project to get a weekly recap." />}
          {recap.projects.map((p) => {
            const proj = projects.get(p.projectId);
            if (!proj) return null;
            const top = p.topContributorId ? people.get(p.topContributorId) : null;
            const delta = p.endPct - p.startPct;
            return (
              <div key={p.projectId} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/projects/${proj.id}`} className="text-[14.5px] font-semibold hover:underline">
                    {proj.emoji} {proj.name}
                  </Link>
                  <span className="text-[12.5px] text-muted-foreground tabular-nums">
                    {p.startPct}% → <span className="font-semibold text-foreground">{p.endPct}%</span>
                    {delta > 0 && <span className="ml-1.5 font-semibold text-emerald-600">+{delta}</span>}
                  </span>
                </div>
                <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: `${p.endPct}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${p.startPct}%` }} />
                </div>
                {p.completed.length === 0 ? (
                  <p className="mt-3 text-[13px] text-muted-foreground">No tasks completed this week yet.</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {p.completed.map((t) => {
                      const who = t.assigneeId ? people.get(t.assigneeId) : undefined;
                      return (
                        <li key={t.id} className="flex items-center gap-2.5 text-[13px]">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                          <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          {who && <Avatar person={who} size="xs" />}
                          <span className="shrink-0 text-[11.5px] text-muted-foreground">{t.completedAt && format(new Date(t.completedAt), "EEE")}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {top && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[12px] font-medium text-amber-700 dark:text-amber-300">
                    <Trophy className="size-3.5" /> {top.id === me.id ? "You" : firstName(top.name)} closed the most tasks
                  </p>
                )}
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="text-[14px] font-semibold">Coming up in the next 7 days</h2>
            {recap.nextWeek.deadlines.length + recap.nextWeek.meetings.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted-foreground">Nothing scheduled yet.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {recap.nextWeek.meetings.map((m) => (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}`} className="flex items-start gap-2.5 text-[13px] hover:underline">
                      <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        {m.title}
                        <span className="block text-[11.5px] text-muted-foreground">
                          {fmtDate(m.confirmedStart!)} · {fmtTime(m.confirmedStart!)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {recap.nextWeek.deadlines.map((d) => (
                  <li key={d.id}>
                    <Link href={d.href} className="flex items-start gap-2.5 text-[13px] hover:underline">
                      <Flag className="mt-0.5 size-4 shrink-0 text-rose-500" />
                      <span>
                        {d.title}
                        <span className="block text-[11.5px] text-muted-foreground">
                          {fmtDate(d.date)} · {projects.get(d.projectId)?.name}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="text-[14px] font-semibold">Meetings held</h2>
            {recap.meetingsHeld.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted-foreground">No meetings finished yet this week.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recap.meetingsHeld.map((m) => (
                  <li key={m.id} className="text-[13px]">
                    <Link href={`/meetings/${m.id}`} className="hover:underline">
                      {m.title}
                    </Link>
                    <span className="block text-[11.5px] text-muted-foreground">{fmtDate(m.confirmedStart!)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
