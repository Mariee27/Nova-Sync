import { FlaskConical } from "lucide-react";

export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-[12.5px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
