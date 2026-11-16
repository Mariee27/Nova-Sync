-- RLS smoke test for plain Postgres 15+ (no Supabase needed).
-- 1) psql -d <empty db> -f supabase/tests/auth_stub.sql
-- 2) apply supabase/migrations/*.sql in order
-- 3) psql -d <db> -f supabase/tests/rls_smoke.sql
-- Expected: Bea sees 0 projects/tasks before joining by invite code, 1 after.

grant all on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','a@x.pt','{"name":"Alex"}'),
 ('22222222-2222-2222-2222-222222222222','b@x.pt','{"name":"Bea"}');
select count(*) as profiles_created from public.profiles;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into public.projects (id,name,course,deadline,owner_id,invite_code) values ('p1','Alpha project','Finance', now()+interval '7 days','11111111-1111-1111-1111-111111111111','ABC-123') returning id;
select count(*) as alex_members from public.project_members where project_id='p1';
insert into public.tasks (project_id,title,created_by) values ('p1','Do it','11111111-1111-1111-1111-111111111111');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select count(*) as bea_sees_projects_before from public.projects;
select count(*) as bea_sees_tasks_before from public.tasks;
select public.join_project('abc-123');
select count(*) as bea_sees_projects_after from public.projects;
select count(*) as bea_sees_tasks_after from public.tasks;
