"use client";

import * as React from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Pencil, Plus } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { useMediaQuery } from "@/lib/hooks";
import { calendarItems, KIND_LABEL, type CalendarItem, type CalendarKind } from "@/lib/selectors/calendar";
import { dayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "agenda";

const KIND_STYLE: Record<CalendarKind, { chip: string; dot: string; block: string }> = {
  meeting: { chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300", dot: "bg-cat-meeting", block: "border-l-cat-meeting bg-blue-500/10" },
  deadline: { chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300", dot: "bg-cat-deadline", block: "border-l-cat-deadline bg-rose-500/10" },
  task: { chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300", dot: "bg-cat-task", block: "border-l-cat-task bg-violet-500/10" },
  milestone: { chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-cat-milestone", block: "border-l-cat-milestone bg-emerald-500/10" },
  event: { chip: "bg-amber-500/12 text-amber-800 dark:text-amber-300", dot: "bg-cat-event", block: "border-l-cat-event bg-amber-500/12" },
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00–21:00
const HOUR_PX = 48;

function Chip({ item, onClick, compact }: { item: CalendarItem; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:brightness-95",
        KIND_STYLE[item.kind].chip,
        item.done && "line-through opacity-60",
      )}
      title={item.title}
    >
      {!item.allDay && !compact && <span className="shrink-0 tabular-nums opacity-80">{format(new Date(item.start), "HH:mm")}</span>}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

export function CalendarView() {
  const { ws, me } = useReadyWorkspace();
  const ui = useUI();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [view, setView] = React.useState<View>("month");
  const [cursor, setCursor] = React.useState(() => startOfDay(new Date()));
  const [hidden, setHidden] = React.useState<Set<CalendarKind>>(new Set());
  const [selected, setSelected] = React.useState<CalendarItem | null>(null);
  const effectiveView: View = isMobile && view === "week" ? "agenda" : view;

  const items = React.useMemo(() => calendarItems(ws, me.id).filter((i) => !hidden.has(i.kind)), [ws, me.id, hidden]);
  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const i of items) {
      const k = dayKey(new Date(i.start));
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    for (const list of map.values()) list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
    return map;
  }, [items]);

  const open = (i: CalendarItem) => setSelected(i);
  const nav = (dir: -1 | 1) =>
    setCursor((c) => (effectiveView === "month" ? addMonths(c, dir) : effectiveView === "week" ? addWeeks(c, dir) : addDays(c, dir * 14)));
  const title =
    effectiveView === "month"
      ? format(cursor, "MMMM yyyy")
      : effectiveView === "week"
        ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy")}`
        : `From ${format(cursor, "d MMMM")}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description="Meetings, deadlines, milestones and due dates across every project."
        actions={
          <Button onClick={() => ui.open({ kind: "event", date: dayKey(cursor) })}>
            <Plus /> New event
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => nav(-1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => nav(1)} aria-label="Next">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>
            Today
          </Button>
          <h2 className="ml-1 text-[17px] font-semibold tracking-tight" aria-live="polite">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show categories">
            {(Object.keys(KIND_LABEL) as CalendarKind[]).map((k) => {
              const on = !hidden.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setHidden((h) => {
                      const n = new Set(h);
                      if (n.has(k)) n.delete(k);
                      else n.add(k);
                      return n;
                    })
                  }
                  className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition", on ? "bg-card" : "opacity-50")}
                >
                  <span className={cn("size-2 rounded-full", KIND_STYLE[k].dot)} />
                  {KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
          <div className="flex rounded-lg border bg-card p-0.5 shadow-soft" role="group" aria-label="Calendar view">
            {(["month", "week", "agenda"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={effectiveView === v}
                onClick={() => setView(v)}
                className={cn(
                  "h-7 cursor-pointer rounded-md px-3 text-[12.5px] font-medium capitalize transition",
                  effectiveView === v ? "bg-secondary" : "text-muted-foreground hover:text-foreground",
                  v === "week" && "hidden md:block",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {effectiveView === "month" && <MonthGrid cursor={cursor} byDay={byDay} onOpen={open} onDay={(d) => ui.open({ kind: "event", date: dayKey(d) })} compact={isMobile} />}
      {effectiveView === "week" && <WeekGrid cursor={cursor} items={items} onOpen={open} />}
      {effectiveView === "agenda" && <Agenda from={cursor} byDay={byDay} onOpen={open} />}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <span className={cn("w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold", KIND_STYLE[selected.kind].chip)}>{KIND_LABEL[selected.kind].replace(/s$/, "")}</span>
                <DialogTitle className={cn(selected.done && "line-through")}>{selected.title}</DialogTitle>
                <DialogDescription>{selected.subtitle}</DialogDescription>
              </DialogHeader>
              <p className="flex items-center gap-2 text-[13.5px]">
                <Clock className="size-4 text-muted-foreground" />
                {selected.allDay
                  ? format(new Date(selected.start), "EEEE, d MMMM")
                  : `${format(new Date(selected.start), "EEEE, d MMMM · HH:mm")}–${format(new Date(selected.end), "HH:mm")}`}
              </p>
              <div className="flex justify-end gap-2">
                {selected.eventId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const id = selected.eventId;
                      setSelected(null);
                      ui.open({ kind: "event", eventId: id });
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                )}
                {selected.href && (
                  <Button asChild>
                    <Link href={selected.href} onClick={() => setSelected(null)}>
                      Open <ArrowRight />
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthGrid({
  cursor,
  byDay,
  onOpen,
  onDay,
  compact,
}: {
  cursor: Date;
  byDay: Map<string, CalendarItem[]>;
  onOpen: (i: CalendarItem) => void;
  onDay: (d: Date) => void;
  compact: boolean;
}) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const max = compact ? 2 : 3;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="grid grid-cols-7 border-b bg-secondary/40">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {compact ? d[0] : d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = byDay.get(dayKey(d)) ?? [];
          const outside = !isSameMonth(d, cursor);
          return (
            <div
              key={d.toISOString()}
              role="button"
              tabIndex={0}
              aria-label={`${format(d, "EEEE d MMMM")}, ${list.length} items. Press Enter to add an event.`}
              onClick={() => onDay(d)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onDay(d);
              }}
              className={cn(
                "group min-h-20 cursor-pointer border-r border-b p-1 transition-colors outline-none last:border-r-0 hover:bg-secondary/40 focus-visible:bg-secondary/60 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                outside && "bg-secondary/20",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums",
                    isToday(d) ? "bg-primary text-primary-foreground" : outside ? "text-muted-foreground/60" : "text-foreground",
                  )}
                >
                  {format(d, "d")}
                </span>
                <Plus className="size-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </div>
              {compact ? (
                <div className="flex flex-wrap gap-0.5 px-0.5">
                  {list.slice(0, 4).map((i) => (
                    <span key={i.id} className={cn("size-1.5 rounded-full", KIND_STYLE[i.kind].dot)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {list.slice(0, max).map((i) => (
                    <Chip key={i.id} item={i} onClick={() => onOpen(i)} />
                  ))}
                  {list.length > max && <p className="px-1.5 text-[10.5px] font-medium text-muted-foreground">+{list.length - max} more</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ cursor, items, onOpen }: { cursor: Date; items: CalendarItem[]; onOpen: (i: CalendarItem) => void }) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const now = new Date();
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b">
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-l py-2 text-center">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{format(d, "EEE")}</p>
            <p className={cn("mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-[14px] font-semibold tabular-nums", isToday(d) && "bg-primary text-primary-foreground")}>{format(d, "d")}</p>
          </div>
        ))}
      </div>
      {/* all-day row */}
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b bg-secondary/20">
        <div className="py-1.5 pr-2 text-right text-[10px] text-muted-foreground">all-day</div>
        {days.map((d) => (
          <div key={d.toISOString()} className="space-y-0.5 border-l p-1">
            {items
              .filter((i) => i.allDay && isSameDay(new Date(i.start), d))
              .map((i) => (
                <Chip key={i.id} item={i} onClick={() => onOpen(i)} compact />
              ))}
          </div>
        ))}
      </div>
      <div className="scrollbar-thin max-h-[560px] overflow-y-auto">
        <div className="relative grid grid-cols-[3.5rem_repeat(7,1fr)]">
          <div>
            {HOURS.map((h) => (
              <div key={h} className="pr-2 text-right text-[10.5px] text-muted-foreground tabular-nums" style={{ height: HOUR_PX }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const timed = items.filter((i) => !i.allDay && isSameDay(new Date(i.start), d));
            return (
              <div key={d.toISOString()} className="relative border-l">
                {HOURS.map((h) => (
                  <div key={h} className="border-b border-border/50" style={{ height: HOUR_PX }} />
                ))}
                {isToday(d) && now.getHours() >= HOURS[0] && now.getHours() <= HOURS.at(-1)! && (
                  <div className="absolute inset-x-0 z-10 h-0.5 bg-rose-500" style={{ top: ((now.getHours() - HOURS[0]) * 60 + now.getMinutes()) * (HOUR_PX / 60) }}>
                    <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-rose-500" />
                  </div>
                )}
                {timed.map((i) => {
                  const s = new Date(i.start);
                  const top = Math.max(0, ((s.getHours() - HOURS[0]) * 60 + s.getMinutes()) * (HOUR_PX / 60));
                  const height = Math.max(22, differenceInMinutes(new Date(i.end), s) * (HOUR_PX / 60) - 2);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => onOpen(i)}
                      className={cn("absolute inset-x-1 cursor-pointer overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] transition hover:brightness-95", KIND_STYLE[i.kind].block)}
                      style={{ top, height }}
                    >
                      <p className="truncate font-semibold">{i.title}</p>
                      <p className="truncate text-muted-foreground tabular-nums">
                        {format(s, "HH:mm")}–{format(new Date(i.end), "HH:mm")}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Agenda({ from, byDay, onOpen }: { from: Date; byDay: Map<string, CalendarItem[]>; onOpen: (i: CalendarItem) => void }) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(from, i)).filter((d) => byDay.has(dayKey(d)));
  if (days.length === 0) return <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Nothing in the next 30 days.</p>;
  return (
    <div className="space-y-3">
      {days.map((d) => (
        <section key={d.toISOString()} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <h3 className={cn("flex items-center gap-2 border-b bg-secondary/30 px-4 py-2 text-[13px] font-semibold", isToday(d) && "text-primary")}>
            {isToday(d) ? "Today" : format(d, "EEEE")} <span className="font-normal text-muted-foreground">{format(d, "d MMMM")}</span>
          </h3>
          <ul>
            {byDay.get(dayKey(d))!.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => onOpen(i)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition hover:bg-secondary/40">
                  <span className={cn("h-8 w-1 shrink-0 rounded-full", KIND_STYLE[i.kind].dot)} />
                  <span className="w-20 shrink-0 text-[12px] text-muted-foreground tabular-nums">{i.allDay ? "All day" : `${format(new Date(i.start), "HH:mm")}–${format(new Date(i.end), "HH:mm")}`}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13.5px] font-medium", i.done && "text-muted-foreground line-through")}>{i.title}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{i.subtitle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
