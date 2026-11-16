"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Field } from "@/components/app/dialogs/form-field";
import { getDataSource } from "@/lib/data";
import { DemoNotice } from "./demo-notice";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string(),
});

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginForm() {
  const { signIn, signInAsDemo, mode, status } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [demoBusy, setDemoBusy] = React.useState(false);
  const [accounts, setAccounts] = React.useState<{ id: string; name: string; email: string; color: string }[]>([]);

  React.useEffect(() => {
    if (status === "ready") router.replace(next);
  }, [status, router, next]);

  React.useEffect(() => {
    const src = getDataSource();
    src.listLocalAccounts?.().then((a) => setAccounts(a.slice(0, 4)));
  }, []);

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const onSubmit = form.handleSubmit(async (v) => {
    const ok = await signIn(v.email, v.password);
    if (ok) router.replace(next);
  });
  const { errors, isSubmitting } = form.formState;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Log in to pick up where your team left off.</p>

      {mode === "demo" && (
        <div className="mt-6 space-y-3">
          <Button
            variant="brand"
            size="lg"
            className="w-full"
            disabled={demoBusy}
            onClick={async () => {
              setDemoBusy(true);
              const ok = await signInAsDemo();
              setDemoBusy(false);
              if (ok) router.replace(next);
            }}
          >
            {demoBusy ? <Loader2 className="animate-spin" /> : null}
            Explore the demo as Alex Costa <ArrowRight />
          </Button>
          <DemoNotice>
            <strong>Demo mode.</strong> There is no backend connected, so no password is needed and nothing leaves this
            browser. This is not real authentication.
          </DemoNotice>
          <div className="flex items-center gap-3 py-1 text-[12px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or log in to a local demo account <span className="h-px flex-1 bg-border" />
          </div>
          {accounts.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => form.setValue("email", a.email)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-[12px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <Avatar person={a} size="xs" /> {a.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-5 grid gap-4" noValidate>
        <Field label="Email" htmlFor="l-email" error={errors.email?.message}>
          <Input id="l-email" type="email" autoComplete="email" placeholder="you@novasbe.pt" aria-invalid={!!errors.email} {...form.register("email")} />
        </Field>
        {mode === "supabase" && (
          <Field label="Password" htmlFor="l-pass">
            <Input id="l-pass" type="password" autoComplete="current-password" {...form.register("password")} />
          </Field>
        )}
        <Button type="submit" size="lg" variant={mode === "demo" ? "outline" : "default"} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        New to NOVA SYNC?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
