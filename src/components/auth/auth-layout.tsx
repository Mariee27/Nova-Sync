import Link from "next/link";
import { ArrowLeft, CalendarCheck, Sparkles, Users } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-[12px] text-muted-foreground">NOVA SYNC — Better Together</p>
      </div>
      <div className="relative hidden overflow-hidden bg-navy p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid absolute inset-0 opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden />
        <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-[#2563EB] opacity-30 blur-[120px]" aria-hidden />
        <div className="absolute -bottom-40 -left-20 size-[420px] rounded-full bg-[#8B5CF6] opacity-30 blur-[120px]" aria-hidden />
        <div className="relative">
          <p className="text-[12px] font-semibold tracking-[0.2em] text-white/60 uppercase">For NOVA students</p>
          <h2 className="mt-4 max-w-md text-4xl leading-[1.1] font-semibold tracking-tight">
            Group projects.
            <br />
            <span className="bg-gradient-to-r from-[#93C5FD] to-[#C4B5FD] bg-clip-text text-transparent">Finally in sync.</span>
          </h2>
        </div>
        <div className="relative grid max-w-md gap-3">
          {[
            { icon: CalendarCheck, t: "Find a time in seconds", d: "Everyone paints their availability. NOVA SYNC finds the overlap." },
            { icon: Users, t: "Fair, visible ownership", d: "See who's doing what without turning it into a leaderboard." },
            { icon: Sparkles, t: "Sync Intelligence", d: "Rule-based insights flag risks before the deadline does." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <Icon className="mt-0.5 size-5 shrink-0 text-[#93C5FD]" />
              <div>
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-0.5 text-[13px] text-white/65">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
