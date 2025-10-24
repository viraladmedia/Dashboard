/* eslint-disable @typescript-eslint/no-explicit-any */ 
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { useAccount } from "@/components/dashboard/AccountContext";
import { AcquisitionInsights } from "@/components/dashboard/insights/AcquisitionInsights";
import type { Row } from "@/app/types/dashboard";
import { aggregate, currency, fmt, groupBy } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Calendar, RefreshCcw, Upload, Download, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import {
  BarChart as RBarChart, Bar, CartesianGrid, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Legend, LineChart as RLineChart, Line,
} from "recharts";

/* ---------------- types & helpers ---------------- */

type Preset = "last_24h" | "last_48h" | "last_7d" | "last_30d" | "last_60d" | "last_90d" | "custom";
type Level  = "campaign" | "adset" | "ad";

const safePer = (num?: number, den?: number) =>
  !num || !den || den === 0 ? null : num / den;

type Normalizable = Partial<{
  ad_spend: number;
  spend: number;
  ad_spend_usd: number;
  revenue: number;
  impressions: number;
  clicks: number;
  leads: number;
  checkouts: number;
  purchases: number;
  roas: number; // note: no null in the type
}>;

const num = (v: unknown, d = 0) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (v == null) return d;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
};

function norm(row: Normalizable) {
  const spend = num(row.ad_spend ?? row.spend ?? row.ad_spend_usd, 0);
  const rev = num(row.revenue, 0);
  const imps = num(row.impressions, 0);
  const clicks = num(row.clicks, 0);
  const leads = num(row.leads, 0);
  const checkouts = num(row.checkouts, 0);
  const purchases = num(row.purchases, 0);

  // If we can compute ROAS, return a number; otherwise return undefined (NOT null)
  const roas: number | undefined =
    spend > 0 ? rev / spend : (typeof row.roas === "number" ? row.roas : undefined);

  return { spend, rev, imps, clicks, leads, checkouts, purchases, roas };
}


const getFromLS = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
};

const putToLS = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

