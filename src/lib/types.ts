/**
 * NOVA SYNC domain model.
 *
 * These types are the contract between the UI and the data layer. Both the
 * local demo adapter and the Supabase adapter produce a `WorkspaceSnapshot`
 * of this shape, so the UI never knows which backend it is talking to.
 *
 * All timestamps are ISO-8601 strings (UTC). Calendar-day values such as
 * deadlines are also ISO strings pointing at the end of that local day.
 */

export type ID = string;

export interface Profile {
  id: ID;
  name: string;
  email: string;
  /** Hex color used for the avatar gradient. */
  color: string;
  degree: string;
  university: string;
  interests: string[];
  bio: string;
  /** Preferred working hours, 24h clock. Used by the scheduler. */
  workStartHour: number;
  workEndHour: number;
  onboarded: boolean;
  createdAt: string;
}

export type ProjectStatus = "active" | "on_hold" | "completed";
export type MemberRole = "owner" | "member";

export interface Project {
  id: ID;
  name: string;
  description: string;
  course: string;
  courseCode: string;
  deadline: string;
  status: ProjectStatus;
  /** Accent color for the workspace. */
  color: string;
  emoji: string;
  /** Short code teammates use to join the workspace. */
  inviteCode: string;
  ownerId: ID;
  createdAt: string;
}

export interface ProjectMember {
  projectId: ID;
  userId: ID;
  role: MemberRole;
  joinedAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: ID;
  projectId: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: ID | null;
  dueDate: string | null;
  milestoneId: ID | null;
  /** Sort order inside a Kanban column. */
  order: number;
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Subtask {
  id: ID;
  taskId: ID;
  title: string;
  done: boolean;
  createdAt: string;
}

export interface TaskComment {
  id: ID;
  taskId: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export interface Milestone {
  id: ID;
  projectId: ID;
  title: string;
  description: string;
  dueDate: string;
  completedAt: string | null;
  createdAt: string;
}

export type MeetingStatus = "polling" | "confirmed" | "cancelled";

export interface Meeting {
  id: ID;
  projectId: ID;
  title: string;
  description: string;
  location: string;
  organizerId: ID;
  durationMinutes: number;
  /** Candidate calendar days, as local `YYYY-MM-DD` keys. */
  candidateDates: string[];
  /** Daily window offered in the availability grid (local hours). */
  dayStartHour: number;
  dayEndHour: number;
  /** Granularity of the availability grid. */
  slotMinutes: number;
  inviteeIds: ID[];
  status: MeetingStatus;
  confirmedStart: string | null;
  confirmedEnd: string | null;
  createdAt: string;
}

/**
 * A participant's availability for a meeting poll.
 * `slots` holds local cell keys `YYYY-MM-DDTHH:mm`, one per grid cell.
 */
export interface Availability {
  meetingId: ID;
  userId: ID;
  slots: string[];
  updatedAt: string;
}

export interface CalendarEvent {
  id: ID;
  projectId: ID | null;
  title: string;
  description: string;
  start: string;
  end: string;
  createdBy: ID;
  createdAt: string;
}

export interface ProjectUpdate {
  id: ID;
  projectId: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export type ActivityType =
  | "project_created"
  | "member_joined"
  | "task_created"
  | "task_completed"
  | "task_moved"
  | "task_updated"
  | "task_assigned"
  | "task_commented"
  | "meeting_proposed"
  | "availability_shared"
  | "meeting_confirmed"
  | "milestone_completed"
  | "update_posted"
  | "event_created"
  | "project_completed";

export interface ActivityEvent {
  id: ID;
  projectId: ID;
  actorId: ID;
  type: ActivityType;
  /** Display-ready details about the subject (task title, from/to status…). */
  meta: {
    taskId?: ID;
    taskTitle?: string;
    from?: TaskStatus;
    to?: TaskStatus;
    meetingId?: ID;
    meetingTitle?: string;
    milestoneTitle?: string;
    assigneeId?: ID;
    excerpt?: string;
  };
  createdAt: string;
}

export interface Notification {
  id: ID;
  userId: ID;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  profiles: Profile[];
  projects: Project[];
  members: ProjectMember[];
  tasks: Task[];
  subtasks: Subtask[];
  comments: TaskComment[];
  milestones: Milestone[];
  meetings: Meeting[];
  availability: Availability[];
  events: CalendarEvent[];
  updates: ProjectUpdate[];
  activity: ActivityEvent[];
  notifications: Notification[];
}

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 3,
  high: 2,
  medium: 1,
  low: 0,
};
