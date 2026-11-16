"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface SeriesPoint {
  label: string;
  day: string;
  completed: number;
  mine: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const team = payload.find((p) => p.dataKey === "completed")?.value ?? 0;
  const mine = payload.find((p) => p.dataKey === "mine")?.value ?? 0;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-[12px] shadow-lift">
      <p className="mb-1 font-semibold">{label}</p>
      <p className="flex items-center gap-2 text-muted-foreground">
        <span className="size-2 rounded-full bg-[#2563EB]" /> Team: <span className="font-medium text-foreground">{team}</span>
      </p>
      <p className="flex items-center gap-2 text-muted-foreground">
        <span className="size-2 rounded-full bg-[#8B5CF6]" /> You: <span className="font-medium text-foreground">{mine}</span>
      </p>
    </div>
  );
}

export function ProductivityChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-full min-h-44 w-full" role="img" aria-label={`Tasks completed per day: ${data.map((d) => `${d.label} ${d.completed}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="g-team" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-mine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Area type="monotone" dataKey="completed" stroke="#2563EB" strokeWidth={2} fill="url(#g-team)" animationDuration={900} />
          <Area type="monotone" dataKey="mine" stroke="#8B5CF6" strokeWidth={2} fill="url(#g-mine)" animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