function mostCommon(arr: (string | undefined | null)[]) {
  const counts = new Map<string, number>();
  for (const v of arr) {
    const k = (v || "").toString();
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let best = ""; let bestN = 0;
  counts.forEach((n, k) => { if (n > bestN) { bestN = n; best = k; } });
  return best || "";
}

const labelForPreset = (p: Preset) =>
  p === "last_24h" ? "Last 24 hours" :
  p === "last_48h" ? "Last 48 hours" :
  p === "last_7d"  ? "Last 7 days"  :
  p === "last_30d" ? "Last 30 days" :
  p === "last_60d" ? "Last 60 days" :
  p === "last_90d" ? "Last 90 days" : "Custom range";

type Account = { key: string; label: string };

function normalizeAccount(o: Record<string, unknown>): Account | null {
  const key = String(
    o["key"] ?? o["id"] ?? o["account_id"] ?? o["accountId"] ?? o["account"] ?? o["pk"] ?? o["uid"] ?? ""
  );
  const label = String(
    (o["label"] ?? o["name"] ?? o["account_name"] ?? o["displayName"] ?? o["title"] ?? o["accountName"] ?? "") || key
  );
  return key ? { key, label } : null;
}

/* ---------------- page ---------------- */

export default function PerformancePage() {
  const { accountId, accountLabel, setAccount } = useAccount();

  // Tabs/level
  const [tab, setTab] = React.useState<Level>(() => {
    const ls = getFromLS<Level>("vam.level", "ad");
    return (ls as Level) || "ad";
  });

  // thresholds (full set, persisted)
  type Thresholds = {
    roasKill: number; roasScale: number; cpaKill: number; cpaGood: number;
    minSpend: number; minClicks: number;
  };
  const [thresholds, setThresholds] = React.useState<Thresholds>(() => {
    return getFromLS<Thresholds>("vam.thresholds", {
      roasKill: 1, roasScale: 2.5, cpaKill: 80, cpaGood: 25, minSpend: 0, minClicks: 0,
    });
  });
  React.useEffect(() => putToLS("vam.thresholds", thresholds), [thresholds]);

  // date range (default: last_30d now)
  const [preset, setPreset] = React.useState<Preset>("last_30d");
  const [from, setFrom] = React.useState<string>(""); const [to, setTo] = React.useState<string>("");

  // ui/data
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  // accounts list for inline account selector
  const [accounts, setAccounts] = React.useState<Account[]>([{ key: "all", label: "All Accounts" }]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/import/merge?accounts=1", { cache: "no-store" });
        if (!res.ok) throw new Error("accounts fetch failed");
        const json = await res.json();
        const raw: Account[] = (Array.isArray(json) ? json : json?.accounts || [])
          .map((o: unknown) => normalizeAccount((o || {}) as Record<string, unknown>))
          .filter((x: Account | null): x is Account => !!x);
        const uniq = new Map<string, Account>();
        raw.forEach(a => { if (!uniq.has(a.key)) uniq.set(a.key, a); });
        setAccounts([{ key: "all", label: "All Accounts" }, ...Array.from(uniq.values())]);

        // keep context label fresh
        const match = raw.find(a => a.key === accountId);
        if (match && match.label && match.label !== accountLabel) {
          setAccount(match.key, match.label);
        }
      } catch {
        // ignore, keep default
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL overrides
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const dp = url.searchParams.get("date_preset") as Preset | null;
    const f = url.searchParams.get("from");
    const t = url.searchParams.get("to");
    if (dp) { setPreset(dp); setFrom(""); setTo(""); }
    if (f && t) { setPreset("custom"); setFrom(f); setTo(t); }
  }, []);

  /** fetch merged rows */
  const fetchRows = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("level", tab);
      params.set("include_dims", "1");
      if (accountId !== "all") params.set("account", accountId);
      if (preset === "custom" && from && to) {
        params.set("from", from); params.set("to", to);
      } else {
        params.set("date_preset", preset);
      }
      // ask API to include dimension enrichments if supported
      params.set("include_dims", "1");
      const res = await fetch(`/api/import/merge?${params.toString()}`);
      const data = (await res.json()) as Row[] | { error?: string };
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, tab, preset, from, to]);

  React.useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSync = React.useCallback(async () => { await fetchRows(); }, [fetchRows]);

  /* filters */
  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const { spend, clicks } = norm(r as unknown as Normalizable);
      if (spend < thresholds.minSpend) return false;
      if (clicks < thresholds.minClicks) return false;
      if (!q) return true;
      const hay = [
        r.product, r.campaign, r.adset, r.ad, r.channel, r.account_name,
        // dimensions if present
        (r as any).placement, (r as any).platform, (r as any).device, (r as any).country, (r as any).age,
      ].map(x => (x || "").toString().toLowerCase()).join(" ");
      return hay.includes(q);
    });
  }, [rows, thresholds.minSpend, thresholds.minClicks, query]);

  /* aggregates */
  const agg = React.useMemo(() => aggregate(filteredRows), [filteredRows]);
  const CPC  = safePer(agg.spend, agg.clicks);
  const CPL  = safePer(agg.spend, agg.leads);
  const CPA  = safePer(agg.spend, agg.purchases);
  const CPCB = safePer(agg.spend, agg.checkouts);

  /* decision badge (uses thresholds) */
  function decide(row: Normalizable) {
    const n = norm(row);
    // guardrails
    if (n.spend < thresholds.minSpend || (n.clicks ?? 0) < thresholds.minClicks) return { label: "Learn", tone: "muted" as const };
    const cpa = safePer(n.spend, n.purchases);
    const goodScale = (n.roas ?? 0) >= thresholds.roasScale && (cpa ?? Infinity) <= thresholds.cpaGood;
    if (goodScale) return { label: "Scale", tone: "green" as const };
    const shouldKill = (n.roas ?? Infinity) <= thresholds.roasKill || (cpa ?? 0) >= thresholds.cpaKill;
    if (shouldKill) return { label: "Kill", tone: "red" as const };
    return { label: "Optimize", tone: "amber" as const };
  }

  /* charts */
  const roasByDim = React.useMemo(() => {
    const keyGetter = (r: Row) =>
      tab === "ad" ? (r.ad || "(no ad)")
      : tab === "adset" ? (r.adset || "(no ad set)")
      : (r.campaign || "(no campaign)");
    const g = groupBy(filteredRows, keyGetter);
    return Array.from(g.entries()).map(([name, arr]) => {
      const a = aggregate(arr);
      const n = norm(a as unknown as Normalizable);
      return { name, roas: n.roas ?? 0, revenue: n.rev, spend: n.spend };
    }).sort((a, b) => (b.roas - a.roas) || (b.revenue - a.revenue)).slice(0, 12);
  }, [filteredRows, tab]);

  const dailyTrend = React.useMemo(() => {
    const g = groupBy(filteredRows, r => r.date);
    return Array.from(g.entries()).map(([date, arr]) => {
      const a = aggregate(arr);
      const n = norm(a as unknown as Normalizable);
      return { date, spend: n.spend, revenue: n.rev, clicks: n.clicks };
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filteredRows]);

  /* insights: which dims bring most leads & purchases */
  type DimKey = "placement" | "platform" | "device" | "country" | "age";
  const dimensionInsights = React.useMemo(() => {
    const dims: DimKey[] = ["placement", "platform", "device", "country", "age"];
    const results: Record<DimKey, { byLeads: { name: string; leads: number }[]; byPurch: { name: string; purchases: number }[] }> = {} as any;

    for (const d of dims) {
      // normalize accessor (support multiple possible source keys)
      const accessor = (r: Row): string => {
        const any = r as any;
        const v =
          (d === "placement" ? (any.placement ?? any.platform_position) :
          d === "platform"  ? (any.platform  ?? any.publisher_platform) :
          d === "device"    ? (any.device    ?? any.device_platform) :
          d === "country"   ? (any.country   ?? any.geo ?? any.geo_country) :
                              (any.age       ?? any.age_range));
        const s = (v ?? "").toString().trim();
        return s || "(unavailable)";
      };

      const g = groupBy(filteredRows, accessor);
      const items = Array.from(g.entries()).map(([name, arr]) => {
        const a = aggregate(arr);
        return { name, leads: a.leads ?? 0, purchases: a.purchases ?? 0 };
      });

      const byLeads = [...items].sort((x, y) => y.leads - x.leads).slice(0, 5);
      const byPurch = [...items].sort((x, y) => y.purchases - x.purchases).slice(0, 5);
      results[d] = { byLeads, byPurch };
    }
    return results;
  }, [filteredRows]);

  /* table rows for the active tab */
  const tableRows = React.useMemo(() => {
    const keyGetter = (r: Row) =>
      tab === "ad" ? (r.ad || "(no ad)")
      : tab === "adset" ? (r.adset || "(no ad set)")
      : (r.campaign || "(no campaign)");

    const g = groupBy(filteredRows, keyGetter);
    return Array.from(g.entries()).map(([entity, arr]) => {
      const a = aggregate(arr);
      const n = norm(a as unknown as Normalizable);
      const imps = a.impressions ?? 0;
      const dec = decide({ ...n, roas: n.roas ?? undefined }); // <-- ensure no `null`
      return {
        entity,
        product: mostCommon(arr.map(x => x.product)),
        channel: mostCommon(arr.map(x => x.channel)),
        account: mostCommon(arr.map(x => (x as any).account_name ?? (x as any).account ?? "")),

        spend: n.spend, rev: n.rev, roas: n.roas,
        imps, clicks: n.clicks, leads: n.leads, checkouts: n.checkouts, purchases: n.purchases,
        cpc: safePer(n.spend, n.clicks),
        cpl: safePer(n.spend, n.leads),
        cpa: safePer(n.spend, n.purchases),
        cpcb: safePer(n.spend, n.checkouts),
        ctr: imps ? (n.clicks / imps) : null,

        decision: dec,
      };
    }).sort((a, b) => b.rev - a.rev);
  }, [filteredRows, tab, thresholds]);

  /* ---------------- render ---------------- */

  return (
    <div className="w-full">
      <TopBar title="Performance" subtitle="Overview" />

      {/* Inline controls */}
      <div className="mb-3 rounded-xl border bg-white/90 p-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Account */}
          <AccountSelect
            currentId={accountId}
            currentLabel={accountLabel}
            accounts={accounts}
            onChange={(val, lbl) => setAccount(val, lbl)}
          />

          {/* Level tabs */}
          <div className="inline-flex rounded-lg border bg-white/80 p-1">
            {(["campaign","adset","ad"] as Level[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => { setTab(lvl); putToLS("vam.level", lvl); }}
                className={[
                  "px-3 py-1.5 rounded-md text-sm font-medium transition",
                  tab === lvl ? "bg-slate-900 text-white shadow" : "text-slate-700 hover:bg-slate-100"
                ].join(" ")}
              >
                {lvl === "campaign" ? "Campaign" : lvl === "adset" ? "Ad Set" : "Ad"}
              </button>
            ))}
          </div>

          {/* Preset dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{labelForPreset(preset)}</span>
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
                  <DropdownMenuItem
                    key={val}
                    onClick={() => { setPreset(val); if (val !== "custom") { setFrom(""); setTo(""); } }}
                  >
                    {label}
                  </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Custom range */}
          {preset === "custom" && (
            <div className="flex items-center gap-1">
              <Input type="date" className="h-9" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="text-slate-500 text-sm">to</span>
              <Input type="date" className="h-9" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          )}

          {/* Sync */}
          <Button size="sm" onClick={handleSync} disabled={loading} className="ml-auto">
            <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
            <span className="sr-only">Sync</span>
          </Button>

          {/* Import / Export (icon buttons only) */}
          <Button
            size="sm" variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("vam:open-import"))}
            aria-label="Import"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("vam:export-campaigns"))}
            aria-label="Export"
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Thresholds popover */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="inline-flex items-center gap-1">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Thresholds</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-2">
              <div className="text-xs font-semibold text-slate-600 px-1 pb-1">Decision thresholds</div>

              <Field label="ROAS — Kill at ≤" value={thresholds.roasKill} onChange={(v) => setThresholds(s => ({ ...s, roasKill: v }))} step="0.1" />
              <Field label="ROAS — Scale at ≥" value={thresholds.roasScale} onChange={(v) => setThresholds(s => ({ ...s, roasScale: v }))} step="0.1" />
              <Field label="CPA — Kill at ≥" value={thresholds.cpaKill} onChange={(v) => setThresholds(s => ({ ...s, cpaKill: v }))} />
              <Field label="CPA — Good at ≤" value={thresholds.cpaGood} onChange={(v) => setThresholds(s => ({ ...s, cpaGood: v }))} />
              <DropdownMenuSeparator />
              <Field label="Min Spend (USD)" value={thresholds.minSpend} onChange={(v) => setThresholds(s => ({ ...s, minSpend: v }))} />
              <Field label="Min Clicks" value={thresholds.minClicks} onChange={(v) => setThresholds(s => ({ ...s, minClicks: v }))} />

              <div className="px-1 pt-2 text-[11px] text-slate-500">
                These rules drive <b>Scale / Optimize / Kill</b> decisions in tables.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6 mb-5">
        <Stat title="Spend" value={currency(agg.spend)} />
        <Stat title="Revenue" value={currency(agg.revenue)} />
        <Stat title="ROAS" value={agg.roas == null ? "–" : `${agg.roas.toFixed(2)}x`} />
        <Stat title="CPC"  value={CPC  == null ? "–" : currency(CPC)} />
        <Stat title="CPL"  value={CPL  == null ? "–" : currency(CPL)} />
        <Stat title="CPA"  value={CPA  == null ? "–" : currency(CPA)} />
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6 mb-6">
        <Stat title="CPCB" value={CPCB == null ? "–" : currency(CPCB)} />
        <Stat title="Impressions" value={fmt(agg.impressions)} />
        <Stat title="Clicks" value={fmt(agg.clicks)} />
        <Stat title="Leads" value={fmt(agg.leads)} />
        <Stat title="Checkouts" value={fmt(agg.checkouts)} />
        <Stat title="Purchases" value={fmt(agg.purchases)} />
      </div>

      {/* Charts */}
      <Card className="rounded-2xl border-2 border-white/40 bg-white/85 backdrop-blur overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            {tab === "ad" ? "ROAS by Ad" : tab === "adset" ? "ROAS by Ad Set" : "ROAS by Campaign"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RBarChart data={roasByDim}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="roas" name="ROAS (x)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} />
            </RBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-4 rounded-2xl border-2 border-white/40 bg-white/85 backdrop-blur overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RLineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="spend" name="Spend" dot={false} />
              <Line type="monotone" dataKey="revenue" name="Revenue" dot={false} />
            </RLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights: Top dims */}
      <div className="mt-4">
        <AcquisitionInsights rows={filteredRows} loading={loading} />
      </div>


      {/* Table */}
      <Card className="mt-4 rounded-2xl border bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            {tab === "ad" ? "Ad-Level Performance" : tab === "adset" ? "Ad Set-Level Performance" : "Campaign-Level Performance"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <div className="mb-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product, campaign, ad set, ad, account, placement, platform, device, country, age…"
              className="max-w-2xl"
            />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">{tab === "ad" ? "Ad" : tab === "adset" ? "Ad Set" : "Campaign"}</th>
                <th className="py-2 pr-3">Decision</th>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Channel</th>
                <th className="py-2 pr-3">Account</th>
                <th className="py-2 pr-3">Impr.</th>
                <th className="py-2 pr-3">Clicks</th>
                <th className="py-2 pr-3">Leads</th>
                <th className="py-2 pr-3">Checkouts</th>
                <th className="py-2 pr-3">Purchases</th>
                <th className="py-2 pr-3">Spend</th>
                <th className="py-2 pr-3">Revenue</th>
                <th className="py-2 pr-3">ROAS</th>
                <th className="py-2 pr-3">CPC</th>
                <th className="py-2 pr-3">CPL</th>
                <th className="py-2 pr-3">CPA</th>
                <th className="py-2 pr-3">CPCB</th>
                <th className="py-2 pr-0">CTR</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-3">{r.entity}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={r.decision.tone}>{r.decision.label}</Badge>
                  </td>
                  <td className="py-2 pr-3">{r.product || "—"}</td>
                  <td className="py-2 pr-3">{r.channel || "—"}</td>
                  <td className="py-2 pr-3">{r.account || "—"}</td>
                  <td className="py-2 pr-3">{fmt(r.imps)}</td>
                  <td className="py-2 pr-3">{fmt(r.clicks)}</td>
                  <td className="py-2 pr-3">{fmt(r.leads)}</td>
                  <td className="py-2 pr-3">{fmt(r.checkouts)}</td>
                  <td className="py-2 pr-3">{fmt(r.purchases)}</td>
                  <td className="py-2 pr-3">{currency(r.spend)}</td>
                  <td className="py-2 pr-3">{currency(r.rev)}</td>
                  <td className="py-2 pr-3">{r.roas == null ? "–" : `${r.roas.toFixed(2)}x`}</td>
                  <td className="py-2 pr-3">{r.cpc == null ? "–" : currency(r.cpc)}</td>
                  <td className="py-2 pr-3">{r.cpl == null ? "–" : currency(r.cpl)}</td>
                  <td className="py-2 pr-3">{r.cpa == null ? "–" : currency(r.cpa)}</td>
                  <td className="py-2 pr-3">{r.cpcb == null ? "–" : currency(r.cpcb)}</td>
                  <td className="py-2 pr-0">{r.ctr == null ? "–" : `${((r.ctr as number) * 100).toFixed(2)}%`}</td>
                </tr>
              ))}
              {!tableRows.length && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={18}>
                    {loading ? "Loading performance…" : "No data for this selection."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---- small bits ---- */

function AccountSelect({
  currentId, currentLabel, accounts, onChange,
}: {
  currentId: string; currentLabel: string; accounts: { key: string; label: string }[];
  onChange: (id: string, label: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <Select
      value={currentId}
      onValueChange={(val) => {
        const lbl = accounts.find(a => a.key === val)?.label || (val === "all" ? "All Accounts" : val);
        onChange(val, lbl);
      }}
    >
      <SelectTrigger className="h-9 w-[210px]">
        <SelectValue placeholder="All Accounts">
          <span suppressHydrationWarning>{mounted ? currentLabel : "All Accounts"}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card className="rounded-xl border bg-white/90">
      <CardContent className="py-3">
        <div className="text-[11px] text-slate-500">{title}</div>
        <div className="text-lg font-semibold text-slate-800">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({
  label, value, onChange, step = "1",
}: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div className="px-1 py-1.5">
      <div className="text-[11px] text-slate-600 mb-1">{label}</div>
      <Input
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value || "0");
          onChange(Number.isFinite(v) ? v : 0);
        }}
        className="h-8"
      />
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "muted"; children: React.ReactNode }) {
  const map: Record<typeof tone, string> = {
    green: "bg-green-100 text-green-800 border-green-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    red: "bg-red-100 text-red-800 border-red-200",
    muted: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

function DimList({
  title, data,
}: {
  title: string;
  data?: { byLeads: { name: string; leads: number }[]; byPurch: { name: string; purchases: number }[] };
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-2">
          <div className="text-[11px] text-slate-500 mb-1">By Leads</div>
          <ul className="space-y-1">
            {data?.byLeads?.length
              ? data.byLeads.map((x, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="truncate">{x.name}</span>
                    <span className="font-medium">{fmt(x.leads)}</span>
                  </li>
                ))
              : <li className="text-sm text-slate-400">No data</li>}
          </ul>
        </div>
        <div className="rounded-lg border p-2">
          <div className="text-[11px] text-slate-500 mb-1">By Purchases</div>
          <ul className="space-y-1">
            {data?.byPurch?.length
              ? data.byPurch.map((x, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="truncate">{x.name}</span>
                    <span className="font-medium">{fmt(x.purchases)}</span>
                  </li>
                ))
              : <li className="text-sm text-slate-400">No data</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
