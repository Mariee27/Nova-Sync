"use client";

import * as React from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, MessageSquare, Plus, Rows3 } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Avatar } from "@/components/ui/avatar";
import { Hint } from "@/components/ui/tooltip";
import { DueLabel, PRIORITY_STYLE, PriorityTag, STATUS_STYLE } from "@/components/shared/task-meta";
import { STATUS_LABEL, TASK_STATUSES, type Task, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Columns = Record<TaskStatus, string[]>;

function buildColumns(tasks: Task[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], in_review: [], done: [] };
  for (const t of [...tasks].sort((a, b) => a.order - b.order)) cols[t.status].push(t.id);
  // Done is always "most recently completed first".
  const byId = new Map(tasks.map((t) => [t.id, t]));
  cols.done.sort((a, b) => (byId.get(b)?.completedAt ?? "").localeCompare(byId.get(a)?.completedAt ?? ""));
  return cols;
}

function findColumn(cols: Columns, id: string): TaskStatus | undefined {
  if ((TASK_STATUSES as string[]).includes(id)) return id as TaskStatus;
  return TASK_STATUSES.find((s) => cols[s].includes(id));
}

export function TaskCard({ task, overlay, onOpen }: { task: Task; overlay?: boolean; onOpen?: () => void }) {
  const { ws } = useReadyWorkspace();
  const assignee = ws.profiles.find((p) => p.id === task.assigneeId);
  const subs = ws.subtasks.filter((s) => s.taskId === task.id);
  const subsDone = subs.filter((s) => s.done).length;
  const comments = ws.comments.filter((c) => c.taskId === task.id).length;
  const done = task.status === "done";
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-3 text-left shadow-soft transition-shadow",
        overlay ? "rotate-[1.5deg] cursor-grabbing shadow-lift ring-2 ring-primary/30" : "hover:shadow-lift",
      )}
    >
      <span className={cn("absolute inset-y-2 left-0 w-[3px] rounded-r-full", PRIORITY_STYLE[task.priority].dot)} aria-hidden />
      <button
        type="button"
        onClick={onOpen}
        // Let Enter/Space open the task instead of starting a keyboard drag on the card.
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") e.stopPropagation();
        }}
        className="block w-full cursor-pointer pl-1.5 text-left outline-none after:absolute after:inset-0 focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring/40"
      >
        <p className={cn("text-[13.5px] leading-snug font-medium", done && "text-muted-foreground line-through decoration-muted-foreground/50")}>{task.title}</p>
      </button>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-1.5">
        <PriorityTag priority={task.priority} />
        <DueLabel date={task.dueDate} done={done} />
      </div>
      <div className="mt-2.5 flex items-center justify-between pl-1.5">
        <div className="flex items-center gap-2.5 text-[11.5px] text-muted-foreground">
          {subs.length > 0 && (
            <span className={cn("inline-flex items-center gap-1 tabular-nums", subsDone === subs.length && "text-emerald-600")}>
              <CheckCircle2 className="size-3.5" />
              {subsDone}/{subs.length}
            </span>
          )}
          {comments > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageSquare className="size-3.5" />
              {comments}
            </span>
          )}
        </div>
        {assignee ? (
          <Avatar person={assignee} size="sm" />
        ) : (
          <span className="rounded-full border border-dashed px-1.5 py-0.5 text-[10.5px] text-muted-foreground">Unassigned</span>
        )}
      </div>
    </div>
  );
}

function SortableCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-manipulation", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable task"
      aria-label={`${task.title}. Press space to pick up, arrow keys to move, space to drop.`}
    >
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}

