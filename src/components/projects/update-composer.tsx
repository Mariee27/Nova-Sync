"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function UpdateComposer({ projectId }: { projectId: string }) {
  const { me, run } = useReadyWorkspace();
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const r = await run({ type: "update.post", projectId, body }, { success: "Update posted to the team" });
    setBusy(false);
    if (r) setBody("");
  };
  return (
    <div className="flex gap-3">
      <Avatar person={me} size="md" className="mt-0.5" />
      <div className="flex-1">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share an update with the team… (⌘↵ to post)"
          rows={2}
          maxLength={1000}
          aria-label="Project update"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground tabular-nums">{body.length}/1000</span>
          <Button size="sm" onClick={submit} disabled={!body.trim() || busy}>
            <Send /> Post update
          </Button>
        </div>
      </div>
    </div>
  );
}
