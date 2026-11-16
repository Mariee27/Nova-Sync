/**
 * Demo data source: the whole workspace lives in this browser's localStorage.
 *
 * Honest limitations (also surfaced in the UI):
 *  - No passwords and no real authentication. Accounts exist only in this browser.
 *  - Tabs of the same browser stay in sync via the `storage` event;
 *    separate browsers or devices are NOT connected.
 */
import { dayKey } from "@/lib/dates";
import type { WorkspaceSnapshot } from "@/lib/types";
import { uid } from "@/lib/utils";
import { applyCommand, CommandError, type Command, type CommandResult } from "../commands";
import { createDemoWorkspace, DEMO_USER_ID } from "../seed";
import type { DataSource, Session, SignInInput, SignUpInput } from "../source";

const KEY = "nova-sync:workspace:v1";
const SESSION_KEY = "nova-sync:session:v1";
const VERSION = 1;

interface Stored {
  version: number;
  seedDay: string;
  /** True once the user has changed anything since the last seed/reset. */
  dirty: boolean;
  data: WorkspaceSnapshot;
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readStored(): Stored | null {
  const raw = storage()?.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.version !== VERSION || !parsed.data?.profiles) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(stored: Stored) {
  try {
    storage()?.setItem(KEY, JSON.stringify(stored));
  } catch {
    throw new CommandError("Couldn't save to this browser's storage (is it full or disabled?)");
  }
}

function freshSeed(): Stored {
  const stored = { version: VERSION, seedDay: dayKey(new Date()), dirty: false, data: createDemoWorkspace() };
  write(stored);
  return stored;
}

/**
 * Returns the stored workspace, re-seeding when there is none, when it is
 * corrupt, or when it is an untouched seed from a previous day (so relative
 * dates like "due in 3 days" stay true on demo day).
 */
function ensure(): Stored {
  const s = readStored();
  if (!s) return freshSeed();
  if (!s.dirty && s.seedDay !== dayKey(new Date())) return freshSeed();
  return s;
}

export function demoSeedInfo(): { seedDay: string; dirty: boolean } | null {
  const s = readStored();
  return s ? { seedDay: s.seedDay, dirty: s.dirty } : null;
}

export class DemoDataSource implements DataSource {
  readonly mode = "demo" as const;

  async getSession(): Promise<Session | null> {
    const raw = storage()?.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw) as Session;
      const ws = ensure().data;
      return ws.profiles.some((p) => p.id === s.userId) ? s : null;
    } catch {
      return null;
    }
  }

  private setSession(s: Session) {
    storage()?.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  async signInAsDemo(): Promise<Session> {
    const ws = ensure().data;
    const alex = ws.profiles.find((p) => p.id === DEMO_USER_ID);
    if (!alex) {
      const reseeded = freshSeed().data.profiles.find((p) => p.id === DEMO_USER_ID)!;
      return this.setSession({ userId: reseeded.id, email: reseeded.email });
    }
    return this.setSession({ userId: alex.id, email: alex.email });
  }

  async signIn({ email }: SignInInput): Promise<Session> {
    const ws = ensure().data;
    const p = ws.profiles.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p) throw new CommandError("No demo account with that email in this browser. Create one or use the demo student.");
    return this.setSession({ userId: p.id, email: p.email });
  }

  async signUp({ name, email }: SignUpInput): Promise<Session> {
    const stored = ensure();
    const clean = email.trim().toLowerCase();
    if (stored.data.profiles.some((p) => p.email.toLowerCase() === clean))
      throw new CommandError("An account with that email already exists here. Log in instead.");
    const id = uid("usr");
    const now = new Date().toISOString();
    stored.data = {
      ...stored.data,
      profiles: [
        ...stored.data.profiles,
        {
          id,
          name: name.trim(),
          email: clean,
          color: "#2563EB",
          degree: "",
          university: "NOVA University Lisbon",
          interests: [],
          bio: "",
          workStartHour: 9,
          workEndHour: 18,
          onboarded: false,
          createdAt: now,
        },
      ],
    };
    stored.dirty = true;
    write(stored);
    return this.setSession({ userId: id, email: clean });
  }

  async signOut(): Promise<void> {
    storage()?.removeItem(SESSION_KEY);
  }

  async load(): Promise<WorkspaceSnapshot> {
    return ensure().data;
  }

  async execute(session: Session, command: Command): Promise<CommandResult> {
    const stored = ensure();
    const result = applyCommand(stored.data, session.userId, command, new Date(), { allowProxyAvailability: true });
    write({ ...stored, dirty: true, data: result.ws });
    return result;
  }

  subscribe(_session: Session, listener: (ws: WorkspaceSnapshot) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      const s = readStored();
      if (s) listener(s.data);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }

  async reset(): Promise<WorkspaceSnapshot> {
    return freshSeed().data;
  }

  async listLocalAccounts() {
    return ensure()
      .data.profiles.filter((p) => p.onboarded || p.id === DEMO_USER_ID)
      .map(({ id, name, email, color }) => ({ id, name, email, color }));
  }
}
