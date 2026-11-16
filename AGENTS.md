# AGENTS.md — rules for coding agents (Codex, Claude Code, Copilot…)

NOVA SYNC is our team project for Introduction to Programming (2477) at NOVA. It's a collaboration app for student group projects. Read this file before every task and follow it in every session.

## Stack (fixed: do not switch)

- **Next.js 16 (App Router) + React 19 + TypeScript**, Tailwind CSS v4, shadcn-style components in `src/components/ui`, Lucide icons, Framer Motion, Recharts, dnd-kit, React Hook Form + Zod, date-fns.
- **Data:** demo mode stores everything in the browser's localStorage. Supabase (Postgres, Auth, Realtime) is used when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
- **Tests:** Vitest in `tests/`.
- **Hosting:** Vercel (free plan), deploying `main`.
- Using a JavaScript stack instead of the course's Python/Streamlit needs approval from the teaching staff. Don't add Python, a second framework or a new database without the team agreeing in a pull request.

## Commands

```bash
npm install          # install exact versions from package-lock.json
npm run dev          # http://localhost:3000
npm test             # all unit tests
npm run lint
npm run typecheck
npm run check        # lint + typecheck + tests + production build
```

Run `npm run check` before finishing any task. The task is not done unless it passes.

## Where things live

- `src/lib/data/commands.ts` is the **only** place that changes data. Every write is a typed `Command`, is validated with Zod, has its permissions checked, and is applied by the pure function `applyCommand`. New features add a command here plus tests.
- `src/lib/data/demo` holds the localStorage adapter, `src/lib/data/supabase` the Supabase adapter, and `src/lib/data/seed.ts` the demo data, with dates relative to today.
- Algorithms: `src/lib/scheduling/matcher.ts` (meeting matching), `src/lib/intelligence/engine.ts` (insight rules), `src/lib/selectors/*` (progress, health, recap…).
- `supabase/migrations` holds the database schema and row-level security. Schema changes need a new migration file; never edit an applied one.
- To reset data: use "Reset demo" in the sidebar (demo mode), or re-apply the migrations to a fresh database (Supabase).

## Rules

- **Tests:** never edit or delete files in `tests/` unless the task explicitly says so. Add new tests for new behaviour, including rejected actions and edge cases.
- **Permissions are checked in `applyCommand` (and in RLS for Supabase), never only in the UI.** Hiding a button is not a permission.
- **Secrets** are read from environment variables only. Never write keys in code, and never create, edit or commit `.env` files. `.env.example` holds placeholders only.
- **Dependencies:** add one only when it's really needed, pin the exact version (no `^` or `~`), and commit `package-lock.json`.
- **Git** is handled by the team in GitHub Desktop. Don't run git commands unless the task asks for it.
- Keep changes inside the task's scope. Don't reformat or touch unrelated files.
- Progress percentages always come from task status. Never store or hard-code them.
- UI text is in English. Keep it plain and friendly, and don't promise features that don't exist.

## Team workflow

One branch per task. Open a pull request and get a teammate's review before merging; the author doesn't merge their own PR. Merge small changes often. Change this file through pull requests like any other file.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
