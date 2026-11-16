"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/dialogs/form-field";
import { DemoNotice } from "./demo-notice";

export function SignupForm() {
  const { signUp, mode, status, me } = useWorkspace();
  const router = useRouter();
  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, "Tell us your name"),
        email: z.string().trim().email("Enter a valid email"),
        password: mode === "supabase" ? z.string().min(8, "Use at least 8 characters") : z.string(),
      }),
    [mode],
  );
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "" } });

  React.useEffect(() => {
    if (status === "ready") router.replace(me?.onboarded ? "/dashboard" : "/onboarding");
  }, [status, me, router]);

  const onSubmit = form.handleSubmit(async (v) => {
    const ok = await signUp(v.name, v.email, v.password);
    if (ok) router.replace("/onboarding");
  });
  const { errors, isSubmitting } = form.formState;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">It takes less than a minute. Your group will thank you.</p>
      {mode === "demo" && (
        <div className="mt-5">
          <DemoNotice>
            <strong>Demo mode.</strong> Your account is saved only in this browser and needs no password. Connect
            Supabase (see README) for real sign-up with secure authentication.
          </DemoNotice>
        </div>
      )}
      <form onSubmit={onSubmit} className="mt-5 grid gap-4" noValidate>
        <Field label="Full name" htmlFor="s-name" error={errors.name?.message}>
          <Input id="s-name" autoComplete="name" placeholder="Alex Costa" aria-invalid={!!errors.name} {...form.register("name")} />
        </Field>
        <Field label="University email" htmlFor="s-email" error={errors.email?.message}>
          <Input id="s-email" type="email" autoComplete="email" placeholder="you@novasbe.pt" aria-invalid={!!errors.email} {...form.register("email")} />
        </Field>
        {mode === "supabase" && (
          <Field label="Password" htmlFor="s-pass" error={errors.password?.message}>
            <Input id="s-pass" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
          </Field>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Get started
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
