import Link from "next/link";
import {
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  Flag,
  MessageSquare,
  MousePointerClick,
  PartyPopper,
  Pencil,
  Plus,
  Megaphone,
  UserPlus,
  Users,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import type { ActivityEvent, Profile, Project } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/dates";
import { cn, firstName } from "@/lib/utils";

const ICONS: Record<ActivityEvent["type"], { icon: typeof Plus; tone: string }> = {
  project_created: { icon: Sparkles, tone: "text-violet-500 bg-violet-500/10" },
  member_joined: { icon: UserPlus, tone: "text-sky-500 bg-sky-500/10" },
  task_created: { icon: Plus, tone: "text-slate-500 bg-slate-500/10" },
  task_completed: { icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10" },
  task_moved: { icon: ArrowRightLeft, tone: "text-blue-500 bg-blue-500/10" },
  task_updated: { icon: Pencil, tone: "text-slate-500 bg-slate-500/10" },
  task_assigned: { icon: Users, tone: "text-indigo-500 bg-indigo-500/10" },
  task_commented: { icon: MessageSquare, tone: "text-amber-500 bg-amber-500/10" },
  meeting_proposed: { icon: CalendarPlus, tone: "text-blue-500 bg-blue-500/10" },
  availability_shared: { icon: MousePointerClick, tone: "text-sky-500 bg-sky-500/10" },
  meeting_confirmed: { icon: CalendarCheck2, tone: "text-emerald-500 bg-emerald-500/10" },
  milestone_completed: { icon: Flag, tone: "text-emerald-500 bg-emerald-500/10" },
  update_posted: { icon: Megaphone, tone: "text-violet-500 bg-violet-500/10" },
  event_created: { icon: CalendarPlus, tone: "text-amber-500 bg-amber-500/10" },
  project_completed: { icon: PartyPopper, tone: "text-violet-500 bg-violet-500/10" },
};

export function activityHref(a: ActivityEvent): string {
  if (a.meta.taskId) return `/projects/${a.projectId}/tasks?task=${a.meta.taskId}`;
  if (a.meta.meetingId) return `/meetings/${a.meta.meetingId}`;
  if (a.type === "update_posted") return `/projects/${a.projectId}/activity`;
  return `/projects/${a.projectId}`;
}

export function describeActivity(a: ActivityEvent, people: Map<string, Profile>) {
  const m = a.meta;
  const who = (id?: string) => (id ? firstName(people.get(id)?.name ?? "someone") : "someone");
  switch (a.type) {
    case "task_completed":
      return { verb: "completed", object: m.taskTitle };
    case "task_moved":
      return { verb: `moved to ${m.to ? STATUS_LABEL[m.to] : "a new column"}`, object: m.taskTitle };
    case "task_created":
      return { verb: "created", object: m.taskTitle };
    case "task_updated":
      return { verb: "updated", object: m.taskTitle };
    case "task_assigned":
      return m.assigneeId === a.actorId
        ? { verb: "took ownership of", object: m.taskTitle }
        : { verb: `assigned ${who(m.assigneeId)} to`, object: m.taskTitle };
    case "task_commented":
      return { verb: "commented on", object: m.taskTitle, quote: m.excerpt };
    case "meeting_proposed":
      return { verb: "proposed a meeting:", object: m.meetingTitle };
    case "availability_shared":
      return { verb: "shared availability for", object: m.meetingTitle };
    case "meeting_confirmed":
      return { verb: "scheduled", object: m.meetingTitle };
    case "milestone_completed":
      return { verb: "reached the milestone", object: m.milestoneTitle };
    case "update_posted":
      return { verb: "posted an update", quote: m.excerpt };
    case "member_joined":
      return { verb: "joined the project" };
    case "project_created":
      return { verb: "created the project" };
    case "event_created":
      return { verb: "added to the calendar:", object: m.excerpt };
    case "project_completed":
      return { verb: "marked the final task done — project complete 🎉" };
  }
}

export function ActivityItem({
  event,
  people,
  project,
  showProject = true,
  className,
}: {
  event: ActivityEvent;
  people: Map<string, Profile>;
  project?: Project;
  showProject?: boolean;
  className?: string;
}) {
  const actor = people.get(event.actorId);
  const { verb, object, quote } = describeActivity(event, people) as {
    verb: string;
    object?: string;
    quote?: string;
  };
  const { icon: Icon, tone } = ICONS[event.type];
  return (
    <Link
      href={activityHref(event)}
      className={cn(
        "group flex gap-3 rounded-xl px-2 py-2.5 transition-colors outline-none hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
    >
      <div className="relative">
        {actor ? <Avatar person={actor} size="md" /> : <div className="size-8 rounded-full bg-muted" />}
        <span className={cn("absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full ring-2 ring-card", tone)}>
          <Icon className="size-2.5" strokeWidth={2.6} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">{actor ? firstName(actor.name) : "Someone"}</span> {verb}{" "}
          {object && <span className="font-medium text-foreground group-hover:text-primary">{object}</span>}
        </p>
        {quote && <p className="mt-1 line-clamp-2 border-l-2 pl-2 text-[12px] text-muted-foreground">{quote}</p>}
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          {timeAgo(event.createdAt)}
          {showProject && project && (
            <>
              {" · "}
              <span>{project.emoji} {project.name.split(" — ")[0]}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
