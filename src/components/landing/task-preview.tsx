"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Check, MessageSquare, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Col = "todo" | "doing" | "done";
interface Card {
  id: string;
  title: string;
  who: string;
  color: string;
  due: string;
  priority: "High" | "Urgent" | "Medium";
  col: Col;
  comments?: number;
}

const INITIAL: Card[] = [
  { id: "a", title: "Final presentation deck", who: "AC", color: "#2563EB", due: "In 2 days", priority: "High", col: "todo" },
  { id: "b", title: "Executive summary", who: "SL", color: "#EC4899", due: "In 3 days", priority: "Medium", col: "todo" },
  { id: "c", title: "Campaign concept & media plan", who: "MS", color: "#8B5CF6", due: "Yesterday", priority: "Urgent", col: "doing", comments: 3 },
  { id: "d", title: "Budget & KPI dashboard", who: "AC", color: "#2563EB", due: "Tomorrow", priority: "High", col: "doing", comments: 1 },
  { id: "e", title: "Pricing strategy", who: "SL", color: "#EC4899", due: "Done", priority: "High", col: "done" },
];
const COLS: { id: Col; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
];
const BASE_DONE = 7; // tasks already finished outside this preview
const BASE_TOTAL = 12;

export function TaskPreview() {
  const [cards, setCards] = React.useState(INITIAL);
  const done = BASE_DONE + cards.filter((c) => c.col === "done").length;
  const pct = done === BASE_TOTAL ? 100 : Math.min(99, Math.round((done / BASE_TOTAL) * 100));
  const advance = (id: string) =>
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, col: c.col === "todo" ? "doing" : c.col === "doing" ? "done" : "todo" } : c)));

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Marketing Strategy · Group 04</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
              <motion.div className="h-full rounded-full bg-brand-gradient" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
            </div>
            <span className="text-[12px] font-semibold tabular-nums">{pct}%</span>
            <span className="text-[11.5px] text-muted-foreground">
              {done}/{BASE_TOTAL} tasks
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCards(INITIAL)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
      </div>
      <LayoutGroup>
        <div className="grid gap-3 sm:grid-cols-3">
          {COLS.map((col) => {
            const list = cards.filter((c) => c.col === col.id);
            return (
              <div key={col.id} className="rounded-xl bg-secondary/50 p-2.5">
                <p className="mb-2 flex items-center justify-between px-1 text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {col.label} <span className="tabular-nums">{list.length}</span>
                </p>
                <div className="min-h-16 space-y-2">
                  <AnimatePresence initial={false}>
                    {list.map((c) => (
                      <motion.button
                        layout
                        layoutId={c.id}
                        key={c.id}
                        type="button"
                        onClick={() => advance(c.id)}
                        className="block w-full cursor-pointer rounded-lg border bg-card p-2.5 text-left shadow-soft transition-shadow hover:shadow-lift"
                        aria-label={`${c.title}. Move to ${c.col === "todo" ? "In progress" : c.col === "doing" ? "Done" : "To do"}`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                              c.col === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40",
                            )}
                          >
                            {c.col === "done" && <Check className="size-2.5" strokeWidth={3} />}
                          </span>
                          <span className={cn("text-[12.5px] leading-snug font-medium", c.col === "done" && "text-muted-foreground line-through")}>{c.title}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 pl-6 text-[11px]">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-medium",
                              c.priority === "Urgent" ? "bg-rose-500/10 text-rose-600" : c.priority === "High" ? "bg-amber-500/10 text-amber-700" : "bg-secondary text-muted-foreground",
                            )}
                          >
                            {c.priority}
                          </span>
                          <span className={cn("text-muted-foreground", c.due === "Yesterday" && c.col !== "done" && "font-medium text-rose-600")}>{c.col === "done" ? "Done" : c.due}</span>
                          {c.comments && (
                            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                              <MessageSquare className="size-3" /> {c.comments}
                            </span>
                          )}
                          <span className="ml-auto flex size-5 items-center justify-center rounded-full text-[9px] font-semibold text-white" style={{ background: c.color }}>
                            {c.who}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </LayoutGroup>
      <p className="mt-3 text-[12px] text-muted-foreground">Click a card to move it along. Progress comes straight from task status, never typed in by hand.</p>
    </div>
  );
}
