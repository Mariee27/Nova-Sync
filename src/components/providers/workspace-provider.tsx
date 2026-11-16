"use client";

import * as React from "react";
import { toast } from "sonner";
import { getDataSource, type DataMode, type Session } from "@/lib/data";
import { CommandError, type Command, type CommandResult } from "@/lib/data/commands";
import type { Profile, WorkspaceSnapshot } from "@/lib/types";

type Status = "loading" | "signed_out" | "ready" | "error";

interface RunOptions {
  /** Toast shown on success. */
  success?: string;
  /** Suppress the automatic error toast. */
  silent?: boolean;
}

interface WorkspaceContextValue {
  status: Status;
  mode: DataMode;
  error: string | null;
  session: Session | null;
  ws: WorkspaceSnapshot | null;
  me: Profile | null;
  run: (cmd: Command, opts?: RunOptions) => Promise<CommandResult | null>;
  signIn: (email: string, password?: string) => Promise<boolean>;
  signUp: (name: string, email: string, password?: string) => Promise<boolean>;
  signInAsDemo: () => Promise<boolean>;
  signOut: () => Promise<void>;
  resetDemo: () => Promise<void>;
  retry: () => void;
  /** Project that just reached 100% (drives the celebration overlay). */
  celebrating: string | null;
  clearCelebration: () => void;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

function messageOf(e: unknown): string {
  if (e instanceof CommandError) return e.message;
  if (e instanceof Error) return e.message || "Something went wrong";
  return "Something went wrong";
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const source = React.useMemo(() => getDataSource(), []);
  const [status, setStatus] = React.useState<Status>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [ws, setWs] = React.useState<WorkspaceSnapshot | null>(null);
  const [celebrating, setCelebrating] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const enter = React.useCallback(
    async (s: Session) => {
      const data = await source.load(s);
      setSession(s);
      setWs(data);
      setStatus("ready");
    },
    [source],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await source.getSession();
        if (cancelled) return;
        if (!s) {
          setStatus("signed_out");
          return;
        }
        await enter(s);
      } catch (e) {
        if (cancelled) return;
        setError(messageOf(e));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, enter, attempt]);

  React.useEffect(() => {
    if (!session) return;
    return source.subscribe(session, (next) => setWs(next));
  }, [source, session]);

  const run = React.useCallback<WorkspaceContextValue["run"]>(
    async (cmd, opts) => {
      if (!session) {
        toast.error("Your session ended. Please log in again.");
        return null;
      }
      try {
        const result = await source.execute(session, cmd);
        setWs(result.ws);
        if (result.completedProjectId) setCelebrating(result.completedProjectId);
        if (opts?.success) toast.success(opts.success);
        return result;
      } catch (e) {
        if (!opts?.silent) toast.error(messageOf(e));
        return null;
      }
    },
    [source, session],
  );

  const wrapAuth = React.useCallback(
    async (fn: () => Promise<Session>) => {
      try {
        const s = await fn();
        await enter(s);
        return true;
      } catch (e) {
        toast.error(messageOf(e));
        return false;
      }
    },
    [enter],
  );

  const value: WorkspaceContextValue = {
    status,
    mode: source.mode,
    error,
    session,
    ws,
    me: ws && session ? (ws.profiles.find((p) => p.id === session.userId) ?? null) : null,
    run,
    signIn: (email, password) => wrapAuth(() => source.signIn({ email, password })),
    signUp: (name, email, password) => wrapAuth(() => source.signUp({ name, email, password })),
    signInAsDemo: () =>
      wrapAuth(async () => {
        if (!source.signInAsDemo) throw new Error("Demo access is disabled when Supabase is configured.");
        return source.signInAsDemo();
      }),
    signOut: async () => {
      await source.signOut();
      setSession(null);
      setWs(null);
      setStatus("signed_out");
    },
    resetDemo: async () => {
      if (!source.reset) return;
      const data = await source.reset();
      setWs(data);
      // the reset seed always contains the demo student; keep the session if it still exists
      if (session && !data.profiles.some((p) => p.id === session.userId)) {
        const s = await source.signInAsDemo!();
        setSession(s);
      }
      toast.success("Demo restored", { description: "All data is back to the original demonstration state." });
    },
    retry: () => {
      setStatus("loading");
      setError(null);
      setAttempt((a) => a + 1);
    },
    celebrating,
    clearCelebration: () => setCelebrating(null),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

/** For components rendered only inside the authenticated shell. */
export function useReadyWorkspace() {
  const ctx = useWorkspace();
  if (!ctx.ws || !ctx.me) throw new Error("Workspace not ready");
  return { ...ctx, ws: ctx.ws, me: ctx.me };
}
