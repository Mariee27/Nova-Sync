"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarPlus,
  CalendarRange,
  CheckCheck,
  FolderPlus,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  SquarePen,
  UserRound,
} from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Hint } from "@/components/ui/tooltip";
import { LogoMark } from "@/components/shared/logo";
import { timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";

function Notifications() {
  const { ws, me, run } = useReadyWorkspace();
  const [open, setOpen] = React.useState(false);
  const mine = ws.notifications.filter((n) => n.userId === me.id).slice(0, 12);
  const unread = mine.filter((n) => !n.read).length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Hint label="Notifications">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative">
            <Bell className="size-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-background">
                {unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => run({ type: "notification.readAll" })}
              className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-1.5">
          {mine.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          {mine.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              onClick={() => {
                setOpen(false);
                if (!n.read) void run({ type: "notification.read", id: n.id }, { silent: true });
              }}
              className="flex gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-secondary"
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
              <div className="min-w-0">
                <p className={cn("text-[13px] leading-snug", !n.read && "font-medium")}>{n.title}</p>
                <p className="truncate text-[12px] text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">{timeAgo(n.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NewMenu({ className }: { className?: string }) {
  const ui = useUI();
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={className}>
          <Plus /> <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => ui.open({ kind: "task" })}>
          <SquarePen /> Task
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/meetings/new")}>
          <CalendarRange /> Meeting poll
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => ui.open({ kind: "event" })}>
          <CalendarPlus /> Calendar event
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => ui.open({ kind: "project" })}>
          <FolderPlus /> Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu() {
  const { me, signOut, mode } = useReadyWorkspace();
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40" aria-label="Account menu">
          <Avatar person={me} size="md" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar person={me} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="truncate text-[12px] text-muted-foreground">{me.email}</p>
          </div>
        </div>
        {mode === "demo" && <DropdownMenuLabel className="normal-case tracking-normal">Demo account · this browser only</DropdownMenuLabel>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <UserRound /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings#preferences")}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const ui = useUI();
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-sidebar-border bg-background/80 px-3 backdrop-blur-xl sm:px-5 lg:h-16">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
        <Menu className="size-5" />
      </Button>
      <Link href="/dashboard" className="lg:hidden" aria-label="Dashboard">
        <LogoMark className="size-7" />
      </Link>

      <button
        type="button"
        onClick={() => ui.open({ kind: "command" })}
        className="ml-1 hidden h-9 w-full max-w-sm cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-[13px] text-muted-foreground shadow-soft transition hover:border-foreground/20 sm:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded border bg-secondary px-1.5 font-mono text-[10.5px]">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Search" onClick={() => ui.open({ kind: "command" })}>
          <Search className="size-[18px]" />
        </Button>
        <Notifications />
        <NewMenu className="mx-1" />
        <UserMenu />
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
