import Link from "next/link";
import { cn } from "@/lib/utils";

/** The NOVA SYNC mark: two interlocking orbits forming a stylised "sync". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <defs>
        <linearGradient id="ns-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#101828" />
      <circle cx="12.5" cy="16" r="6.2" fill="none" stroke="url(#ns-g)" strokeWidth="2.6" />
      <circle cx="19.5" cy="16" r="6.2" fill="none" stroke="#fff" strokeOpacity=".92" strokeWidth="2.6" />
      <circle cx="16" cy="16" r="1.7" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40", className)}
      aria-label="NOVA SYNC home"
    >
      <LogoMark className="transition-transform duration-300 group-hover:rotate-[-8deg]" />
      <span className="text-[15px] font-semibold tracking-[0.08em]">
        NOVA<span className="text-muted-foreground font-medium"> SYNC</span>
      </span>
    </Link>
  );
}
