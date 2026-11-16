"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { addDays, format } from "date-fns";
import { ArrowLeft, ArrowRight, Check, FolderPlus, KeyRound, Loader2, Sparkles } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import { dateInputToIso } from "@/components/app/dialogs/form-field";
import { cn } from "@/lib/utils";

const DEGREES = [
  "BSc Management · NOVA SBE",
  "BSc Economics · NOVA SBE",
  "BSc Finance · NOVA SBE",
  "BSc Data Science · NOVA IMS",
  "MSc Computer Science · NOVA FCT",
  "Exchange student",
];
const INTERESTS = [
  "Marketing", "Finance", "Strategy", "Data & Analytics", "Startups", "Sustainability",
  "Product", "Design", "Consulting", "Economics", "Tech", "Social impact",
];

type Choice = "create" | "join" | "explore";

export default function OnboardingPage() {
  const { status, me, run } = useWorkspace();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [nameDraft, setName] = React.useState<string | null>(null);
  const name = nameDraft ?? me?.name ?? "";
  const [degree, setDegree] = React.useState("");
  const [interests, setInterests] = React.useState<string[]>([]);
  const [choice, setChoice] = React.useState<Choice>("create");
  const [projectName, setProjectName] = React.useState("");
  const [course, setCourse] = React.useState("");
  const [deadline, setDeadline] = React.useState(format(addDays(new Date(), 21), "yyyy-MM-dd"));
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const finishing = React.useRef(false);

  React.useEffect(() => {
    if (status === "signed_out") router.replace("/signup");
    if (status === "ready" && me) {
      if (me.onboarded && !finishing.current) router.replace("/dashboard");
    }
  }, [status, me, router]);

  if (status !== "ready" || !me)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );

  const steps = ["About you", "Interests", "Your first project"];
  const canNext =
    step === 0 ? name.trim().length >= 2 : step === 1 ? true : choice === "explore" || (choice === "create" ? projectName.trim().length >= 3 && course.trim().length >= 2 : code.trim().length >= 4);

  async function finish() {
    finishing.current = true;
    setBusy(true);
    setError(null);
    const profile = await run(
      { type: "profile.update", input: { name, degree, interests, onboarded: choice === "explore" } },
      { silent: true },
    );
    if (!profile) {
      setBusy(false);
      finishing.current = false;
      setError("We couldn't save your profile. Please try again.");
      return;
    }
    let dest = "/dashboard";
    if (choice === "create") {
      const r = await run(
        {
          type: "project.create",
          input: { name: projectName, course, courseCode: "", description: "", deadline: dateInputToIso(deadline), color: "#2563EB", emoji: "🚀" },
        },
        { silent: true },
      );
      if (!r?.createdId) {
        setBusy(false);
        setError("Please check the project details.");
        return;
      }
      dest = `/projects/${r.createdId}`;
    } else if (choice === "join") {
      try {
        const r = await run({ type: "member.join", code }, { silent: true });
        if (!r?.createdId) throw new Error();
        dest = `/projects/${r.createdId}`;
      } catch {
        setBusy(false);
        setError("That invite code didn't match a project. Check it with your teammate.");
        return;
      }
    }
    if (choice !== "explore") await run({ type: "profile.update", input: { onboarded: true } }, { silent: true });
    router.replace(dest);
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-48 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-brand-gradient opacity-[0.12] blur-[120px]" aria-hidden />
      <header className="relative flex items-center justify-between px-5 py-5 sm:px-10">
        <Logo />
        <p className="text-[13px] text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-5 pt-6 pb-16 sm:pt-14">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                <motion.div className="h-full bg-brand-gradient" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <section aria-labelledby="ob-0">
                  <p className="text-[13px] font-semibold text-primary">Welcome to NOVA SYNC</p>
                  <h1 id="ob-0" className="mt-1 text-3xl font-semibold tracking-tight">Let&apos;s get you set up.</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Your teammates will see this on your profile.</p>
                  <div className="mt-8 grid gap-5">
                    <div className="grid gap-1.5">
                      <Label htmlFor="ob-name">What should we call you?</Label>
                      <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-11 text-base" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Degree or course</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {DEGREES.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDegree(d)}
                            aria-pressed={degree === d}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-xl border bg-card px-3.5 py-3 text-left text-[13px] shadow-soft transition hover:border-foreground/20",
                              degree === d && "border-primary ring-2 ring-primary/15",
                            )}
                          >
                            {d}
                            {degree === d && <Check className="size-4 text-primary" />}
                          </button>
                        ))}
                      </div>
                      <Input placeholder="Or type your own…" value={DEGREES.includes(degree) ? "" : degree} onChange={(e) => setDegree(e.target.value)} />
                    </div>
                  </div>
                </section>
              )}
              {step === 1 && (
                <section aria-labelledby="ob-1">
                  <h1 id="ob-1" className="text-3xl font-semibold tracking-tight">What are you into?</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Pick a few. It helps teammates know what you&apos;re great at.</p>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {INTERESTS.map((i) => {
                      const on = interests.includes(i);
                      return (
                        <motion.button
                          key={i}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          aria-pressed={on}
                          onClick={() => setInterests((xs) => (on ? xs.filter((x) => x !== i) : [...xs, i]))}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-[13.5px] font-medium shadow-soft transition",
                            on ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground/20",
                          )}
                        >
                          {on && <Check className="size-3.5" />} {i}
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}
              {step === 2 && (
                <section aria-labelledby="ob-2">
                  <h1 id="ob-2" className="text-3xl font-semibold tracking-tight">Start your first project</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Create a workspace for your group, or join one a teammate already set up.</p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        ["create", FolderPlus, "Create a project"],
                        ["join", KeyRound, "Join with a code"],
                        ["explore", Sparkles, "Just explore"],
                      ] as const
                    ).map(([c, Icon, label]) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setChoice(c)}
                        aria-pressed={choice === c}
                        className={cn(
                          "flex cursor-pointer flex-col items-start gap-2 rounded-xl border bg-card p-3.5 text-left text-[13px] font-medium shadow-soft transition hover:border-foreground/20",
                          choice === c && "border-primary ring-2 ring-primary/15",
                        )}
                      >
                        <Icon className={cn("size-5", choice === c ? "text-primary" : "text-muted-foreground")} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5">
                    {choice === "create" && (
                      <div className="grid gap-4 rounded-2xl border bg-card p-4 shadow-soft">
                        <div className="grid gap-1.5">
                          <Label htmlFor="ob-pn">Project name</Label>
                          <Input id="ob-pn" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Corporate Finance — Case Study" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor="ob-course">Course</Label>
                            <Input id="ob-course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Corporate Finance" />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="ob-dl">Deadline</Label>
                            <Input id="ob-dl" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}
                    {choice === "join" && (
                      <div className="grid gap-1.5 rounded-2xl border bg-card p-4 shadow-soft">
                        <Label htmlFor="ob-code">Invite code</Label>
                        <Input id="ob-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MKT-G04X" className="font-mono tracking-wider" />
                        <p className="text-[12px] text-muted-foreground">
                          Find it in the project&apos;s Team tab. Demo codes: <code className="font-mono">MKT-G04X</code>,{" "}
                          <code className="font-mono">BA-33FP</code>, <code className="font-mono">ENT-MESA</code>.
                        </p>
                      </div>
                    )}
                    {choice === "explore" && (
                      <p className="rounded-2xl border bg-card p-4 text-[13px] text-muted-foreground shadow-soft">
                        You&apos;ll land on an empty dashboard and can create or join a project any time.
                      </p>
                    )}
                  </div>
                  {error && (
                    <p role="alert" className="mt-3 text-[13px] text-destructive">
                      {error}
                    </p>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-10 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || busy} className={cn(step === 0 && "invisible")}>
              <ArrowLeft /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} size="lg">
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button onClick={finish} disabled={!canNext || busy} size="lg" variant="brand">
                {busy && <Loader2 className="animate-spin" />} Enter NOVA SYNC <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
