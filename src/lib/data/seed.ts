/**
 * Demo workspace seed.
 *
 * Every date is computed relative to `now`, so deadlines, overdue tasks and
 * meeting polls stay meaningful whenever the demo is opened. The data is
 * designed so that the 5-minute professor demo tells a coherent story:
 *
 *  - Marketing Strategy is due in 3 days with 4 open tasks, two of them
 *    overdue and high priority → Sync Intelligence flags a real risk.
 *  - Business Analytics is 75% done but one teammate holds most open work.
 *  - Entrepreneurship has a live meeting poll where 3 of 4 teammates have
 *    responded and their overlap is Wednesday 15:00–17:00. Once Alex adds
 *    availability, the matcher finds a 4/4 slot.
 */
import { addDays, isWeekend, startOfDay } from "date-fns";
import type {
  ActivityEvent,
  Availability,
  CalendarEvent,
  Meeting,
  Milestone,
  Notification,
  Profile,
  Project,
  ProjectMember,
  ProjectUpdate,
  Subtask,
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
  WorkspaceSnapshot,
} from "@/lib/types";
import { cellKey, dayKey } from "@/lib/dates";

export const DEMO_USER_ID = "u_alex";

export function createDemoWorkspace(now: Date = new Date()): WorkspaceSnapshot {
  const today = startOfDay(now);
  /** Local time `d` days from today at hh:mm, as ISO. */
  const at = (d: number, hh = 12, mm = 0) => {
    const x = addDays(today, d);
    x.setHours(hh, mm, 0, 0);
    return x.toISOString();
  };
  /** End of local day `d` days from today, as ISO (deadline semantics). */
  const eod = (d: number) => {
    const x = addDays(today, d);
    x.setHours(23, 59, 0, 0);
    return x.toISOString();
  };
  /** Hours ago (for recent activity), as ISO. */
  const ago = (hours: number) => new Date(now.getTime() - hours * 3600_000).toISOString();

  // ── People ────────────────────────────────────────────────────────────
  const person = (
    id: string,
    name: string,
    email: string,
    color: string,
    degree: string,
    interests: string[],
    bio: string,
    workStartHour = 9,
    workEndHour = 19,
  ): Profile => ({
    id,
    name,
    email,
    color,
    degree,
    university: "NOVA University Lisbon",
    interests,
    bio,
    workStartHour,
    workEndHour,
    onboarded: true,
    createdAt: at(-60),
  });

  const profiles: Profile[] = [
    person("u_alex", "Alex Costa", "alex.costa@demo.novasync.app", "#2563EB", "BSc Management · NOVA SBE", ["Marketing", "Product", "Startups"], "3rd-year management student. Usually the one making the slides look good.", 9, 19),
    person("u_maria", "Maria Santos", "maria.santos@demo.novasync.app", "#8B5CF6", "BSc Management · NOVA SBE", ["Consumer research", "Branding"], "Loves a good survey dataset.", 10, 20),
    person("u_joao", "João Ferreira", "joao.ferreira@demo.novasync.app", "#0EA5E9", "BSc Economics · NOVA SBE", ["Strategy", "Pricing"], "Excel wizard, coffee enthusiast.", 9, 18),
    person("u_sarah", "Sarah Lindqvist", "sarah.lindqvist@demo.novasync.app", "#EC4899", "Exchange · International Marketing", ["Digital marketing", "Design"], "Erasmus student from Stockholm.", 9, 17),
    person("u_tiago", "Tiago Almeida", "tiago.almeida@demo.novasync.app", "#10B981", "BSc Data Science · NOVA IMS", ["Machine learning", "Python"], "Turns messy CSVs into models.", 10, 22),
    person("u_ines", "Inês Carvalho", "ines.carvalho@demo.novasync.app", "#F59E0B", "BSc Management · NOVA SBE", ["Analytics", "Finance"], "Keeps the team's documentation tidy.", 9, 18),
    person("u_lucas", "Lucas Weber", "lucas.weber@demo.novasync.app", "#6366F1", "Exchange · Business Administration", ["Storytelling", "Consulting"], "Visiting from Mannheim for the fall semester.", 9, 18),
    person("u_beatriz", "Beatriz Rocha", "beatriz.rocha@demo.novasync.app", "#F43F5E", "BSc Economics · NOVA SBE", ["Entrepreneurship", "Sustainability"], "Founder energy. Runs the pitch.", 9, 19),
    person("u_rafael", "Rafael Gomes", "rafael.gomes@demo.novasync.app", "#14B8A6", "MSc Computer Science · NOVA FCT", ["Mobile apps", "UX"], "Builds the prototype at 2am.", 11, 20),
  ];

  // ── Projects ──────────────────────────────────────────────────────────
  const projects: Project[] = [
    {
      id: "p_mkt",
      name: "Marketing Strategy — Group 04",
      description:
        "Go-to-market strategy for Onda, a fictional oat-milk cold brew brand targeting Lisbon university students. Final deliverable: a 20-page strategy report and a 15-minute pitch to the course panel.",
      course: "Marketing Management",
      courseCode: "MKT 2104",
      deadline: eod(3),
      status: "active",
      color: "#2563EB",
      emoji: "📣",
      inviteCode: "MKT-G04X",
      ownerId: "u_alex",
      createdAt: at(-30, 10),
    },
    {
      id: "p_ba",
      name: "Business Analytics — Final Project",
      description:
        "Predict customer churn for a Portuguese telecom using an anonymised 50k-row dataset. Deliverables: a reproducible Python notebook, a Power BI dashboard and a 10-page management report.",
      course: "Business Analytics",
      courseCode: "BA 3302",
      deadline: eod(16),
      status: "active",
      color: "#8B5CF6",
      emoji: "📊",
      inviteCode: "BA-33FP",
      ownerId: "u_tiago",
      createdAt: at(-40, 9),
    },
    {
      id: "p_ent",
      name: "Entrepreneurship — Startup Pitch",
      description:
        "Validate and pitch Mesa, an app that matches students with surplus meals from campus cafés before closing time. Ends with a Demo Day pitch to a jury of local investors.",
      course: "Entrepreneurship & Innovation",
      courseCode: "ENT 2010",
      deadline: eod(30),
      status: "active",
      color: "#10B981",
      emoji: "🚀",
      inviteCode: "ENT-MESA",
      ownerId: "u_beatriz",
      createdAt: at(-14, 15),
    },
  ];

  const members: ProjectMember[] = [
    ["p_mkt", "u_alex", "owner", -30],
    ["p_mkt", "u_maria", "member", -30],
    ["p_mkt", "u_joao", "member", -29],
    ["p_mkt", "u_sarah", "member", -27],
    ["p_ba", "u_tiago", "owner", -40],
    ["p_ba", "u_alex", "member", -40],
    ["p_ba", "u_ines", "member", -39],
    ["p_ba", "u_lucas", "member", -36],
    ["p_ent", "u_beatriz", "owner", -14],
    ["p_ent", "u_alex", "member", -14],
    ["p_ent", "u_rafael", "member", -13],
    ["p_ent", "u_maria", "member", -12],
  ].map(([projectId, userId, role, d]) => ({
    projectId: projectId as string,
    userId: userId as string,
    role: role as "owner" | "member",
    joinedAt: at(d as number, 10),
  }));

  // ── Milestones ───────────────────────────────────────────────────────
  const milestones: Milestone[] = [
    { id: "ms_mkt_1", projectId: "p_mkt", title: "Research phase complete", description: "Secondary research, competitor scan and survey fieldwork.", dueDate: eod(-14), completedAt: at(-12, 17), createdAt: at(-30) },
    { id: "ms_mkt_2", projectId: "p_mkt", title: "Strategy draft approved", description: "Positioning, pricing and channels signed off by the team.", dueDate: eod(-2), completedAt: at(-2, 19), createdAt: at(-30) },
    { id: "ms_mkt_3", projectId: "p_mkt", title: "Final submission", description: "Report + pitch deck uploaded to Moodle.", dueDate: eod(3), completedAt: null, createdAt: at(-30) },
    { id: "ms_ba_1", projectId: "p_ba", title: "Data cleaned & EDA", description: "Dataset profiled, missing values handled, EDA notebook shared.", dueDate: eod(-16), completedAt: at(-15, 18), createdAt: at(-40) },
    { id: "ms_ba_2", projectId: "p_ba", title: "Baseline model", description: "Logistic regression baseline with cross-validation.", dueDate: eod(-7), completedAt: at(-6, 16), createdAt: at(-40) },
    { id: "ms_ba_3", projectId: "p_ba", title: "Dashboard review with TA", description: "Walk the TA through the Power BI draft.", dueDate: eod(9), completedAt: null, createdAt: at(-40) },
    { id: "ms_ba_4", projectId: "p_ba", title: "Final report", description: "Management report + notebook submission.", dueDate: eod(16), completedAt: null, createdAt: at(-40) },
    { id: "ms_ent_1", projectId: "p_ent", title: "Problem validated", description: "10+ customer interviews and a clear problem statement.", dueDate: eod(8), completedAt: null, createdAt: at(-14) },
    { id: "ms_ent_2", projectId: "p_ent", title: "Demo Day pitch", description: "5-minute pitch + clickable prototype.", dueDate: eod(30), completedAt: null, createdAt: at(-14) },
  ];

  // ── Tasks ─────────────────────────────────────────────────────────────
  const tasks: Task[] = [];
  const orderCounter: Record<string, number> = {};
  const task = (
    id: string,
    projectId: string,
    title: string,
    status: TaskStatus,
    priority: TaskPriority,
    assigneeId: string | null,
    due: number | null,
    opts: {
      description?: string;
      milestoneId?: string;
      createdDaysAgo?: number;
      updatedHoursAgo?: number;
      completedHoursAgo?: number;
      createdBy?: string;
    } = {},
  ) => {
    const key = `${projectId}:${status}`;
    orderCounter[key] = (orderCounter[key] ?? 0) + 1;
    const completedAt = status === "done" ? ago(opts.completedHoursAgo ?? 24 * 8) : null;
    const updatedAt = completedAt ?? ago(opts.updatedHoursAgo ?? 30);
    tasks.push({
      id,
      projectId,
      title,
      description: opts.description ?? "",
      status,
      priority,
      assigneeId,
      dueDate: due === null ? null : eod(due),
      milestoneId: opts.milestoneId ?? null,
      order: orderCounter[key],
      createdBy: opts.createdBy ?? assigneeId ?? "u_alex",
      createdAt: at(-(opts.createdDaysAgo ?? 20), 11),
      updatedAt,
      completedAt,
    });
  };

  // Marketing Strategy: 8 of 12 done, 2 overdue high-priority tasks.
  task("t_mkt_1", "p_mkt", "Market research & secondary data", "done", "medium", "u_maria", -18, { milestoneId: "ms_mkt_1", completedHoursAgo: 24 * 13, description: "Industry reports on the Portuguese ready-to-drink coffee market, Euromonitor + INE data." });
  task("t_mkt_2", "p_mkt", "Competitor analysis", "done", "medium", "u_joao", -15, { milestoneId: "ms_mkt_1", completedHoursAgo: 24 * 12 + 5 });
  task("t_mkt_3", "p_mkt", "Customer survey design", "done", "high", "u_sarah", -20, { milestoneId: "ms_mkt_1", completedHoursAgo: 24 * 16 });
  task("t_mkt_4", "p_mkt", "Survey analysis — 182 responses", "done", "high", "u_maria", -8, { completedHoursAgo: 24 * 6 + 3, description: "Clean the Qualtrics export, segment by faculty and run the key cross-tabs." });
  task("t_mkt_5", "p_mkt", "Student personas", "done", "medium", "u_alex", -6, { milestoneId: "ms_mkt_2", completedHoursAgo: 24 * 5 + 2 });
  task("t_mkt_6", "p_mkt", "Positioning statement", "done", "high", "u_alex", -4, { milestoneId: "ms_mkt_2", completedHoursAgo: 24 * 3 + 6 });
  task("t_mkt_7", "p_mkt", "SWOT analysis", "done", "low", "u_joao", -5, { milestoneId: "ms_mkt_2", completedHoursAgo: 24 * 4 + 1 });
  task("t_mkt_8", "p_mkt", "Pricing strategy", "done", "high", "u_sarah", -2, { milestoneId: "ms_mkt_2", completedHoursAgo: 26 });
  task("t_mkt_9", "p_mkt", "Campaign concept & media plan", "in_progress", "urgent", "u_maria", -1, { milestoneId: "ms_mkt_3", updatedHoursAgo: 20, description: "Big idea, key visuals and a 6-week media flight across Instagram, TikTok and on-campus activations." });
  task("t_mkt_10", "p_mkt", "Channel & distribution plan", "in_review", "high", "u_joao", -1, { milestoneId: "ms_mkt_3", updatedHoursAgo: 9, description: "Campus cafés, vending partners and the online store. Needs a review from Alex." });
  task("t_mkt_11", "p_mkt", "Budget & KPI dashboard", "in_progress", "high", "u_alex", 1, { milestoneId: "ms_mkt_3", updatedHoursAgo: 5, description: "€15k launch budget split by channel, plus the KPI tree we'll present." });
  task("t_mkt_12", "p_mkt", "Final presentation deck", "todo", "high", "u_alex", 2, { milestoneId: "ms_mkt_3", updatedHoursAgo: 28, description: "15-minute pitch. Story: problem → insight → strategy → numbers. Keep it under 18 slides." });

  // Business Analytics: 12 of 16 done (75%), Tiago holds 3 of 4 open tasks.
  const baDone: [string, string, string, number, TaskPriority, string?][] = [
    ["t_ba_1", "Define business question & KPIs", "u_tiago", 24 * 30, "high", "ms_ba_1"],
    ["t_ba_2", "Data dictionary", "u_ines", 24 * 27, "medium", "ms_ba_1"],
    ["t_ba_3", "Missing-value treatment", "u_tiago", 24 * 20, "high", "ms_ba_1"],
    ["t_ba_4", "Exploratory data analysis", "u_alex", 24 * 16, "high", "ms_ba_1"],
    ["t_ba_5", "Feature engineering", "u_alex", 24 * 10, "high", "ms_ba_2"],
    ["t_ba_6", "Train/test split & CV setup", "u_tiago", 24 * 9, "medium", "ms_ba_2"],
    ["t_ba_7", "Baseline logistic regression", "u_ines", 24 * 6 + 4, "high", "ms_ba_2"],
    ["t_ba_8", "Literature review on churn", "u_lucas", 24 * 5 + 7, "low"],
    ["t_ba_9", "Gradient boosting model", "u_tiago", 24 * 3 + 2, "high"],
    ["t_ba_10", "Report structure & outline", "u_lucas", 24 * 2 + 5, "medium", "ms_ba_4"],
    ["t_ba_11", "Model comparison table", "u_ines", 24 + 3, "medium"],
    ["t_ba_12", "Dashboard wireframe", "u_alex", 6, "medium", "ms_ba_3"],
  ];
  for (const [id, title, who, h, pr, ms] of baDone)
    task(id, "p_ba", title, "done", pr, who, -Math.ceil(h / 24), { completedHoursAgo: h, milestoneId: ms, createdDaysAgo: 38 });
  task("t_ba_13", "p_ba", "Hyperparameter tuning", "in_progress", "medium", "u_tiago", 4, { updatedHoursAgo: 14, description: "Grid search on learning rate, depth and estimators. Track runs in the shared sheet." });
  task("t_ba_14", "p_ba", "Model interpretation (SHAP)", "todo", "high", "u_tiago", 7, { updatedHoursAgo: 50, milestoneId: "ms_ba_4" });
  task("t_ba_15", "p_ba", "Power BI dashboard", "todo", "medium", "u_tiago", 9, { updatedHoursAgo: 52, milestoneId: "ms_ba_3" });
  task("t_ba_16", "p_ba", "Executive summary", "todo", "medium", "u_lucas", 12, { updatedHoursAgo: 70, milestoneId: "ms_ba_4" });

  // Entrepreneurship: 2 of 10 done, nothing touched for 6 days (stalled).
  const STALE = 24 * 6 + 4;
  task("t_ent_1", "p_ent", "Problem statement one-pager", "done", "high", "u_beatriz", -8, { completedHoursAgo: 24 * 9, createdDaysAgo: 13, milestoneId: "ms_ent_1" });
  task("t_ent_2", "p_ent", "Competitor landscape", "done", "medium", "u_maria", -6, { completedHoursAgo: STALE, createdDaysAgo: 13 });
  task("t_ent_3", "p_ent", "Customer interviews (10+)", "todo", "high", null, 7, { updatedHoursAgo: STALE + 2, createdDaysAgo: 12, milestoneId: "ms_ent_1", description: "Interview students and café managers. Use the shared interview script." });
  task("t_ent_4", "p_ent", "Lean canvas", "in_progress", "medium", "u_beatriz", 9, { updatedHoursAgo: STALE + 5, createdDaysAgo: 12 });
  task("t_ent_5", "p_ent", "Unit economics model", "todo", "high", "u_beatriz", 14, { updatedHoursAgo: STALE + 6, createdDaysAgo: 12 });
  task("t_ent_6", "p_ent", "Clickable prototype (Figma)", "todo", "medium", "u_rafael", 20, { updatedHoursAgo: STALE + 8, createdDaysAgo: 11, milestoneId: "ms_ent_2" });
  task("t_ent_7", "p_ent", "Landing page smoke test", "todo", "low", "u_rafael", 18, { updatedHoursAgo: STALE + 8, createdDaysAgo: 11 });
  task("t_ent_8", "p_ent", "Partnership outreach to campus cafés", "todo", "medium", "u_maria", 15, { updatedHoursAgo: STALE + 9, createdDaysAgo: 11 });
  task("t_ent_9", "p_ent", "Pitch narrative draft", "todo", "medium", "u_alex", 22, { updatedHoursAgo: STALE + 10, createdDaysAgo: 10, milestoneId: "ms_ent_2" });
  task("t_ent_10", "p_ent", "Demo Day logistics", "todo", "low", "u_beatriz", 28, { updatedHoursAgo: STALE + 12, createdDaysAgo: 10 });

  // ── Subtasks & comments ──────────────────────────────────────────────
  const subtasks: Subtask[] = [];
  const sub = (taskId: string, items: [string, boolean][]) =>
    items.forEach(([title, done], i) =>
      subtasks.push({ id: `${taskId}_s${i + 1}`, taskId, title, done, createdAt: at(-5) }),
    );
  sub("t_mkt_9", [["Big idea & tagline", true], ["Key visual mock-ups", true], ["Media flight calendar", false], ["Influencer shortlist", false]]);
  sub("t_mkt_10", [["Campus café partners", true], ["Vending machine pilot", true], ["Online store margin check", false]]);
  sub("t_mkt_11", [["Budget split by channel", true], ["KPI tree", false], ["Break-even chart", false]]);
  sub("t_mkt_12", [["Storyline outline", false], ["Slide template", false], ["Speaker split", false], ["Dry run", false]]);
  sub("t_ba_13", [["Learning-rate sweep", true], ["Depth sweep", false], ["Log best params", false]]);
  sub("t_ent_3", [["Interview script", true], ["Book 5 students", false], ["Book 5 café managers", false]]);

  const comments: TaskComment[] = [
    { id: "c1", taskId: "t_mkt_9", authorId: "u_maria", body: "Key visuals are in the Drive. Media plan will take one more evening — sorry for the delay!", createdAt: ago(20) },
    { id: "c2", taskId: "t_mkt_9", authorId: "u_sarah", body: "Love the tagline. Happy to help with the influencer list tomorrow.", createdAt: ago(18) },
    { id: "c3", taskId: "t_mkt_10", authorId: "u_joao", body: "@Alex ready for your review. I added the vending pilot numbers on p.3.", createdAt: ago(9) },
    { id: "c4", taskId: "t_mkt_11", authorId: "u_alex", body: "Budget split done. Working on the KPI tree next.", createdAt: ago(5) },
    { id: "c5", taskId: "t_ba_13", authorId: "u_tiago", body: "Best AUC so far 0.86 with depth 6. Still running the depth sweep.", createdAt: ago(14) },
    { id: "c6", taskId: "t_ent_3", authorId: "u_beatriz", body: "Who wants to own this? It blocks the problem-validation milestone.", createdAt: ago(STALE + 2) },
  ];

  // ── Meetings & availability ──────────────────────────────────────────
  // Next five weekdays starting tomorrow (always contains exactly one Wednesday).
  const pollDays: Date[] = [];
  for (let d = 1; pollDays.length < 5; d++) {
    const x = addDays(today, d);
    if (!isWeekend(x)) pollDays.push(x);
  }

  const meetings: Meeting[] = [
    {
      id: "m_mkt_rehearsal",
      projectId: "p_mkt",
      title: "Final presentation rehearsal",
      description: "Full run-through with timing. Bring your speaker notes.",
      location: "NOVA SBE · Room C-102",
      organizerId: "u_alex",
      durationMinutes: 90,
      candidateDates: [dayKey(addDays(today, 2))],
      dayStartHour: 9,
      dayEndHour: 20,
      slotMinutes: 30,
      inviteeIds: ["u_alex", "u_maria", "u_joao", "u_sarah"],
      status: "confirmed",
      confirmedStart: at(2, 17, 30),
      confirmedEnd: at(2, 19, 0),
      createdAt: at(-4, 13),
    },
    {
      id: "m_mkt_debrief",
      projectId: "p_mkt",
      title: "Survey results debrief",
      description: "Walk through the survey findings and agree on personas.",
      location: "Zoom",
      organizerId: "u_maria",
      durationMinutes: 60,
      candidateDates: [dayKey(addDays(today, -5))],
      dayStartHour: 9,
      dayEndHour: 20,
      slotMinutes: 30,
      inviteeIds: ["u_alex", "u_maria", "u_joao", "u_sarah"],
      status: "confirmed",
      confirmedStart: at(-5, 18),
      confirmedEnd: at(-5, 19),
      createdAt: at(-8, 10),
    },
    {
      id: "m_ba_sync",
      projectId: "p_ba",
      title: "Weekly sync",
      description: "Status round, blockers, next steps. 45 minutes max.",
      location: "Google Meet",
      organizerId: "u_tiago",
      durationMinutes: 45,
      candidateDates: [dayKey(addDays(today, 1))],
      dayStartHour: 9,
      dayEndHour: 19,
      slotMinutes: 15,
      inviteeIds: ["u_tiago", "u_alex", "u_ines", "u_lucas"],
      status: "confirmed",
      confirmedStart: at(1, 10),
      confirmedEnd: at(1, 10, 45),
      createdAt: at(-7, 9),
    },
    {
      id: "m_ba_ta",
      projectId: "p_ba",
      title: "Model review with TA",
      description: "Present the tuned model and SHAP findings to the TA.",
      location: "NOVA SBE · Office hours, B-215",
      organizerId: "u_tiago",
      durationMinutes: 60,
      candidateDates: [dayKey(addDays(today, 6))],
      dayStartHour: 9,
      dayEndHour: 19,
      slotMinutes: 30,
      inviteeIds: ["u_tiago", "u_alex", "u_ines", "u_lucas"],
      status: "confirmed",
      confirmedStart: at(6, 14),
      confirmedEnd: at(6, 15),
      createdAt: at(-3, 16),
    },
    {
      id: "m_ent_workshop",
      projectId: "p_ent",
      title: "Pitch strategy workshop",
      description:
        "Restart momentum: agree on the interview plan, split the pitch storyline and assign owners.",
      location: "NOVA SBE · Startup Lab",
      organizerId: "u_beatriz",
      durationMinutes: 60,
      candidateDates: pollDays.map(dayKey),
      dayStartHour: 9,
      dayEndHour: 19,
      slotMinutes: 30,
      inviteeIds: ["u_beatriz", "u_alex", "u_rafael", "u_maria"],
      status: "polling",
      confirmedStart: null,
      confirmedEnd: null,
      createdAt: ago(70),
    },
  ];

  // Weekday-based availability so the overlap always lands on Wednesday 15:00–17:00.
  type Range = [number, number]; // decimal hours, e.g. 14.5 = 14:30
  const weekly: Record<string, Record<number, Range[]>> = {
    u_beatriz: { 1: [[10, 12]], 2: [[14, 18]], 3: [[13, 17]], 4: [[9, 11]], 5: [[10, 13]] },
    u_rafael: { 1: [[11, 13]], 2: [[9, 12]], 3: [[14.5, 18]], 4: [[15, 18]], 5: [[11, 12]] },
    u_maria: { 1: [[9, 11.5]], 2: [[16, 19]], 3: [[15, 17]], 4: [[10, 12]], 5: [[14, 16]] },
  };
  const slotsFor = (userId: string) => {
    const out: string[] = [];
    for (const day of pollDays) {
      for (const [from, to] of weekly[userId][day.getDay()] ?? []) {
        for (let h = from; h < to; h += 0.5) {
          const x = new Date(day);
          x.setHours(Math.floor(h), h % 1 ? 30 : 0, 0, 0);
          out.push(cellKey(x));
        }
      }
    }
    return out;
  };
  const availability: Availability[] = [
    { meetingId: "m_ent_workshop", userId: "u_beatriz", slots: slotsFor("u_beatriz"), updatedAt: ago(69) },
    { meetingId: "m_ent_workshop", userId: "u_rafael", slots: slotsFor("u_rafael"), updatedAt: ago(40) },
    { meetingId: "m_ent_workshop", userId: "u_maria", slots: slotsFor("u_maria"), updatedAt: ago(16) },
  ];

  // ── Calendar events ──────────────────────────────────────────────────
  const events: CalendarEvent[] = [
    { id: "e1", projectId: null, title: "Guest lecture: Building a startup in Lisbon", description: "Auditorium A · open to all students.", start: at(4, 18), end: at(4, 19, 30), createdBy: "u_alex", createdAt: at(-3) },
    { id: "e2", projectId: "p_ba", title: "Library study block", description: "Silent floor, booked room 3.", start: at(3, 14), end: at(3, 17), createdBy: "u_ines", createdAt: at(-2) },
    { id: "e3", projectId: "p_ent", title: "Café partner visit", description: "Meet the manager at the campus café.", start: at(10, 11), end: at(10, 12), createdBy: "u_beatriz", createdAt: at(-6) },
  ];

  // ── Project updates ──────────────────────────────────────────────────
  const updates: ProjectUpdate[] = [
    { id: "up1", projectId: "p_mkt", authorId: "u_maria", body: "Survey closed with 182 responses 🎉 Cleaned dataset and key charts are in the shared folder.", createdAt: ago(24 * 6 + 2) },
    { id: "up2", projectId: "p_mkt", authorId: "u_alex", body: "Rehearsal is booked for the day after tomorrow at 17:30. Let's have every section in the deck by then so we can time it properly.", createdAt: ago(30) },
    { id: "up3", projectId: "p_ba", authorId: "u_tiago", body: "Gradient boosting beats the baseline: AUC 0.86 vs 0.79. Next up: tuning and SHAP.", createdAt: ago(24 * 3) },
    { id: "up4", projectId: "p_ent", authorId: "u_beatriz", body: "Let's find a time for a workshop this week to get the interviews going. Please add your availability!", createdAt: ago(70) },
  ];

  // ── Activity feed ────────────────────────────────────────────────────
  let n = 0;
  const act = (
    projectId: string,
    actorId: string,
    type: ActivityEvent["type"],
    hoursAgo: number,
    meta: ActivityEvent["meta"] = {},
  ): ActivityEvent => ({ id: `a${++n}`, projectId, actorId, type, meta, createdAt: ago(hoursAgo) });

  const activity: ActivityEvent[] = [
    act("p_mkt", "u_alex", "task_moved", 5, { taskId: "t_mkt_11", taskTitle: "Budget & KPI dashboard", from: "todo", to: "in_progress" }),
    act("p_ba", "u_alex", "task_completed", 6, { taskId: "t_ba_12", taskTitle: "Dashboard wireframe" }),
    act("p_mkt", "u_joao", "task_moved", 9, { taskId: "t_mkt_10", taskTitle: "Channel & distribution plan", from: "in_progress", to: "in_review" }),
    act("p_mkt", "u_joao", "task_commented", 9, { taskId: "t_mkt_10", taskTitle: "Channel & distribution plan", excerpt: "@Alex ready for your review." }),
    act("p_ba", "u_tiago", "task_updated", 14, { taskId: "t_ba_13", taskTitle: "Hyperparameter tuning" }),
    act("p_ent", "u_maria", "availability_shared", 16, { meetingId: "m_ent_workshop", meetingTitle: "Pitch strategy workshop" }),
    act("p_mkt", "u_maria", "task_commented", 20, { taskId: "t_mkt_9", taskTitle: "Campaign concept & media plan", excerpt: "Key visuals are in the Drive." }),
    act("p_ba", "u_ines", "task_completed", 27, { taskId: "t_ba_11", taskTitle: "Model comparison table" }),
    act("p_mkt", "u_sarah", "task_completed", 26, { taskId: "t_mkt_8", taskTitle: "Pricing strategy" }),
    act("p_mkt", "u_alex", "update_posted", 30, { excerpt: "Rehearsal is booked for the day after tomorrow at 17:30." }),
    act("p_ent", "u_rafael", "availability_shared", 40, { meetingId: "m_ent_workshop", meetingTitle: "Pitch strategy workshop" }),
    act("p_mkt", "u_alex", "milestone_completed", 24 * 2 - 5, { milestoneTitle: "Strategy draft approved" }),
    act("p_ba", "u_lucas", "task_completed", 24 * 2 + 5, { taskId: "t_ba_10", taskTitle: "Report structure & outline" }),
    act("p_ent", "u_beatriz", "meeting_proposed", 70, { meetingId: "m_ent_workshop", meetingTitle: "Pitch strategy workshop" }),
    act("p_ent", "u_beatriz", "availability_shared", 69, { meetingId: "m_ent_workshop", meetingTitle: "Pitch strategy workshop" }),
    act("p_ba", "u_tiago", "task_completed", 24 * 3 + 2, { taskId: "t_ba_9", taskTitle: "Gradient boosting model" }),
    act("p_ba", "u_tiago", "meeting_confirmed", 24 * 3 - 8, { meetingId: "m_ba_ta", meetingTitle: "Model review with TA" }),
    act("p_mkt", "u_alex", "task_completed", 24 * 3 + 6, { taskId: "t_mkt_6", taskTitle: "Positioning statement" }),
    act("p_mkt", "u_alex", "meeting_confirmed", 24 * 4 - 11, { meetingId: "m_mkt_rehearsal", meetingTitle: "Final presentation rehearsal" }),
    act("p_mkt", "u_joao", "task_completed", 24 * 4 + 1, { taskId: "t_mkt_7", taskTitle: "SWOT analysis" }),
    act("p_mkt", "u_alex", "task_completed", 24 * 5 + 2, { taskId: "t_mkt_5", taskTitle: "Student personas" }),
    act("p_ba", "u_lucas", "task_completed", 24 * 5 + 7, { taskId: "t_ba_8", taskTitle: "Literature review on churn" }),
    act("p_ent", "u_maria", "task_completed", STALE, { taskId: "t_ent_2", taskTitle: "Competitor landscape" }),
    act("p_ba", "u_ines", "task_completed", 24 * 6 + 4, { taskId: "t_ba_7", taskTitle: "Baseline logistic regression" }),
    act("p_mkt", "u_maria", "task_completed", 24 * 6 + 3, { taskId: "t_mkt_4", taskTitle: "Survey analysis — 182 responses" }),
    act("p_mkt", "u_maria", "update_posted", 24 * 6 + 2, { excerpt: "Survey closed with 182 responses 🎉" }),
    act("p_ent", "u_beatriz", "task_assigned", STALE + 6, { taskId: "t_ent_5", taskTitle: "Unit economics model", assigneeId: "u_beatriz" }),
    act("p_ent", "u_maria", "member_joined", 24 * 12),
    act("p_ent", "u_rafael", "member_joined", 24 * 13),
    act("p_ent", "u_beatriz", "project_created", 24 * 14),
  ];

  // ── Notifications for Alex ───────────────────────────────────────────
  const notifications: Notification[] = [
    { id: "n1", userId: "u_alex", title: "Beatriz needs your availability", body: "Pitch strategy workshop · 3 of 4 teammates responded", href: "/meetings/m_ent_workshop", read: false, createdAt: ago(16) },
    { id: "n2", userId: "u_alex", title: "João requested your review", body: "Channel & distribution plan is in review", href: "/projects/p_mkt/tasks?task=t_mkt_10", read: false, createdAt: ago(9) },
    { id: "n3", userId: "u_alex", title: "Tiago scheduled a meeting", body: "Model review with TA", href: "/meetings/m_ba_ta", read: true, createdAt: ago(24 * 3 - 8) },
  ];

  return {
    profiles,
    projects,
    members,
    tasks,
    subtasks,
    comments,
    milestones,
    meetings,
    availability,
    events,
    updates,
    activity,
    notifications,
  };
}
