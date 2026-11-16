"use client";

import * as React from "react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { generateInsights } from "@/lib/intelligence/engine";
import type { Profile, Project } from "@/lib/types";

/** Memoised lookups over the current snapshot. */
export function useLookups() {
  const { ws } = useReadyWorkspace();
  return React.useMemo(() => {
    const people = new Map<string, Profile>(ws.profiles.map((p) => [p.id, p]));
    const projects = new Map<string, Project>(ws.projects.map((p) => [p.id, p]));
    return { people, projects };
  }, [ws]);
}

export function useInsights() {
  const { ws, me } = useReadyWorkspace();
  // Recompute when data changes; "now" is read at that moment.
  return React.useMemo(() => generateInsights(ws, me.id, new Date()), [ws, me.id]);
}

/** A `now` that ticks every minute so relative labels stay fresh. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const PREF_EVENT = "nova-sync:pref";

/**
 * A small per-device preference stored in localStorage. Server render and
 * first client render use `fallback`, then the stored value, without a
 * hydration mismatch. Updates propagate to every hook using the same key.
 */
export function useLocalPref<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const subscribe = React.useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(PREF_EVENT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(PREF_EVENT, cb);
    };
  }, []);
  const read = () => {
    try {
      const v = localStorage.getItem(key);
      return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const value = React.useSyncExternalStore(subscribe, read, () => fallback);
  const set = React.useCallback(
    (v: T) => {
      try {
        localStorage.setItem(key, v);
      } catch {
        /* storage unavailable: preference lasts for this page view only */
      }
      window.dispatchEvent(new Event(PREF_EVENT));
    },
    [key],
  );
  return [value, set] as const;
}
