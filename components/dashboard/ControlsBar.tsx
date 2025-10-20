// File: components/dashboard/ControlsBar.tsx
"use client";

import * as React from "react";
import { useAccount } from "@/components/dashboard/AccountContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, RefreshCcw, Upload, Download, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/** Shared types */
export type Preset =
  | "last_24h" | "last_48h" | "last_7d" | "last_30d" | "last_60d" | "last_90d" | "custom";
export type Level = "ad" | "adset" | "campaign";
export type Channel = "all" | "meta" | "tiktok" | "google";

/** Minimal thresholds (trimmed): only the two that actually filter */
type Thresholds = {
  minSpend: number; setMinSpend: (v: number) => void;
  minClicks: number; setMinClicks: (v: number) => void;
};

type Account = { key: string; label: string };
const normalizeAccount = (a: any): Account | null => {
  if (!a) return null;
  const key = a.key ?? a.id ?? a.account_id ?? a.accountId ?? a.account ?? a.pk ?? a.uid ?? "";
  const label = a.label ?? a.name ?? a.account_name ?? a.displayName ?? a.title ?? a.accountName ?? "";
  if (!key) return null;
  return { key: String(key), label: String(label || key) };
};

export function ControlsBar({
  thresholds,
  selectedPreset, onPresetChange,
  from, to, setFrom, setTo,
  onSync, syncing,
  onExportClick, onImportClick,
  level, onLevelChange,
  channel, onChannelChange,
  /** simple visibility flags so this can be reused across pages */
  showAccount = true,
  showLevel = true,
  showChannel = true,
  showThresholds = true,
  showImportExport = true,
  allowCustomRange = true,
}: {
  thresholds: Thresholds;
  selectedPreset: Preset;
  onPresetChange: (p: Preset) => void;
  from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void;
  onSync: () => void; syncing: boolean;
  onExportClick?: () => void; onImportClick?: () => void;
  level: Level; onLevelChange: (l: Level) => void;
  channel: Channel; onChannelChange: (c: Channel) => void;
  showAccount?: boolean;
  showLevel?: boolean;
  showChannel?: boolean;
  showThresholds?: boolean;
  showImportExport?: boolean;
  allowCustomRange?: boolean;
}) {
  const { accountId, accountLabel, setAccount } = useAccount();

  // Accounts for the selector (lives in ControlsBar now)
  const [accounts, setAccounts] = React.useState<Account[]>([{ key: "all", label: "All Accounts" }]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/import/merge?accounts=1", { cache: "no-store" });
        if (!res.ok) throw new Error("accounts fetch failed");
        const json = await res.json();
        const raw = Array.isArray(json) ? json : Array.isArray(json?.accounts) ? json.accounts : [];
        const normalized = raw.map(normalizeAccount).filter(Boolean) as Account[];
        const map = new Map<string, Account>();
        normalized.forEach(a => { if (!map.has(a.key)) map.set(a.key, a); });
        setAccounts([{ key: "all", label: "All Accounts" }, ...Array.from(map.values())]);

        // Refresh context label if needed
        const match = normalized.find(a => a.key === accountId);
        if (match && match.label && match.label !== accountLabel) {
          setAccount(match.key, match.label);
        }
      } catch {
        // keep default
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeAccount = (val: string) => {
    const lbl = accounts.find(a => a.key === val)?.label || (val === "all" ? "All Accounts" : val);
    setAccount(val, lbl);
  };

  return (
    <div className="mb-3 rounded-xl border bg-white/90 p-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Account */}
        {showAccount && (
          <Select value={accountId} onValueChange={onChangeAccount}>
            <SelectTrigger className="h-9 w-[210px]">
              <SelectValue placeholder="All Accounts">
                <span suppressHydrationWarning>{mounted ? accountLabel : "All Accounts"}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.key} value={a.key}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Level */}
        {showLevel && (
          <Select value={level} onValueChange={(v: Level) => onLevelChange(v)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ad">Ad</SelectItem>
              <SelectItem value="adset">Ad Set</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Channel */}
        {showChannel && (
          <Select value={channel} onValueChange={(v: Channel) => onChannelChange(v)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="meta">Facebook</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Preset */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{labelForPreset(selectedPreset)}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {([
              ["last_24h", "Last 24 hours"],
              ["last_48h", "Last 48 hours"],
              ["last_7d", "Last 7 days"],
              ["last_30d", "Last 30 days"],
              ["last_60d", "Last 60 days"],
              ["last_90d", "Last 90 days"],
              ["custom", "Custom…"],
            ] as [Preset, string][])
              .map(([val, label]) => (
                <DropdownMenuItem key={val} onClick={() => onPresetChange(val)}>
                  {label}
                </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Custom range */}
        {allowCustomRange && selectedPreset === "custom" && (
          <div className="flex items-center gap-1">
            <Input type="date" className="h-9" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-slate-500 text-sm">to</span>
            <Input type="date" className="h-9" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}

        {/* Sync */}
        <Button size="sm" onClick={onSync} disabled={syncing} className="ml-auto">
          <RefreshCcw className={cn("h-4 w-4", syncing ? "animate-spin" : "")} />
          <span className="sr-only">Sync</span>
        </Button>

        {/* Import / Export (icon buttons only, optional) */}
        {showImportExport && onImportClick && (
          <Button size="sm" variant="outline" onClick={onImportClick} aria-label="Import">
            <Upload className="h-4 w-4" />
          </Button>
        )}
        {showImportExport && onExportClick && (
          <Button size="sm" variant="outline" onClick={onExportClick} aria-label="Export">
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Minimal thresholds */}
      {showThresholds && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <NumberField value={thresholds.minSpend} onChange={thresholds.setMinSpend} placeholder="Min Spend" />
          <NumberField value={thresholds.minClicks} onChange={thresholds.setMinClicks} placeholder="Min Clicks" />
        </div>
      )}
    </div>
  );
}

function NumberField({
  value, onChange, placeholder,
}: { value: number; onChange: (v: number) => void; placeholder: string }) {
  return (
    <Input
      inputMode="decimal"
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => {
        const v = parseFloat(e.target.value || "0");
        onChange(Number.isFinite(v) ? v : 0);
      }}
      placeholder={placeholder}
      className="h-9"
    />
  );
}

function labelForPreset(p: Preset) {
  switch (p) {
    case "last_24h": return "Last 24 hours";
    case "last_48h": return "Last 48 hours";
    case "last_7d":  return "Last 7 days";
    case "last_30d": return "Last 30 days";
    case "last_60d": return "Last 60 days";
    case "last_90d": return "Last 90 days";
    case "custom":   return "Custom range";
  }
}
