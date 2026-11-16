"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { LogoMark } from "@/components/shared/logo";

/** One-click entry into the demo workspace (used by "Explore Demo"). */
export default function DemoEntry() {
  const { signInAsDemo, mode, status, session } = useWorkspace();
  const router = useRouter();
  const started = React.useRef(false);

  React.useEffect(() => {
    if (status === "loading" || started.current) return;
    started.current = true;
    if (mode !== "demo") {
      router.replace("/login");
      return;
    }
    if (status === "ready" && session?.userId === "u_alex") {
      router.replace("/dashboard");
      return;
    }
    void signInAsDemo().then((ok) => router.replace(ok ? "/dashboard" : "/login"));
  }, [status, mode, session, signInAsDemo, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LogoMark className="size-10 animate-pulse" />
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Preparing the demo workspace…
      </p>
    </div>
  );
}
