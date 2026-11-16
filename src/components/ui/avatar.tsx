import * as React from "react";
import { cn, initials } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";
const sizes: Record<Size, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-16 text-xl",
};

export interface AvatarPerson {
  name: string;
  color: string;
}

function Avatar({
  person,
  size = "md",
  className,
  ring = false,
}: {
  person: AvatarPerson;
  size?: Size;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={person.name}
      title={person.name}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        ring && "ring-2 ring-card",
        sizes[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(140deg, ${person.color}, color-mix(in oklab, ${person.color} 70%, #101828))`,
      }}
    >
      {initials(person.name)}
    </span>
  );
}

function AvatarStack({
  people,
  max = 4,
  size = "sm",
  className,
}: {
  people: AvatarPerson[];
  max?: number;
  size?: Size;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className={cn("flex items-center", size === "xs" ? "-space-x-1" : "-space-x-2", className)}>
      {shown.map((p) => (
        <Avatar key={p.name} person={p} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "bg-secondary text-muted-foreground relative inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-card",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

export { Avatar, AvatarStack };
