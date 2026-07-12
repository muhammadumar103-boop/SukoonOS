"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-emerald-100 bg-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-emerald-100 px-6">
        <div className="grid size-11 place-items-center rounded-lg bg-emerald-700 text-white shadow-sm shadow-emerald-900/25">
          <HeartHandshake className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight text-slate-950">SukoonOS</p>
          <p className="text-xs font-medium text-emerald-700">Charity operations</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-5">
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                active
                  ? "bg-emerald-700 text-white shadow-sm shadow-emerald-900/20"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-950">July giving goal</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">78% funded toward the monthly relief target.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full w-[78%] rounded-full bg-emerald-700" />
        </div>
      </div>
    </aside>
  );
}
