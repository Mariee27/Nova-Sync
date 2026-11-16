/**
 * The data-source contract. The UI talks only to this interface.
 *
 *  - `DemoDataSource` (./demo) keeps the workspace in localStorage.
 *  - `SupabaseDataSource` (./supabase) reads/writes Postgres through
 *    Supabase with Row Level Security, and listens to Realtime.
 *
 * `getDataSource()` picks Supabase only when both public env vars are set.
 */
import type { ID, Profile, WorkspaceSnapshot } from "@/lib/types";
import type { Command, CommandResult } from "./commands";

export type DataMode = "demo" | "supabase";

export interface Session {
  userId: ID;
  email: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password?: string;
}

export interface SignInInput {
  email: string;
  password?: string;
}

export interface DataSource {
  readonly mode: DataMode;
  /** Current session, or null when signed out. */
  getSession(): Promise<Session | null>;
  signIn(input: SignInInput): Promise<Session>;
  signUp(input: SignUpInput): Promise<Session>;
  /** Demo only: enter as the seeded student. */
  signInAsDemo?(): Promise<Session>;
  signOut(): Promise<void>;
  /** Load everything the signed-in user is allowed to see. */
  load(session: Session): Promise<WorkspaceSnapshot>;
  /** Run a command. Resolves with the new snapshot or rejects with a CommandError. */
  execute(session: Session, command: Command): Promise<CommandResult>;
  /** Called with a fresh snapshot when data changes elsewhere (other tab / Realtime). */
  subscribe(session: Session, listener: (ws: WorkspaceSnapshot) => void): () => void;
  /** Demo only: restore the seeded workspace. */
  reset?(): Promise<WorkspaceSnapshot>;
  /** Demo only: profiles of seeded/local accounts to pick from on the login screen. */
  listLocalAccounts?(): Promise<Pick<Profile, "id" | "name" | "email" | "color">[]>;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
