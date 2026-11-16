"use client";

import * as React from "react";
import { CalendarCheck, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
type Key = `${number}-${number}`;
const k = (d: number, h: number): Key => `${d}-${h}`;

function range(d: number, from: number, to: number) {
  const out: Key[] = [];
  for (let h = from; h < to; h++) out.push(k(d, h));
  return out;
}

const TEAM: { name: string; color: string; slots: Set<Key> }[] = [
  { name: "Maria", color: "#8B5CF6", slots: new Set([...range(0, 9, 12), ...range(1, 14, 18), ...range(2, 10, 13), ...range(3, 15, 18), ...range(4, 9, 11)]) },
  { name: "João", color: "#0EA5E9", slots: new Set([...range(0, 10, 12), ...range(1, 15, 18), ...range(2, 9, 11), ...range(3, 13, 17), ...range(4, 13, 16)]) },
  { name: "Sarah", color: "#EC4899", slots: new Set([...range(0, 9, 10), ...range(1, 14, 15), ...range(2, 14, 18), ...range(3, 15, 18), ...range(4, 10, 12)]) },
];

/**
 * Self-contained version of the scheduler: three teammates have answered,
 * you paint your own availability and the ranking updates live. It uses the
 * same idea as the real matcher (most people free, then earliest).
 */
export function ScheduleDemo() {
  const [mine, setMine] = React.useState<Set<Key>>(() => new Set());
  const paint = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    const up = () => (paint.current = null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const set = (key: Key, value: boolean) =>
    setMine((cur) => {
      if (cur.has(key) === value) return cur;
      const next = new Set(cur);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });

  const ranked = React.useMemo(() => {
    const rows: { key: Key; d: number; h: number; who: string[] }[] = [];
    DAYS.forEach((_, d) =>
      HOURS.forEach((h) => {
        const who = TEAM.filter((t) => t.slots.has(k(d, h))).map((t) => t.name);
        if (mine.has(k(d, h))) who.push("You");
        rows.push({ key: k(d, h), d, h, who });
      }),
    );
    return rows.filter((r) => r.who.length > 0).sort((a, b) => b.who.length - a.who.length || a.d - b.d || a.h - b.h);
  }, [mine]);
  const best = ranked[0];
  const alts = ranked.slice(1, 3);
  const total = TEAM.length + 1;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold">Survey results debrief</p>
            <p className="text-[11.5px] text-muted-foreground">1 hour · Marketing Strategy · 3 of 4 responded</p>
          </div>
          <button
            type="button"
            onClick={() => setMine(new Set())}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Clear
          </button>
        </div>
        <div className="no-scrollbar overflow-x-auto p-3">
          <div className="grid min-w-[420px] select-none gap-px" style={{ gridTemplateColumns: `2.75rem repeat(${DAYS.length}, 1fr)` }} role="grid" aria-label="Demo availability grid. Toggle the hours you're free.">
            <div />
            {DAYS.map((d) => (
              <div key={d} className="pb-1.5 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase" role="columnheader">
                {d}
              </div>
            ))}
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <div className="pr-2 text-right text-[10.5px] leading-7 text-muted-foreground tabular-nums" role="rowheader">
                  {String(h).padStart(2, "0")}:00
                </div>
                {DAYS.map((day, d) => {
                  const key = k(d, h);
                  const others = TEAM.filter((t) => t.slots.has(key)).length;
                  const on = mine.has(key);
                  const count = others + (on ? 1 : 0);
                  const isBest = best?.key === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      aria-selected={on}
                      aria-label={`${day} ${h}:00, ${count} of ${total} free${on ? ", including you" : ""}`}
                      onPointerDown={(e) => {
                        if (e.pointerType === "touch") return;
                        e.preventDefault();
                        paint.current = !on;
                        set(key, !on);
                      }}
                      onPointerEnter={() => paint.current !== null && set(key, paint.current)}
                      onClick={(e) => {
                        if (e.detail === 0 || (e.nativeEvent as PointerEvent).pointerType === "touch") set(key, !on);
                      }}
                      className={cn(
                        "relative h-7 cursor-pointer rounded-[5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        !count && "bg-secondary/60 hover:bg-primary/10",
                      )}
                      style={count ? { background: `color-mix(in oklab, var(--success) ${Math.round(15 + (count / total) * 75)}%, var(--card))` } : undefined}
                    >
                      {on && <span className="absolute inset-1 rounded-[3px] border-2 border-white/90" aria-hidden />}
                      {isBest && <span className="absolute -inset-px rounded-[6px] ring-2 ring-navy dark:ring-white" aria-hidden />}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t px-4 py-2.5 text-[11.5px] text-muted-foreground">
          {TEAM.map((t) => (
            <span key={t.name} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: t.color }} /> {t.name} answered
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2 rounded-full bg-primary" /> You: click or drag
          </span>
        </div>
      </div>

      <div className="space-y-3" aria-live="polite">
        {best && (
          <div className="rounded-2xl border border-primary/30 bg-card p-4 shadow-soft">
            <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wider text-primary uppercase">
              <Sparkles className="size-3.5" /> Best match
            </p>
            <p className="mt-1.5 text-lg font-semibold">
              {DAYS[best.d]} · {best.h}:00 – {best.h + 1}:00
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(best.who.length / total) * 100}%` }} />
              </div>
              <span className="text-[12px] font-semibold tabular-nums">{Math.round((best.who.length / total) * 100)}%</span>
            </div>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              {best.who.length === total ? "Everyone is free." : `${best.who.join(", ")} free.`}
              {!best.who.includes("You") && " Waiting for you."}
            </p>
            <button
              type="button"
              disabled={best.who.length < total}
              className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-[13px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-navy"
              onClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })}
            >
              <CalendarCheck className="size-4" /> {best.who.length < total ? "Mark your time to unlock" : "Looks good. Try the real one"}
            </button>
          </div>
        )}
        {alts.map((a) => (
          <div key={a.key} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-[13px] shadow-soft">
            <span>
              {DAYS[a.d]} · {a.h}:00
            </span>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {a.who.length}/{total} free
            </span>
          </div>
        ))}
        <p className="px-1 text-[12px] text-muted-foreground">
          Tip: Thursday afternoon is when Maria, João and Sarah overlap. Paint 15:00 or 16:00 on Thursday and watch it become a 100% match.
        </p>
      </div>
    </div>
  );
}
