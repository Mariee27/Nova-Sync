"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, CalendarDays, CalendarRange, CheckSquare, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive } from "./sidebar";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/meetings", label: "Meet", icon: CalendarRange },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/intelligence", label: "Insights", icon: BrainCircuit },
];

/** Bottom tab bar: the mobile app's primary navigation. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-background/90 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href) || (href === "/dashboard" && pathname.startsWith("/projects"));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/10")}>
                <Icon className="size-[19px]" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
