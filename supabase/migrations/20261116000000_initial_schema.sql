-- NOVA SYNC — initial schema
-- Entity ids are text (the client generates them); profile ids are the auth.users uuid.

create extension if not exists pgcrypto;

-- ── Profiles ─────────────────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 60),
  email            text not null,
  color            text not null default '#2563EB' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  degree           text not null default '',
  university       text not null default 'NOVA University Lisbon',
  interests        text[] not null default '{}',
  bio              text not null default '' check (char_length(bio) <= 240),
  work_start_hour  smallint not null default 9 check (work_start_hour between 0 and 23),
  work_end_hour    smallint not null default 18 check (work_end_hour between 1 and 24),
  onboarded        boolean not null default false,
  created_at       timestamptz not null default now(),
  check (work_end_hour > work_start_hour)
);
create unique index profiles_email_key on public.profiles (lower(email));

-- ── Projects & membership ────────────────────────────────────────────────
create table public.projects (
  id           text primary key default gen_random_uuid()::text,
  name         text not null check (char_length(name) between 3 and 80),
  description  text not null default '' check (char_length(description) <= 600),
  course       text not null check (char_length(course) between 2 and 80),
  course_code  text not null default '',
  deadline     timestamptz not null,
  status       text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  color        text not null default '#2563EB' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  emoji        text not null default '📁',
  invite_code  text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  owner_id     uuid not null references public.profiles (id) on delete restrict,
  created_at   timestamptz not null default now()
);

create table public.project_members (
  project_id  text not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

-- ── Milestones & tasks ───────────────────────────────────────────────────
create table public.milestones (
  id            text primary key default gen_random_uuid()::text,
  project_id    text not null references public.projects (id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 140),
  description   text not null default '',
  due_date      timestamptz not null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index milestones_project_idx on public.milestones (project_id, due_date);

create table public.tasks (
  id            text primary key default gen_random_uuid()::text,
  project_id    text not null references public.projects (id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 140),
  description   text not null default '' check (char_length(description) <= 2000),
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id   uuid references public.profiles (id) on delete set null,
  due_date      timestamptz,
  milestone_id  text references public.milestones (id) on delete set null,
  sort_order    integer not null default 0,
  created_by    uuid not null references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz,
  check ((status = 'done') = (completed_at is not null))
);
create index tasks_project_status_idx on public.tasks (project_id, status, sort_order);
create index tasks_assignee_idx on public.tasks (assignee_id) where status <> 'done';
create index tasks_due_idx on public.tasks (due_date) where status <> 'done';

create table public.subtasks (
  id          text primary key default gen_random_uuid()::text,
  task_id     text not null references public.tasks (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 140),
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index subtasks_task_idx on public.subtasks (task_id);

create table public.task_comments (
  id          text primary key default gen_random_uuid()::text,
  task_id     text not null references public.tasks (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- ── Meetings & availability ──────────────────────────────────────────────
create table public.meetings (
  id                text primary key default gen_random_uuid()::text,
  project_id        text not null references public.projects (id) on delete cascade,
  title             text not null check (char_length(title) between 3 and 100),
  description       text not null default '',
  location          text not null default '',
  organizer_id      uuid not null references public.profiles (id) on delete cascade,
  duration_minutes  smallint not null check (duration_minutes between 15 and 240),
  candidate_dates   date[] not null check (cardinality(candidate_dates) between 1 and 14),
  day_start_hour    smallint not null check (day_start_hour between 0 and 23),
  day_end_hour      smallint not null check (day_end_hour between 1 and 24),
  slot_minutes      smallint not null check (slot_minutes in (15, 30, 60)),
  status            text not null default 'polling' check (status in ('polling', 'confirmed', 'cancelled')),
  confirmed_start   timestamptz,
  confirmed_end     timestamptz,
  created_at        timestamptz not null default now(),
  check (day_end_hour > day_start_hour),
  check (status <> 'confirmed' or (confirmed_start is not null and confirmed_end > confirmed_start))
);
create index meetings_project_idx on public.meetings (project_id, status);
create index meetings_confirmed_idx on public.meetings (confirmed_start) where status = 'confirmed';

-- Invitees; responded_at marks that a person has answered the poll
-- (an empty availability is a valid answer: "none of these work").
create table public.meeting_invitees (
  meeting_id    text not null references public.meetings (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  responded_at  timestamptz,
  primary key (meeting_id, user_id)
);
create index meeting_invitees_user_idx on public.meeting_invitees (user_id);

-- One row per grid cell a participant marked as free.
create table public.meeting_availability (
  meeting_id  text not null,
  user_id     uuid not null,
  slot_start  timestamptz not null,
  primary key (meeting_id, user_id, slot_start),
  foreign key (meeting_id, user_id) references public.meeting_invitees (meeting_id, user_id) on delete cascade
);

-- Candidate grid cells, materialised for reporting and to validate availability.
create view public.meeting_slots
with (security_invoker = true) as
select
  m.id as meeting_id,
  gs as slot_start,
  gs + make_interval(mins => m.slot_minutes) as slot_end
from public.meetings m
cross join lateral unnest(m.candidate_dates) as d(day)
cross join lateral generate_series(
  d.day + make_interval(hours => m.day_start_hour),
  d.day + make_interval(hours => m.day_end_hour) - make_interval(mins => m.slot_minutes),
  make_interval(mins => m.slot_minutes)
) as gs;

-- ── Calendar, updates, activity, notifications ───────────────────────────
create table public.calendar_events (
  id           text primary key default gen_random_uuid()::text,
  project_id   text references public.projects (id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 100),
  description  text not null default '',
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index calendar_events_project_idx on public.calendar_events (project_id, starts_at);
create index calendar_events_creator_idx on public.calendar_events (created_by, starts_at);

create table public.project_updates (
  id          text primary key default gen_random_uuid()::text,
  project_id  text not null references public.projects (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index project_updates_project_idx on public.project_updates (project_id, created_at desc);

create table public.activity_events (
  id          text primary key default gen_random_uuid()::text,
  project_id  text not null references public.projects (id) on delete cascade,
  actor_id    uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in (
                'project_created', 'member_joined', 'task_created', 'task_completed', 'task_moved',
                'task_updated', 'task_assigned', 'task_commented', 'meeting_proposed',
                'availability_shared', 'meeting_confirmed', 'milestone_completed', 'update_posted',
                'event_created', 'project_completed')),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activity_events_project_idx on public.activity_events (project_id, created_at desc);

create table public.notifications (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null default '',
  href        text not null default '/dashboard',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- ── Triggers ─────────────────────────────────────────────────────────────
-- Create a profile whenever someone signs up through Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The creator of a project becomes its owner member automatically.
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();
