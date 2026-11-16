import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FolderPlus,
  HeartPulse,
  ListChecks,
  MessageCircleWarning,
  Repeat2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/landing/product-preview";
import { ScheduleDemo } from "@/components/landing/schedule-demo";
import { TaskPreview } from "@/components/landing/task-preview";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: { absolute: "NOVA SYNC — Group projects. Finally in sync." },
};

const PROBLEMS = [
  { icon: MessageCircleWarning, title: "Plans lost in group chats", text: "Decisions, files and deadlines scroll away under 200 unread messages." },
  { icon: CalendarClock, title: "Endless “when is everyone free?”", text: "Polls in one app, calendars in another, and nobody knows what was agreed." },
  { icon: Repeat2, title: "Uneven workload", text: "One person carries the project and the rest find out at the last minute." },
  { icon: BellRing, title: "Deadline surprises", text: "Everyone thought someone else was finishing the slides the night before." },
];

const BENEFITS = [
  { icon: ListChecks, title: "One shared plan", text: "Tasks, owners, subtasks and milestones live in one workspace. Progress updates itself as work moves.", tint: "from-blue-500/15 to-blue-500/0" },
  { icon: CalendarDays, title: "Meetings that schedule themselves", text: "Everyone paints their free time once. NOVA SYNC ranks the best slots and books the winner into every calendar.", tint: "from-violet-500/15 to-violet-500/0" },
  { icon: HeartPulse, title: "Early warnings, not late panic", text: "Project health and Sync Intelligence flag overdue work, overloaded teammates and stalled projects, with the reasons shown.", tint: "from-emerald-500/15 to-emerald-500/0" },
];

const INSIGHTS = [
  {
    tone: "bg-rose-500",
    chip: "Critical",
    chipTone: "text-rose-200 bg-rose-500/25",
    title: "Your Marketing Strategy deadline is in 3 days, but 4 tasks are still incomplete.",
    rule: "Deadline within 7 days with open tasks. Critical within 3 days.",
    evidence: ["8 of 12 tasks done (67%)", "Open: Campaign concept & media plan", "Open: Final presentation deck"],
  },
  {
    tone: "bg-amber-500",
    chip: "High",
    chipTone: "text-amber-200 bg-amber-500/25",
    title: "Your team is waiting on your availability for “Pitch strategy workshop”.",
    rule: "You're invited to an open meeting poll and haven't marked your free time yet.",
    evidence: ["Beatriz, Rafael and Maria have answered", "3 of 4 invitees responded"],
  },
  {
    tone: "bg-blue-500",
    chip: "Medium",
    chipTone: "text-blue-200 bg-blue-500/25",
    title: "Tiago is carrying most of the open work in Business Analytics.",
    rule: "One member holds at least 1.75× the team's average of open tasks and 3+ more than the lightest load.",
    evidence: ["Tiago: 3 open tasks", "Lucas: 1 open task", "Alex and Inês: 0 open tasks"],
  },
];