function Column({
  status,
  tasks,
  onOpen,
  projectId,
}: {
  status: TaskStatus;
  tasks: Task[];
  onOpen: (id: string) => void;
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const ui = useUI();
  const [showAll, setShowAll] = React.useState(false);
  const DONE_LIMIT = 4;
  const capped = status === "done" && !showAll && tasks.length > DONE_LIMIT + 1;
  const shown = capped ? tasks.slice(0, DONE_LIMIT) : tasks;
  return (
    <section
      aria-label={`${STATUS_LABEL[status]} column`}
      className={cn(
        "flex w-[82vw] shrink-0 snap-start flex-col rounded-2xl border border-transparent p-2 transition-colors sm:w-72 lg:w-auto lg:min-w-0 lg:flex-1",
        STATUS_STYLE[status].bg,
        isOver && "border-primary/30",
      )}
    >
      <header className="flex items-center justify-between px-1.5 pt-1 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", STATUS_STYLE[status].dot)} />
          <h3 className="text-[13px] font-semibold">{STATUS_LABEL[status]}</h3>
          <span className="rounded-full bg-card px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums shadow-soft">{tasks.length}</span>
        </div>
        <Hint label={`Add to ${STATUS_LABEL[status]}`}>
          <button
            type="button"
            onClick={() => ui.open({ kind: "task", projectId, status })}
            className="cursor-pointer rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label={`Add task to ${STATUS_LABEL[status]}`}
          >
            <Plus className="size-4" />
          </button>
        </Hint>
      </header>
      <SortableContext id={status} items={shown.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
          {shown.map((t) => (
            <SortableCard key={t.id} task={t} onOpen={() => onOpen(t.id)} />
          ))}
          {capped && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="cursor-pointer rounded-lg border border-dashed border-foreground/10 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
            >
              Show {tasks.length - DONE_LIMIT} earlier completed
            </button>
          )}
          {tasks.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-8 text-center text-[12px] text-muted-foreground">
              <Rows3 className="mb-1.5 size-4 opacity-60" />
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

/**
 * Kanban board with drag-and-drop between and within columns.
 * `visible` is the filtered task list; drops are translated back into a
 * position within the full column so filtering never scrambles the order.
 */
export function KanbanBoard({
  projectId,
  visible,
  onOpen,
}: {
  projectId: string;
  visible: Task[];
  onOpen: (id: string) => void;
}) {
  const { ws, run } = useReadyWorkspace();
  const [columns, setColumns] = React.useState<Columns>(() => buildColumns(visible));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const dragging = activeId !== null;

  // Sync from the store whenever it changes, but never mid-drag.
  const [syncedFrom, setSyncedFrom] = React.useState(visible);
  if (!dragging && syncedFrom !== visible) {
    setSyncedFrom(visible);
    setColumns(buildColumns(visible));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = React.useMemo(() => new Map(ws.tasks.map((t) => [t.id, t])), [ws.tasks]);
  const activeTask = activeId ? byId.get(activeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findColumn(columns, String(active.id));
    const to = findColumn(columns, String(over.id));
    if (!from || !to || from === to) return;
    setColumns((cols) => {
      const fromItems = cols[from].filter((id) => id !== active.id);
      const toItems = [...cols[to]];
      const overIndex = toItems.indexOf(String(over.id));
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, String(active.id));
      return { ...cols, [from]: fromItems, [to]: toItems };
    });
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    setActiveId(null);
    if (!over) {
      setColumns(buildColumns(visible));
      return;
    }
    const to = findColumn(columns, id);
    if (!to) return;
    let visibleOrder = columns[to];
    const overId = String(over.id);
    if (visibleOrder.includes(overId) && overId !== id) {
      const fromIdx = visibleOrder.indexOf(id);
      const toIdx = visibleOrder.indexOf(overId);
      visibleOrder = [...visibleOrder];
      visibleOrder.splice(fromIdx, 1);
      visibleOrder.splice(toIdx, 0, id);
      setColumns((c) => ({ ...c, [to]: visibleOrder }));
    }
    // Translate the visible position into a position in the full column.
    const full = ws.tasks
      .filter((t) => t.projectId === projectId && t.status === to && t.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((t) => t.id);
    const pos = visibleOrder.indexOf(id);
    const prev = visibleOrder[pos - 1];
    const index = prev ? full.indexOf(prev) + 1 : 0;
    const task = byId.get(id)!;
    const currentIndex = full.filter((fid) => (byId.get(fid)?.order ?? 0) < task.order).length;
    if (task.status === to && currentIndex === index) return;
    const r = await run(
      { type: "task.move", id, status: to, index },
      { success: task.status !== to ? (to === "done" ? `Completed “${task.title}” 🎉` : `Moved to ${STATUS_LABEL[to]}`) : undefined },
    );
    if (!r) setColumns(buildColumns(visible));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setColumns(buildColumns(visible));
      }}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${byId.get(String(active.id))?.title}.`,
          onDragOver: ({ over }) => (over ? `Over ${STATUS_LABEL[findColumn(columns, String(over.id)) ?? "todo"]}.` : ""),
          onDragEnd: ({ over }) => (over ? `Dropped in ${STATUS_LABEL[findColumn(columns, String(over.id)) ?? "todo"]}.` : "Dropped."),
          onDragCancel: () => "Move cancelled.",
        },
      }}
    >
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:overflow-visible">
        {TASK_STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            projectId={projectId}
            tasks={columns[s].map((id) => byId.get(id)).filter((t): t is Task => !!t)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeTask ? <TaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
