"use client";

import * as React from "react";

type DialogState =
  | { kind: "none" }
  | { kind: "project" }
  | { kind: "task"; projectId?: string; status?: import("@/lib/types").TaskStatus }
  | { kind: "event"; date?: string; eventId?: string }
  | { kind: "command" };

interface UIContextValue {
  dialog: DialogState;
  open: (d: DialogState) => void;
  close: () => void;
}

const UIContext = React.createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = React.useState<DialogState>({ kind: "none" });
  const value = React.useMemo<UIContextValue>(
    () => ({ dialog, open: setDialog, close: () => setDialog({ kind: "none" }) }),
    [dialog],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = React.useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}
