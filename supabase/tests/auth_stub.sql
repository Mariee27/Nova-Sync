-- Minimal stand-ins for the parts of Supabase the migrations rely on.
-- Only for local testing on plain Postgres. Never run this against a Supabase project.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create publication supabase_realtime;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