const STEPS = [
  { icon: FolderPlus, title: "Create a project", text: "Add the course, the deadline and a colour. It takes under a minute." },
  { icon: UserPlus, title: "Invite your group", text: "Share a short invite code. Teammates join in one step." },
  { icon: Sparkles, title: "Plan, meet and deliver", text: "Split the work, find a meeting time, and let NOVA SYNC keep everyone in sync." },
];

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[13px] font-semibold tracking-wide text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-[15px] text-balance text-muted-foreground">{text}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-transparent bg-background/75 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-[13.5px] text-muted-foreground md:flex" aria-label="Sections">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#scheduling" className="hover:text-foreground">Scheduling</a>
            <a href="#intelligence" className="hover:text-foreground">Sync Intelligence</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-4 pt-14 pb-20 sm:px-6 sm:pt-20">
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)] opacity-60" aria-hidden />
          <div className="relative mx-auto max-w-3xl text-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-[12.5px] font-medium shadow-soft transition hover:border-foreground/20"
            >
              <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-[10.5px] font-semibold text-white">NOVA University Lisbon</span>
              Built for student teams
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </Link>
            <h1 className="mt-6 text-[42px] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Group projects. <span className="text-brand-gradient">Finally in sync.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-balance text-muted-foreground sm:text-lg">
              One workspace for your team, tasks, meetings, and deadlines. Less coordination. More collaboration.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="brand" asChild className="h-12 w-full px-6 text-[15px] sm:w-auto">
                <Link href="/signup">
                  Get Started <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 w-full px-6 text-[15px] sm:w-auto">
                <Link href="/demo">Explore Demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-[12.5px] text-muted-foreground">No sign-up needed for the demo. Everything runs in your browser.</p>
          </div>
          <Reveal className="relative mt-14 sm:mt-16">
            <ProductPreview />
          </Reveal>
        </section>

        {/* Problem */}
        <section className="px-4 py-20 sm:px-6" aria-labelledby="problem">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="The problem" title="Group work breaks down in the gaps between apps" text="Chats, polls, shared drives and spreadsheets each hold a piece. Nobody holds the whole picture." />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PROBLEMS.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.06} className="rounded-2xl border bg-card p-5 shadow-soft">
                  <p.icon className="size-5 text-rose-500" />
                  <h3 className="mt-4 text-[15px] font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{p.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="features" className="scroll-mt-16 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Better together" title="Everything your group needs, in one place" />
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {BENEFITS.map((b, i) => (
                <Reveal key={b.title} delay={i * 0.08} className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b ${b.tint} bg-card p-7 shadow-soft`}>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-navy text-white dark:bg-white dark:text-navy">
                    <b.icon className="size-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">{b.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{b.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Scheduling demo */}
        <section id="scheduling" className="scroll-mt-16 bg-secondary/40 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Smart Meeting Scheduler"
              title="Find a time that works for everyone in seconds"
              text="Three teammates have already answered. Paint your own free hours and watch the best match update. This is the same flow as in the app."
            />
            <Reveal className="mt-12">
              <ScheduleDemo />
            </Reveal>
          </div>
        </section>

        {/* Task collaboration */}
        <section className="px-4 py-20 sm:px-6" aria-labelledby="tasks-h">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[380px_1fr]">
            <div>
              <p className="text-[13px] font-semibold tracking-wide text-primary">Task collaboration</p>
              <h2 id="tasks-h" className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Everyone knows who&apos;s doing what, and by when.
              </h2>
              <ul className="mt-6 space-y-3 text-[14px] text-muted-foreground">
                {["Drag-and-drop Kanban or a focused list view", "Owners, priorities, due dates and subtasks", "Comments and review requests on every task", "Progress calculated from real task status"].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <Reveal>
              <TaskPreview />
            </Reveal>
          </div>
        </section>

        {/* Intelligence */}
        <section id="intelligence" className="scroll-mt-16 bg-navy px-4 py-20 text-white sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-wide text-violet-300">
                <BrainCircuit className="size-4" /> Sync Intelligence
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Insights you can actually trust</h2>
              <p className="mt-3 text-[15px] text-balance text-white/65">
                No black box and no invented AI. Every insight comes from a transparent rule over your real project data, and you can always see why it appeared.
              </p>
            </div>
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {INSIGHTS.map((ins, i) => (
                <Reveal key={ins.title} delay={i * 0.08} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <span className={`absolute inset-y-0 left-0 w-[3px] ${ins.tone}`} aria-hidden />
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wider uppercase ${ins.chipTone}`}>{ins.chip}</span>
                  <p className="mt-3 text-[15px] leading-snug font-semibold text-balance">{ins.title}</p>
                  <details className="group mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[12.5px]">
                    <summary className="cursor-pointer list-none font-medium text-white/80 marker:hidden">
                      Why am I seeing this? <span className="inline-block transition group-open:rotate-180">⌄</span>
                    </summary>
                    <p className="mt-2 text-white/60">{ins.rule}</p>
                    <ul className="mt-2 space-y-0.5 text-white/60">
                      {ins.evidence.map((e) => (
                        <li key={e}>· {e}</li>
                      ))}
                    </ul>
                  </details>
                </Reveal>
              ))}
            </div>
            <p className="mt-8 flex items-center justify-center gap-2 text-[13px] text-white/55">
              <ShieldCheck className="size-4" /> Rules run on your workspace data only. Nothing is sent to an AI model.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <SectionHeading eyebrow="How it works" title="Up and running before your next seminar" />
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08} className="relative rounded-2xl border bg-card p-6 shadow-soft">
                  <span className="absolute top-5 right-5 text-[40px] leading-none font-semibold text-secondary tabular-nums" aria-hidden>
                    {i + 1}
                  </span>
                  <s.icon className="size-5 text-primary" />
                  <h3 className="mt-5 text-[16px] font-semibold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{s.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <section id="cta" className="scroll-mt-16 px-4 pb-24 sm:px-6">
          <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-navy px-6 py-14 text-center text-white sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -top-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-brand-gradient opacity-40 blur-[100px]" aria-hidden />
            <div className="relative">
              <Users className="mx-auto size-8 text-white/80" />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Better Together.</h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-white/70">Bring your group into one workspace and spend your time on the work, not on chasing each other.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild className="h-12 w-full bg-white px-6 text-[15px] text-navy hover:bg-white/90 sm:w-auto">
                  <Link href="/signup">
                    Get Started <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 w-full border-white/25 bg-transparent px-6 text-[15px] text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  <Link href="/demo">Explore Demo</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-[12.5px] text-muted-foreground sm:flex-row">
          <Logo />
          <p>NOVA SYNC — Better Together. A student project for NOVA University Lisbon.</p>
        </div>
      </footer>
    </div>
  );
}
