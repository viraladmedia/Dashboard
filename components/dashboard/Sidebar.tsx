// File: components/dashboard/Sidebar.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Settings, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("vam.sidebar.collapsed") === "1"; } catch { return false; }
  });
  React.useEffect(() => {
    try { localStorage.setItem("vam.sidebar.collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  const nav = [
    { href: "/dashboard",    label: "Overview",    icon: LayoutDashboard },
    { href: "/dashboard/performance", label: "Performance", icon: LineChart },
    { href: "/dashboard/attendance",  label: "Attendance",  icon: GraduationCap },
    { href: "/dashboard/settings",    label: "Settings",    icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "h-full border-r bg-white/90 backdrop-blur px-2 py-3 transition-all",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      <div className={cn("flex items-center justify-between", collapsed ? "px-0" : "px-1")}>
        <Link href="/dashboard/overview" className="block select-none" title="VIRAL AD MEDIA">
          <div
            className={cn(
              "font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent",
              collapsed ? "text-sm" : "text-base sm:text-lg"
            )}
          >
            VIRAL AD MEDIA
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className={cn("ml-2 inline-flex items-center justify-center rounded-md border px-1.5 py-1 text-slate-600 hover:bg-slate-50","w-8 h-8")}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className={cn("mt-3", collapsed ? "px-0" : "px-1")}>
        <ul className="space-y-0.5">
          {nav.map((n) => {
            const active = pathname === n.href;
            const Icon = n.icon;
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition",
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  )}
                  title={n.label}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-500")} />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("mt-auto pt-3 text-[11px] text-slate-500", collapsed ? "px-0 text-center" : "px-1")}>
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span>v1.0</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700">Live</span>
          </div>
        ) : (
          <span title="Live v1.0">v1.0</span>
        )}
      </div>
    </aside>
  );
}
