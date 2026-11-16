"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Database, LogOut, Monitor, Moon, RotateCcw, Sun, X } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Field, nativeSelectClass } from "@/components/app/dialogs/form-field";
import { hourLabel } from "@/lib/dates";
import { applyTheme, THEME_KEY, type ThemePref } from "@/lib/theme";
import { useLocalPref } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const SUGGESTED = ["Marketing", "Finance", "Strategy", "Data & Analytics", "Startups", "Sustainability", "Product", "Design", "Consulting", "Economics", "Tech", "Social impact"];

const schema = z
  .object({
    name: z.string().trim().min(2, "Tell us your name").max(60),
    degree: z.string().trim().max(80),
    bio: z.string().trim().max(240, "Keep it under 240 characters"),
    interests: z.array(z.string()).max(12, "Pick up to 12"),
    workStartHour: z.number().int().min(0).max(23),
    workEndHour: z.number().int().min(1).max(24),
  })
  .refine((v) => v.workEndHour > v.workStartHour, { path: ["workEndHour"], message: "Must be after the start time" });
type Values = z.infer<typeof schema>;

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 grid gap-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6 lg:grid-cols-[240px_1fr]" aria-labelledby={`${id}-h`}>
      <div>
        <h2 id={`${id}-h`} className="text-[15px] font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SettingsView() {
  const { me, mode, run, signOut, resetDemo } = useReadyWorkspace();
  const router = useRouter();
  const [custom, setCustom] = React.useState("");
  const [theme, setTheme] = useLocalPref<ThemePref>(THEME_KEY, "light", ["light", "dark", "system"]);

  const defaults = React.useMemo<Values>(
    () => ({ name: me.name, degree: me.degree, bio: me.bio, interests: me.interests, workStartHour: me.workStartHour, workEndHour: me.workEndHour }),
    [me],
  );
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { register, handleSubmit, setValue, formState, reset, control } = form;
  // Pick up changes made elsewhere (another tab) when the form is untouched.
  React.useEffect(() => {
    if (!formState.isDirty) reset(defaults);
  }, [defaults, formState.isDirty, reset]);

  const interests = useWatch({ control, name: "interests" });
  const name = useWatch({ control, name: "name" });
  const bio = useWatch({ control, name: "bio" });
  const toggleInterest = (i: string) =>
    setValue("interests", interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i], { shouldDirty: true, shouldValidate: true });

  const onSubmit = handleSubmit(async (v) => {
    const r = await run({ type: "profile.update", input: v }, { success: "Profile saved" });
    if (r) reset(v);
  });

  const addCustom = () => {
    const v = custom.trim();
    if (!v || interests.includes(v) || v.length > 30) return;
    setValue("interests", [...interests, v], { shouldDirty: true, shouldValidate: true });
    setCustom("");
  };

  const chooseTheme = (t: ThemePref) => {
    setTheme(t);
    applyTheme(t);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" description="Your profile, scheduling preferences and account." />

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <Section id="profile" title="Profile" description="Teammates see this on your profile and in project member lists.">
          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <Avatar person={{ ...me, name: name || me.name }} size="xl" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{name || me.name}</p>
                <p className="truncate text-[12.5px] text-muted-foreground">{me.email}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="s-name" error={formState.errors.name?.message}>
                <Input id="s-name" {...register("name")} aria-invalid={!!formState.errors.name} />
              </Field>
              <Field label="Degree or course" htmlFor="s-degree" error={formState.errors.degree?.message}>
                <Input id="s-degree" {...register("degree")} placeholder="BSc Management · NOVA SBE" />
              </Field>
            </div>
            <Field label="Email" htmlFor="s-email" hint={mode === "demo" ? "The demo account's email can't be changed." : "Change your email through your sign-in provider."}>
              <Input id="s-email" value={me.email} readOnly disabled />
            </Field>
            <Field label="Short bio" htmlFor="s-bio" error={formState.errors.bio?.message} hint={`${bio.length}/240`}>
              <Textarea id="s-bio" rows={3} {...register("bio")} placeholder="What you bring to a team" />
            </Field>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set([...SUGGESTED, ...interests])].map((i) => {
                  const on = interests.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleInterest(i)}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/20",
                      )}
                    >
                      {on && <Check className="size-3" />} {i}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  maxLength={30}
                  placeholder="Add your own"
                  aria-label="Add a custom interest"
                  className="max-w-xs"
                />
                <Button type="button" variant="outline" onClick={addCustom} disabled={!custom.trim()}>
                  Add
                </Button>
              </div>
              {formState.errors.interests && <p className="text-[12px] text-destructive">{formState.errors.interests.message}</p>}
            </div>
          </div>
        </Section>

        <Section id="preferences" title="Preferences" description="The meeting matcher prefers slots inside your working hours when it ranks options.">
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Working hours start" htmlFor="s-start">
                <select id="s-start" className={nativeSelectClass} {...register("workStartHour", { valueAsNumber: true })}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Working hours end" htmlFor="s-end" error={formState.errors.workEndHour?.message}>
                <select id="s-end" className={nativeSelectClass} {...register("workEndHour", { valueAsNumber: true })}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h % 24)}
                      {h === 24 ? " (midnight)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Appearance</p>
              <div className="grid grid-cols-3 gap-2 sm:max-w-sm" role="radiogroup" aria-label="Theme">
                {(
                  [
                    ["light", Sun, "Light"],
                    ["dark", Moon, "Dark"],
                    ["system", Monitor, "System"],
                  ] as const
                ).map(([t, Icon, label]) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={theme === t}
                    onClick={() => chooseTheme(t)}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border bg-card px-3 py-3 text-[12.5px] font-medium transition hover:border-foreground/20",
                      theme === t && "border-primary ring-2 ring-primary/15",
                    )}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-muted-foreground">Saved on this device and applied immediately.</p>
            </div>
          </div>
        </Section>

        <div className="sticky bottom-20 z-10 flex items-center justify-end gap-2 rounded-2xl border bg-card/90 p-3 shadow-lift backdrop-blur md:bottom-4">
          <p className="mr-auto pl-1 text-[12.5px] text-muted-foreground">{formState.isDirty ? "You have unsaved changes." : "All changes saved."}</p>
          <Button type="button" variant="ghost" onClick={() => reset(defaults)} disabled={!formState.isDirty || formState.isSubmitting}>
            <X /> Discard
          </Button>
          <Button type="submit" disabled={!formState.isDirty || formState.isSubmitting}>
            <Check /> Save changes
          </Button>
        </div>
      </form>

      <Section id="account" title="Account & data" description="Where your data lives and how to leave.">
        <div className="grid gap-4">
          <div className="flex gap-3 rounded-xl border bg-secondary/40 p-4">
            <Database className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="text-[13px]">
              <p className="font-medium">{mode === "demo" ? "Demo mode" : "Connected to Supabase"}</p>
              <p className="mt-0.5 text-muted-foreground">
                {mode === "demo"
                  ? "Everything is stored in this browser's local storage. Changes sync between tabs on this device, but nothing leaves your computer."
                  : "Your workspace is stored in Postgres and protected by row-level security. Teammates see changes in real time."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === "demo" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw /> Reset demo data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset the demo workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Every change you made in this browser will be replaced with the original demo data, with dates recalculated for today.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await resetDemo();
                        router.replace("/dashboard");
                      }}
                    >
                      Reset demo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <LogOut /> Log out
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
