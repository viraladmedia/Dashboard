// File: components/dashboard/TopBar.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, Search, Settings, User } from "lucide-react";
import { useAccount } from "@/components/dashboard/AccountContext";

export function TopBar({
  query, setQuery, title, subtitle,
  showAccountInTitle = true, showAccountIdInSubtitle = true,
}: {
  query: string;
  setQuery: (v: string) => void;
  title?: string;
  subtitle?: string;
  showAccountInTitle?: boolean;
  showAccountIdInSubtitle?: boolean;
}) {
  const { accountId, accountLabel } = useAccount();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const computedTitle = showAccountInTitle
    ? (mounted ? (accountLabel || "All Accounts") : "All Accounts")
    : (title ?? "Welcome back 👋");

  const computedSubtitle = showAccountIdInSubtitle
    ? (mounted ? (accountId === "all" ? "All Accounts" : `Account ID: ${accountId}`) : "All Accounts")
    : (subtitle ?? "Dashboard");

  return (
    <div className="sticky top-0 z-20 -mx-2 sm:mx-0 bg-white/70 backdrop-blur border-b border-white/60">
      <div className="px-2 sm:px-0 py-3 flex items-center gap-3">
        {/* Left: Title / Subtitle */}
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest/relaxed text-slate-500">
            <span suppressHydrationWarning>{computedSubtitle}</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-800 truncate">
            <span suppressHydrationWarning>{computedTitle}</span>
          </h1>
        </div>

        {/* Center: Search */}
        <div className="flex-1 min-w-[180px] max-w-[640px] ml-auto">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product, campaign, ad set, ad, or account…"
              className="pl-8"
            />
          </div>
        </div>

        {/* Right: Live + Profile */}
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-400/40">Live</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-2.5 py-1.5")}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src="/avatar.png" alt="Profile" />
                  <AvatarFallback>VA</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <a href="/dashboard/overview" className="flex items-center gap-2"><User className="h-4 w-4" /> Profile</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dashboard/settings" className="flex items-center gap-2"><Settings className="h-4 w-4" /> Account Settings</a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Hook up auth sign-out")} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
