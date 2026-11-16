"use client";

import * as React from "react";
import { format } from "date-fns";
import { cellsForDay } from "@/lib/scheduling/matcher";
import { parseLocalKey } from "@/lib/dates";
import type { Meeting, Profile } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";

export type GridMode = "edit" | "group";

interface Props {
  meeting: Meeting;
  mode: GridMode;
  /** Cells selected by the person responding (edit mode). */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** cell key → profiles available there (group mode). */
  whoByCell: Map<string, Profile[]>;
  totalInvitees: number;
  /** Cells covered by the best suggestion, outlined in both modes. */
  highlight?: Set<string>;
  /** Cells where the responding person already has a confirmed meeting. */
  busyCells?: Map<string, string>;
  readOnly?: boolean;
}

/**
 * Weekly availability grid. Mouse/pen: press and drag to paint or erase.
 * Touch: tap cells (so the grid can still scroll). Keyboard: every cell is a
 * toggle button.
 */
export function AvailabilityGrid({
  meeting,
  mode,
  selected,
  onChange,
  whoByCell,
  totalInvitees,
  highlight,
  busyCells,
  readOnly,
}: Props) {
  const days = meeting.candidateDates;
  const rows = React.useMemo(() => cellsForDay(days[0], meeting.dayStartHour, meeting.dayEndHour, meeting.slotMinutes).map((k) => k.slice(11)), [days, meeting.dayStartHour, meeting.dayEndHour, meeting.slotMinutes]);
  const [hover, setHover] = React.useState<string | null>(null);
  const paint = React.useRef<{ value: boolean; draft: Set<string> } | null>(null);
  const editing = mode === "edit" && !readOnly;

  const apply = React.useCallback(
    (key: string) => {
      const p = paint.current;
      if (!p) return;
      const has = p.draft.has(key);
      if (p.value === has) return;
      const next = new Set(p.draft);
      if (p.value) next.add(key);
      else next.delete(key);
      p.draft = next;
      onChange(next);
    },
    [onChange],
  );

  React.useEffect(() => {
    const stop = () => {
      paint.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  const toggleDay = (day: string) => {
    if (!editing) return;
    const keys = rows.map((t) => `${day}T${t}`);
    const all = keys.every((k) => selected.has(k));
    const next = new Set(selected);
    for (const k of keys) {
      if (all) next.delete(k);
      else next.add(k);
    }
    onChange(next);
  };

  const hoverWho = hover ? (whoByCell.get(hover) ?? []) : [];

  return (
    <div className="relative">
      <div className="no-scrollbar overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <div
          className="grid min-w-fit select-none"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(4.25rem, 1fr))` }}
          role="grid"
          aria-label={editing ? "Your availability. Select the times you're free." : "Group availability heatmap"}
          onPointerMove={(e) => {
            if (!paint.current || e.pointerType === "touch") return;
            const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            const key = el?.closest<HTMLElement>("[data-cell]")?.dataset.cell;
            if (key) apply(key);
          }}
        >
          <div className="sticky left-0 z-20 border-b bg-card" role="columnheader" />
          {days.map((d) => {
            const date = parseLocalKey(d);
            return (
              <button
                key={d}
                type="button"
                role="columnheader"
                onClick={() => toggleDay(d)}
                disabled={!editing}
                className={cn("border-b border-l px-1 py-2 text-center", editing && "cursor-pointer hover:bg-secondary/60")}
                title={editing ? "Toggle the whole day" : undefined}
              >
                <span className="block text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">{format(date, "EEE")}</span>
                <span className="block text-[15px] font-semibold tabular-nums">{format(date, "d")}</span>
                <span className="block text-[10px] text-muted-foreground">{format(date, "MMM")}</span>
              </button>
            );
          })}

          {rows.map((time, ri) => (
            <React.Fragment key={time}>
              <div
                className={cn(
                  "sticky left-0 z-10 border-r bg-card pr-2 text-right text-[10.5px] text-muted-foreground tabular-nums",
                  time.endsWith(":00") ? "pt-0.5" : "",
                )}
                role="rowheader"
              >
                {time.endsWith(":00") ? time : ""}
              </div>
              {days.map((d) => {
                const key = `${d}T${time}`;
                const who = whoByCell.get(key) ?? [];
                const count = who.length;
                const isSel = selected.has(key);
                const isBest = highlight?.has(key);
                const busy = busyCells?.get(key);
                const ratio = totalInvitees ? count / totalInvitees : 0;
                const hourLine = time.endsWith(":00") && ri > 0;
                return (
                  <button
                    key={key}
                    type="button"
                    data-cell={key}
                    role="gridcell"
                    aria-selected={editing ? isSel : undefined}
                    aria-label={`${format(parseLocalKey(key), "EEEE d MMMM, HH:mm")}${editing ? (isSel ? ", available" : ", not available") : `, ${count} of ${totalInvitees} available`}${busy ? `, conflicts with ${busy}` : ""}`}
                    disabled={readOnly && mode === "edit"}
                    onPointerDown={(e) => {
                      if (!editing || e.pointerType === "touch") return;
                      e.preventDefault();
                      paint.current = { value: !selected.has(key), draft: new Set(selected) };
                      apply(key);
                    }}
                    onClick={(e) => {
                      // keyboard (detail 0) and touch taps toggle; mouse is handled by pointerdown
                      if (!editing) return;
                      const native = e.nativeEvent as PointerEvent;
                      if (e.detail === 0 || native.pointerType === "touch") toggle(key);
                    }}
                    onPointerEnter={() => setHover(key)}
                    onPointerLeave={() => setHover((h) => (h === key ? null : h))}
                    onFocus={() => setHover(key)}
                    className={cn(
                      "relative h-6 border-l outline-none transition-colors duration-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring",
                      hourLine ? "border-t border-t-border" : "border-t border-t-border/40",
                      editing ? "cursor-pointer" : "cursor-default",
                      editing && !isSel && "hover:bg-primary/10",
                    )}
                    style={{
                      background: editing
                        ? isSel
                          ? "color-mix(in oklab, var(--brand) 78%, var(--lavender))"
                          : busy
                            ? "repeating-linear-gradient(135deg, color-mix(in oklab, var(--warning) 14%, transparent) 0 4px, transparent 4px 8px)"
                            : undefined
                        : count
                          ? `color-mix(in oklab, var(--success) ${Math.round(18 + ratio * 70)}%, var(--card))`
                          : undefined,
                    }}
                  >
                    {isBest && (
                      <span
                        className={cn(
                          "pointer-events-none absolute inset-0 border-x-2 border-navy dark:border-white",
                          !highlight?.has(`${d}T${rows[ri - 1]}`) && "rounded-t-sm border-t-2",
                          !highlight?.has(`${d}T${rows[ri + 1]}`) && "rounded-b-sm border-b-2",
                        )}
                      />
                    )}
                    {!editing && count > 0 && ratio === 1 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">ALL</span>}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Hover/focus detail */}
      <div className="mt-3 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground" aria-live="polite">
        {hover ? (
          <>
            <span className="font-medium text-foreground">{format(parseLocalKey(hover), "EEEE, HH:mm")}</span>
            <span>
              {hoverWho.length}/{totalInvitees} available
            </span>
            {hoverWho.length > 0 && <span className="truncate">{hoverWho.map((p) => firstName(p.name)).join(", ")}</span>}
            {busyCells?.get(hover) && <span className="text-amber-600">Conflicts with “{busyCells.get(hover)}”</span>}
          </>
        ) : editing ? (
          <span>{`Click and drag to paint the times you're free. On touch screens, tap cells. Tap a day header to toggle the whole day.`}</span>
        ) : (
          <span>Darker green means more teammates are free. Hover a cell to see who.</span>
        )}
      </div>
    </div>
  );
}
