import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  tone = "blue",
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href: string;
  tone?: "blue" | "violet" | "emerald" | "amber";
  children?: React.ReactNode;
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600",
    violet: "bg-violet-500/10 text-violet-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/12 text-amber-600",
  };
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col rounded-2xl border bg-card p-4 shadow-soft transition-all outline-none hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring/40 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-4" />
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-end justify-between gap-2">
        <p className="text-[26px] leading-none font-semibold tracking-tight tabular-nums">{value}</p>
        {children}
      </div>
      {sub && <p className="mt-2 truncate text-[12px] text-muted-foreground">{sub}</p>}
    </Link>
  );
}
