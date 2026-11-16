-- NOVA SYNC — Row Level Security
-- Rule of thumb: you can see and change a project's data only if you are a member.
-- Helper functions are SECURITY DEFINER so policies don't recurse into project_members' own RLS.

create or replace function public.is_project_member(p_project_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_project_owner(p_project_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.shares_project_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members a
    join public.project_members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

create or replace function public.task_project(p_task_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$ select project_id from public.tasks where id = p_task_id; $$;

create or replace function public.meeting_project(p_meeting_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$ select project_id from public.meetings where id = p_meeting_id; $$;

revoke all on function public.is_project_member(text), public.is_project_owner(text),
  public.shares_project_with(uuid), public.task_project(text), public.meeting_project(text) from public, anon;
grant execute on function public.is_project_member(text), public.is_project_owner(text),
  public.shares_project_with(uuid), public.task_project(text), public.meeting_project(text) to authenticated;

alter table public.profiles             enable row level security;
alter table public.projects             enable row level security;
alter table public.project_members      enable row level security;
alter table public.milestones           enable row level security;
alter table public.tasks                enable row level security;
alter table public.subtasks             enable row level security;
alter table public.task_comments        enable row level security;
alter table public.meetings             enable row level security;
alter table public.meeting_invitees     enable row level security;
alter table public.meeting_availability enable row level security;
alter table public.calendar_events      enable row level security;
alter table public.project_updates      enable row level security;
alter table public.activity_events      enable row level security;
alter table public.notifications        enable row level security;

-- Profiles: yourself + people you share a project with. Only you can edit yours.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_project_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Projects
-- The owner clause lets `insert ... returning` see the new row before the
-- membership trigger's row is visible to the policy check.
create policy projects_select on public.projects for select to authenticated
  using (owner_id = auth.uid() or public.is_project_member(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (owner_id = auth.uid());
create policy projects_update on public.projects for update to authenticated
  using (public.is_project_member(id))
  with check (public.is_project_member(id));
create policy projects_delete on public.projects for delete to authenticated
  using (public.is_project_owner(id));

-- Membership: members see the roster; owners manage it; anyone may leave.
-- Joining by invite code / inviting by email goes through the RPCs below.
create policy members_select on public.project_members for select to authenticated
  using (public.is_project_member(project_id));
create policy members_insert on public.project_members for insert to authenticated
  with check (public.is_project_owner(project_id) and role = 'member');
create policy members_update on public.project_members for update to authenticated
  using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));
create policy members_delete on public.project_members for delete to authenticated
  using (public.is_project_owner(project_id) or user_id = auth.uid());

-- Project-scoped content: full access for members.
create policy milestones_all on public.milestones for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));

create policy tasks_all on public.tasks for all to authenticated
  using (public.is_project_member(project_id))
  with check (
    public.is_project_member(project_id)
    and (assignee_id is null or exists (
      select 1 from public.project_members pm
      where pm.project_id = tasks.project_id and pm.user_id = tasks.assignee_id))
  );

create policy subtasks_all on public.subtasks for all to authenticated
  using (public.is_project_member(public.task_project(task_id)))
  with check (public.is_project_member(public.task_project(task_id)));

create policy comments_select on public.task_comments for select to authenticated
  using (public.is_project_member(public.task_project(task_id)));
create policy comments_insert on public.task_comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_project_member(public.task_project(task_id)));
create policy comments_delete on public.task_comments for delete to authenticated
  using (author_id = auth.uid());

create policy meetings_select on public.meetings for select to authenticated
  using (public.is_project_member(project_id));
create policy meetings_insert on public.meetings for insert to authenticated
  with check (organizer_id = auth.uid() and public.is_project_member(project_id));
create policy meetings_update on public.meetings for update to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy meetings_delete on public.meetings for delete to authenticated
  using (organizer_id = auth.uid() or public.is_project_owner(project_id));

create policy invitees_select on public.meeting_invitees for select to authenticated
  using (public.is_project_member(public.meeting_project(meeting_id)));
create policy invitees_insert on public.meeting_invitees for insert to authenticated
  with check (
    public.is_project_member(public.meeting_project(meeting_id))
    and exists (select 1 from public.project_members pm
                where pm.project_id = public.meeting_project(meeting_id) and pm.user_id = meeting_invitees.user_id)
  );
-- Only you can mark your own response.
create policy invitees_update on public.meeting_invitees for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy invitees_delete on public.meeting_invitees for delete to authenticated
  using (public.is_project_member(public.meeting_project(meeting_id)));

-- Availability: everyone in the project can read it; only you can write yours.
create policy availability_select on public.meeting_availability for select to authenticated
  using (public.is_project_member(public.meeting_project(meeting_id)));
create policy availability_insert on public.meeting_availability for insert to authenticated
  with check (user_id = auth.uid());
create policy availability_delete on public.meeting_availability for delete to authenticated
  using (user_id = auth.uid());

-- Calendar events: project events for members, personal events for their creator.
create policy events_select on public.calendar_events for select to authenticated
  using (created_by = auth.uid() or (project_id is not null and public.is_project_member(project_id)));
create policy events_insert on public.calendar_events for insert to authenticated
  with check (created_by = auth.uid() and (project_id is null or public.is_project_member(project_id)));
create policy events_update on public.calendar_events for update to authenticated
  using (created_by = auth.uid() or (project_id is not null and public.is_project_member(project_id)))
  with check (project_id is null or public.is_project_member(project_id));
create policy events_delete on public.calendar_events for delete to authenticated
  using (created_by = auth.uid() or (project_id is not null and public.is_project_member(project_id)));

create policy updates_select on public.project_updates for select to authenticated
  using (public.is_project_member(project_id));
create policy updates_insert on public.project_updates for insert to authenticated
  with check (author_id = auth.uid() and public.is_project_member(project_id));
create policy updates_delete on public.project_updates for delete to authenticated
  using (author_id = auth.uid());

-- Activity is append-only and always attributed to the caller.
create policy activity_select on public.activity_events for select to authenticated
  using (public.is_project_member(project_id));
create policy activity_insert on public.activity_events for insert to authenticated
  with check (actor_id = auth.uid() and public.is_project_member(project_id));

-- Notifications: you read/clear your own; you may notify people you collaborate with.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated
  with check (public.shares_project_with(user_id));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ── RPCs for membership flows that need a lookup outside the caller's RLS view ──
create or replace function public.join_project(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into v_project from public.projects where upper(invite_code) = upper(trim(p_code));
  if v_project is null then raise exception 'No project found for that invite code'; end if;
  insert into public.project_members (project_id, user_id, role)
  values (v_project, auth.uid(), 'member')
  on conflict do nothing;
  insert into public.activity_events (project_id, actor_id, type) values (v_project, auth.uid(), 'member_joined');
  return v_project;
end;
$$;

create or replace function public.invite_member(p_project_id text, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.is_project_member(p_project_id) then raise exception 'Not a member of this project'; end if;
  select id into v_user from public.profiles where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No NOVA SYNC account uses that email yet. Share the invite code instead.';
  end if;
  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_user, 'member')
  on conflict do nothing;
  insert into public.activity_events (project_id, actor_id, type) values (p_project_id, v_user, 'member_joined');
  return v_user;
end;
$$;

revoke all on function public.join_project(text), public.invite_member(text, text) from public, anon;
grant execute on function public.join_project(text), public.invite_member(text, text) to authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table
  public.projects, public.project_members, public.tasks, public.subtasks, public.task_comments,
  public.milestones, public.meetings, public.meeting_invitees, public.meeting_availability,
  public.calendar_events, public.project_updates, public.activity_events, public.notifications;
