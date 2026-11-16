# NOVA SYNC — Better Together

**Group projects. Finally in sync.**
One workspace for your team, tasks, meetings, and deadlines. Less coordination. More collaboration.

NOVA SYNC is a collaboration platform for student group projects at NOVA University Lisbon. It brings tasks, meeting scheduling, deadlines, project health and transparent "Sync Intelligence" insights into a single app, so a group spends its time on the work instead of chasing each other.

---

## Course submission (Introduction to Programming 2477)

| | |
| --- | --- |
| **Live app** | _TODO: add the Vercel URL here, e.g. `https://nova-sync.vercel.app`_ |
| **Repository** | https://github.com/Mariee27/Nova-Sync (public; the graded code is on `main`) |
| **Stack** | Next.js + TypeScript. Using it instead of Python/Streamlit needs teaching-staff approval (_TODO: note when it was approved_) |

**Team**

| Name | Student number | Main areas |
| --- | --- | --- |
| _TODO_ | _TODO_ | _TODO_ |
| _TODO_ | _TODO_ | _TODO_ |
| _TODO_ | _TODO_ | _TODO_ |
| _TODO_ | _TODO_ | _TODO_ |

**Run and test locally:** `npm install`, then `npm run dev` (app at http://localhost:3000) and `npm test` (unit tests). `npm run check` runs lint, typecheck, tests and the production build in one go. Details are below.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Open the site and click **Explore Demo**. No account, server or credentials are needed: the demo runs fully in your browser.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server (Next.js + Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next.js + React hooks + a11y rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests: scheduler, progress, health, insights, commands, rejected actions and edge cases, recap, .ics |
| `npm run check` | Lint, typecheck, tests and production build in one go |

Requires Node.js 20.9+.

---

## 5-Minute Professor Demo

A guided path through every major feature. Times are approximate. The demo data is generated relative to **today**, so the deadlines, overdue tasks and the open meeting poll always look current.

**0:00 — Landing page (`/`)**
1. Read the hero: *"Group projects. Finally in sync."* The window below it is a rendering of the real dashboard.
2. Scroll to **Smart Meeting Scheduler**. Three teammates have answered. Click **Thursday 15:00** in the grid.
   *Expected:* the **Best match** card jumps to *Thu · 15:00 – 16:00 · 100% · Everyone is free.*
3. In **Task collaboration**, click a card to move it along. *Expected:* the progress bar and percentage update from task status.
4. In **Sync Intelligence**, open **"Why am I seeing this?"** on a card to see the rule and the data behind it.

**1:00 — Enter the demo**
5. Click **Explore Demo**. You are signed in as **Alex Costa** (BSc Management, NOVA SBE) with three projects.
   *Expected:* the **Sync Dashboard** greets Alex, shows tasks due this week, the next meeting, completion stats, project health, and a **Critical** insight: *"Your Marketing Strategy — Group 04 deadline is in 3 days, but 4 tasks are still incomplete."*

**1:30 — Sync Intelligence**
6. Open **Sync Intelligence** in the sidebar. Filter by **Critical** or click a project health card.
7. Expand **"Why am I seeing this?"** on the workload insight. *Expected:* *Tiago: 3 open tasks; Lucas: 1; Alex: 0; Inês: 0*, plus the exact rule. The **How it works** panel lists every rule. Nothing is AI-generated.

**2:00 — Tasks**
8. Open **Marketing Strategy → Tasks** (Kanban). Two tasks are overdue (red).
9. Drag **Final presentation deck** from *To do* to *In progress* (or focus a card and press Space, then the arrow keys).
10. Click **Budget & KPI dashboard** to open the drawer: tick a subtask, add a comment, change the priority.
    *Expected:* each change shows in the project's **Activity** tab and in the dashboard feed.

**3:00 — Smart Meeting Scheduler**
11. Open **Meetings → Pitch strategy workshop** (an open poll; 3 of 4 people answered, Alex hasn't).
12. Switch to **Group heatmap** and hover a cell to see who is free. Switch back and **paint Wednesday 15:00–17:00**, then **Save availability**.
    *Expected:* the best match becomes **100% available**, with ranked alternatives and any conflicts listed.
13. Click **Confirm** on the best slot, keep the location, confirm.
    *Expected:* the meeting is confirmed, appears on the **Calendar** and on the dashboard's next meeting, an activity entry is added, and **Download .ics** adds it to Apple/Google/Outlook calendars.

**4:00 — Finish a project**
14. Back in **Marketing Strategy → Tasks**, switch to **List** view and tick the remaining open tasks.
    *Expected:* progress climbs to **100%**, the project health becomes **Completed**, and a celebration appears.

**4:30 — Personal tools**
15. **Focus Mode**: shows your single most urgent task, why it was picked, its steps, and a 25-minute focus timer. **Mark complete** moves to the next one.
16. **Weekly Recap**: tasks completed in the last 7 days per project, progress before → after, top contributor, and what's due next. **Copy as text** for a group chat.
17. **Settings**: edit your profile and working hours (used by the scheduler), switch to dark mode.

**5:00 — Reset**
18. Click **Reset demo** in the sidebar (or in Settings) to restore the original data with dates recalculated for today.

> Demo teammates are simulated. On a meeting poll you can use **"Responding as"** to fill in a teammate's availability and see how responses combine. In a real workspace each person answers from their own account.

---

## Features

**Landing page.** Hero, real product preview, problem section, three benefits, a working scheduling demo, an interactive task board preview, Sync Intelligence showcase, how it works and a final call to action.

**Auth and onboarding.** Sign up, log in, log out, protected app routes, onboarding (name, degree, interests, then create a project, join with an invite code, or just explore), profile and preference editing in Settings.

**Sync Dashboard.** Greeting, tasks due this week, next meeting, completion ring, project cards with health, today's focus list, Sync Intelligence preview, 7-day productivity chart, upcoming deadlines and the activity feed. Every number is computed from workspace data.

**Projects.** Create, edit, set status (active, on hold, completed) and delete; colour and emoji; course and deadline; milestones; team roster with workload bars and availability status; invite code; project updates; activity history; project health with explained reasons.

**Tasks.** Kanban with drag and drop (mouse, touch and keyboard), list view, filters (assignee, priority, search, overdue), task drawer with subtasks, comments, status, priority, assignee, due date and milestone. **Project progress is always derived from task status** (done ÷ total, never typed in, and only 100% when every task is done).

**Smart Meeting Scheduler.** Create a poll (dates, daily window, slot length, duration, invitees), paint availability (drag on desktop, tap on touch, keyboard toggles), live group heatmap, ranked best match plus non-overlapping alternatives, availability percentages, pending vs unavailable, conflicts with already confirmed meetings, confirm with location, reopen, and `.ics` export.

**Calendar.** Month, week and agenda views with meetings, project deadlines, milestones, task due dates and personal events; category toggles; create and edit events.

**Sync Intelligence.** Deadline pressure, overdue work, workload imbalance, stalled projects, milestones, unassigned high-priority tasks, meeting polls waiting on you, your next 48 hours and positive momentum. Each insight carries its evidence, the rule that produced it and a direct action link.

**Extras.** Focus Mode, Project Health, Weekly Recap, a completion celebration, command menu (⌘K / Ctrl+K), notifications, dark mode, and a mobile layout with a bottom tab bar.

---

## Architecture

```
src/
  app/                   Next.js App Router routes
    page.tsx             Landing page
    (auth)/              /login, /signup
    (app)/               Authenticated app: dashboard, projects, tasks, meetings,
                         calendar, intelligence, focus, recap, settings
    demo/, onboarding/
  components/            UI by feature (ui/ holds the shadcn-style primitives)
  lib/
    types.ts             Domain model (WorkspaceSnapshot and entities)
    data/
      commands.ts        Every mutation as a typed, Zod-validated Command and a
                         pure reducer: applyCommand(ws, actor, cmd, now)
      source.ts          DataSource interface
      demo/              localStorage adapter (demo mode)
      supabase/          Supabase adapter (Postgres + Auth + Realtime)
      seed.ts            Demo workspace generated relative to "now"
    scheduling/matcher.ts  Availability matching and slot ranking
    intelligence/engine.ts Rule-based insights
    selectors/           Progress, health, workload, calendar, recap, presence
supabase/
  migrations/            Schema, triggers, RLS policies, RPCs, realtime publication
  tests/                 Plain-Postgres auth stub and RLS smoke test
tests/                   Vitest unit tests
```

**One write path.** All changes go through `run(command)` in `WorkspaceProvider`. The reducer validates input with Zod, checks permissions (membership, ownership), applies the change, and records activity and notifications. Because the reducer is pure, the same logic powers demo mode and Supabase mode and is covered by unit tests.

**Pluggable data layer.** `getDataSource()` returns the Supabase adapter when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, otherwise the demo adapter.
- *Demo adapter:* stores the workspace in `localStorage`, syncs across tabs through the `storage` event, and re-seeds untouched demo data each day so dates stay fresh.
- *Supabase adapter:* loads the user's workspace (RLS limits it to their projects), runs the same reducer, then persists the row-level diff. Joining by invite code and inviting by email use `SECURITY DEFINER` RPCs. Realtime subscriptions reload the workspace when teammates change something.

**Scheduler.** For every candidate start time the matcher counts who is free for the whole duration, then scores:
`available × 100 − conflicts × 15 + partial coverage × 10 + preferred working hours × 8`, breaking ties by the earliest time. Alternatives are picked so they don't overlap the best slot or each other.

**Project health.** Combines overdue tasks, deadline proximity, pace (progress vs. time elapsed) and recent activity into *On track*, *At risk* or *Critical*, and always lists the reasons.

---

## Deploying to Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub and choose **Add New → Project**.
2. Import `Mariee27/Nova-Sync`. Vercel detects Next.js, so keep the defaults.
3. Leave the environment variables empty to deploy in demo mode, or add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in **Settings → Environment Variables** for Supabase mode. Keys live in Vercel's settings, never in the repository.
4. Click **Deploy**. Every push to `main` redeploys automatically. Put the URL in the table at the top of this README.

## Security

- **Permissions are checked where the data changes, not only in the UI.** `applyCommand` refuses writes by non-members, owner-only actions (deleting a project, removing members), assigning tasks to non-members, editing other people's personal events, and answering a poll on someone else's behalf. In Supabase mode, row-level security enforces the same rules in the database.
- **Every input is validated** with Zod schemas or explicit checks: lengths, dates, colours, emails, working hours, meeting windows, and slots that must be real poll options.
- **No secrets in the repository.** `.env*` files are git-ignored, and only `.env.example` with empty placeholders is committed. The Supabase anon key is a public client key; RLS protects the data.
- **Dependencies are pinned to exact versions** (`package.json`, `.npmrc` with `save-exact`, and `package-lock.json`). `npm audit` reported 0 known vulnerabilities on 2026-11-16.
- **Demo mode is a demonstration, not a secure multi-user system.** Its data lives in one browser, and anyone using that browser can see it.

## Connecting Supabase

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` in order (Supabase CLI: `supabase db push`, or paste them into the SQL editor).
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
4. In Authentication settings, enable email/password sign-in. Turn off email confirmation for quick testing, or keep it on and confirm via the email link.
5. `npm run dev`. The app now uses real accounts, Postgres and Realtime. The one-click demo is turned off in this mode (**Explore Demo** leads to the login page).

Row-level security makes every table visible only to members of the relevant project; profiles are visible to yourself and people you share a project with; notifications only to their owner.

**Testing the policies without Supabase.** On any Postgres 15+:
```bash
createdb nova_rls
psql -d nova_rls -f supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do psql -d nova_rls -v ON_ERROR_STOP=1 -f "$f"; done
psql -d nova_rls -f supabase/tests/rls_smoke.sql
```
The smoke test signs in as two users and checks that the second user sees nothing until they join with the invite code.

---

## Honest limitations

- **The Supabase adapter has not been run against a live Supabase project**, because no credentials were available while building. It type-checks, the migrations and RLS policies apply cleanly on Postgres 16, and the RLS smoke test passes, but sign-up, persistence and Realtime still need an end-to-end check on a real project.
- **Demo mode is local only.** Data lives in one browser's `localStorage`. "Real-time" updates in the demo work between tabs of the same browser, not between devices or people.
- **Demo sign-in has no passwords.** Demo accounts exist only in your browser. Teammates in the demo are simulated, and on meeting polls you can answer on their behalf to show how responses combine.
- **No outgoing email.** Inviting by email only works for people who already have an account (Supabase mode) or adds a simulated member (demo mode). The invite code is the main way to join.
- **No two-way calendar sync.** Confirmed meetings can be exported as `.ics`. There is no Google or Outlook integration.
- **Sync Intelligence is rule-based by design.** It does not use a language model, so it only knows the patterns it was given.
- **Simple conflict handling.** Supabase mode writes row diffs with last-write-wins and reloads the whole workspace on change. That is fine for student-sized teams, not for large organisations.
- **Times use the browser's time zone.** Scheduling grids are shown in local time; mixed-time-zone teams are not specially handled.
- **No file attachments or chat.** Tasks have comments; files stay in the group's existing drive.
- **Stack approval.** The course's default stack is Python with Streamlit. Using Next.js needs the teaching staff's approval.
- **Testing scope.** Unit tests cover the scheduler, progress, health, insights, the command reducer (including rejected actions and edge cases), recap and `.ics`. UI flows were checked manually in a headless browser at desktop and phone sizes; there is no automated end-to-end suite yet.
- **Accessibility** follows WAI-ARIA patterns (labels, keyboard drag and drop, focus states, reduced motion), but has not been audited with screen-reader users.

---

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui-style components on Radix · Lucide · Framer Motion · Recharts · dnd-kit · React Hook Form + Zod · date-fns · Supabase (Postgres, Auth, Realtime) · Vitest
