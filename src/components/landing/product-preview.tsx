import { AlarmClock, CalendarDays, CheckCircle2, FolderKanban, LayoutDashboard, ListTodo, Sparkles, Users } from "lucide-react";

const PROJECTS = [
  { name: "Marketing Strategy — Group 04", pct: 67, due: "Due in 3 days", health: "At risk", tone: "text-amber-700 bg-amber-500/12", bar: "#2563EB" },
  { name: "Business Analytics — Final Project", pct: 75, due: "Due in 16 days", health: "On track", tone: "text-emerald-700 bg-emerald-500/12", bar: "#8B5CF6" },
  { name: "Entrepreneurship — Startup Pitch", pct: 20, due: "Due in 30 days", health: "At risk", tone: "text-amber-700 bg-amber-500/12", bar: "#F97316" },
];

/** A faithful, static rendering of the Sync Dashboard for the hero. */
export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="pointer-events-none absolute -inset-x-10 -top-10 -bottom-20 rounded-[48px] bg-brand-gradient opacity-[0.16] blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border bg-background shadow-[0_30px_80px_-20px_rgba(16,24,40,0.35)]" role="img" aria-label="Preview of the NOVA SYNC dashboard showing three projects, their progress and a deadline warning">
        <div className="flex items-center gap-1.5 border-b bg-card px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="mx-auto hidden rounded-md bg-secondary px-16 py-1 text-[11px] text-muted-foreground sm:block">novasync.app/dashboard</span>
        </div>
        <div className="flex">
          <aside className="hidden w-48 shrink-0 border-r bg-card p-3 md:block">
            {[
              [LayoutDashboard, "Dashboard", true],
              [FolderKanban, "Projects"],
              [ListTodo, "My Tasks"],
              [CalendarDays, "Calendar"],
              [Users, "Meetings"],
              [Sparkles, "Sync Intelligence"],
            ].map(([Icon, label, active]) => {
              const I = Icon as typeof LayoutDashboard;
              return (
                <div key={label as string} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
                  <I className="size-3.5" /> {label as string}
                </div>
              );
            })}
          </aside>
          <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-5">
            <div>
              <p className="text-[11px] text-muted-foreground">Sync Dashboard</p>
              <p className="text-[17px] font-semibold tracking-tight">Good morning, Alex</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Due this week", "6", "2 overdue"],
                ["Next meeting", "Tomorrow", "Weekly sync · 10:00"],
                ["Completed", "17", "last 30 days"],
                ["Open polls", "1", "needs your time"],
              ].map(([l, v, h]) => (
                <div key={l} className="rounded-xl border bg-card p-3 shadow-soft">
                  <p className="text-[10.5px] text-muted-foreground">{l}</p>
                  <p className="mt-0.5 text-[15px] font-semibold">{v}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{h}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px]">
              <div className="space-y-2 rounded-xl border bg-card p-3 shadow-soft">
                <p className="text-[12px] font-semibold">Your projects</p>
                {PROJECTS.map((p) => (
                  <div key={p.name} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11.5px] font-medium">{p.name}</p>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${p.tone}`}>{p.health}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.bar }} />
                      </div>
                      <span className="text-[10.5px] font-semibold tabular-nums">{p.pct}%</span>
                      <span className="hidden text-[10px] text-muted-foreground sm:inline">{p.due}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-xl border bg-card p-3 shadow-soft">
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-rose-500" />
                  <p className="flex items-center gap-1 text-[9.5px] font-semibold tracking-wider text-rose-600 uppercase">
                    <AlarmClock className="size-3" /> Critical
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug font-medium">Your Marketing Strategy deadline is in 3 days, but 4 tasks are still incomplete.</p>
                </div>
                <div className="rounded-xl border bg-card p-3 shadow-soft">
                  <p className="text-[11px] font-semibold">Today</p>
                  {["Budget & KPI dashboard", "Review: Channel plan", "Final presentation deck"].map((t, i) => (
                    <p key={t} className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className={`size-3.5 ${i === 0 ? "text-emerald-500" : "text-muted-foreground/40"}`} /> <span className="truncate">{t}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
