"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { AuthenticatedUser } from "@/server/auth/session";

type TopbarProps = {
  user: AuthenticatedUser;
};

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname();
  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button className="grid size-10 place-items-center rounded-md border border-emerald-100 text-slate-600 lg:hidden">
          <Menu className="size-5" aria-hidden="true" />
          <span className="sr-only">Open navigation</span>
        </button>
        <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-slate-500 md:flex">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate text-sm">Search donors, projects, reports...</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button className="grid size-10 place-items-center rounded-md border border-emerald-100 text-slate-600 transition hover:bg-emerald-50">
            <Bell className="size-4" aria-hidden="true" />
            <span className="sr-only">Notifications</span>
          </button>
          <div className="hidden items-center gap-3 rounded-lg border border-emerald-100 bg-white px-3 py-2 shadow-sm shadow-emerald-950/5 sm:flex">
            <div className="grid size-9 place-items-center rounded-md bg-emerald-700 text-sm font-semibold text-white">{initials}</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-950">{user.fullName}</p>
              <p className="text-xs text-slate-500">{user.title ?? user.role}</p>
            </div>
            <ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
          </div>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-medium",
                active ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800",
              )}
            >
              <item.icon className="size-3.5" aria-hidden="true" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
