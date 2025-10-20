// File: app/dashboard/performance/page.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  ControlsBar,
  type Preset,
  type Level,
  type Channel,
} from "@/components/dashboard/ControlsBar";
import { useAccount } from "@/components/dashboard/AccountContext";
import type { Row } from "@/app/types/dashboard";
import { aggregate, currency, fmt, groupBy } from "@/lib/metrics";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  BarChart as RBarChart, Bar, CartesianGrid, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Legend, LineChart as RLineChart, Line,
} from "recharts";

/** ----- helpers ----- */
const safePer = (num?: number, den?: number) =>
  !num || !den || den === 0 ? null : num / den;

/** Works for both raw Row and aggregate outputs */
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
  roas: number;
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
  const roas = spend > 0 ? rev / spend : (typeof row.roas === "number" ? row.roas : null);
  return { spend, rev, imps, clicks, leads, checkouts, purchases, roas };
}

const getFromLS = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return (v as unknown as T) ?? fallback;
  } catch { return fallback; }
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

/** ----- page ----- */
export default function PerformancePage() {
  const { accountId } = useAccount();

  // persisted prefs
  const [level, setLevel] = React.useState<Level>(() =>
    (getFromLS<Level>("vam.level", "ad") as Level) || "ad"
  );
  const [channel, setChannel] = React.useState<Channel>(() =>
    (getFromLS<Channel>("vam.channel", "all") as Channel) || "all"
  );

  // date range
  const [preset, setPreset] = React.useState<Preset>("last_24h");
  const [from, setFrom] = React.useState<string>(""); const [to, setTo] = React.useState<string>("");

  // ui/data
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  // **trimmed thresholds** → only these two remain
  const [minSpend, setMinSpend] = React.useState(0);
  const [minClicks, setMinClicks] = React.useState(0);

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
      params.set("level", level);
      if (accountId !== "all") params.set("account", accountId);
      if (channel !== "all") params.set("channel", channel);
      if (preset === "custom" && from && to) {
        params.set("from", from); params.set("to", to);
      } else {
        params.set("date_preset", preset);
      }
      const res = await fetch(`/api/import/merge?${params.toString()}`);
      const data = (await res.json()) as Row[] | { error?: string };
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, channel, level, preset, from, to]);

  React.useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSync = React.useCallback(async () => { await fetchRows(); }, [fetchRows]);

  /* filters */
  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const { spend, clicks } = norm(r as unknown as Normalizable);
      if (spend < minSpend) return false;
      if (clicks < minClicks) return false;
      if (!q) return true;
      const hay = [r.product, r.campaign, r.adset, r.ad, r.channel, r.account_name]
        .map(x => (x || "").toString().toLowerCase()).join(" ");
      return hay.includes(q);
    });
  }, [rows, minSpend, minClicks, query]);

  /* aggregates */
  const agg = React.useMemo(() => aggregate(filteredRows), [filteredRows]);
  const CPC  = safePer(agg.spend, agg.clicks);
  const CPL  = safePer(agg.spend, agg.leads);
  const CPA  = safePer(agg.spend, agg.purchases);
  const CPCB = safePer(agg.spend, agg.checkouts);

  /* charts */
  const roasByDim = React.useMemo(() => {
    const keyGetter = (r: Row) =>
      level === "ad" ? (r.ad || "(no ad)")
      : level === "adset" ? (r.adset || "(no ad set)")
      : (r.campaign || "(no campaign)");
    const g = groupBy(filteredRows, keyGetter);
    return Array.from(g.entries()).map(([name, arr]) => {
      const a = aggregate(arr);
      const n = norm(a as unknown as Normalizable);
      return { name, roas: n.roas ?? 0, revenue: n.rev, spend: n.spend };
    }).sort((a, b) => (b.roas - a.roas) || (b.revenue - a.revenue)).slice(0, 12);
  }, [filteredRows, level]);

  const dailyTrend = React.useMemo(() => {
    const g = groupBy(filteredRows, r => r.date);
    return Array.from(g.entries()).map(([date, arr]) => {
      const a = aggregate(arr);
      const n = norm(a as unknown as Normalizable);
      return { date, spend: n.spend, revenue: n.rev, clicks: n.clicks };
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filteredRows]);

  /* table */
  const tableRows = React.useMemo(() => {
    const keyGetter = (r: Row) =>
      level === "ad" ? (r.ad || "(no ad)")
      : level === "adset" ? (r.adset || "(no ad set)")
      : (r.campaign || "(no campaign)");
    const g = groupBy(filteredRows, keyGetter);
    return Array.from(g.entries()).map(([entity, arr]) => {
      const a = aggregate(arr);
      const n = norm(a as unknown as Normalizable);
      const imps = a.impressions ?? 0;
      return {
        entity,
        product: mostCommon(arr.map(x => x.product)),
        channel: mostCommon(arr.map(x => x.channel)),
        account: mostCommon(arr.map(x => x.account_name || x.account)),
        spend: n.spend, rev: n.rev, roas: n.roas,
        imps, clicks: n.clicks, leads: n.leads, checkouts: n.checkouts, purchases: n.purchases,
        cpc: safePer(n.spend, n.clicks),
        cpl: safePer(n.spend, n.leads),
        cpa: safePer(n.spend, n.purchases),
        cpcb: safePer(n.spend, n.checkouts),
        ctr: imps ? (n.clicks / imps) : null,
      };
    }).sort((a, b) => b.rev - a.rev);
  }, [filteredRows, level]);

  return (
    <div className="w-full">
      <TopBar query={query} setQuery={setQuery} subtitle="Performance" title="Performance Overview" />

      <ControlsBar
        thresholds={{
          minSpend, setMinSpend,
          minClicks, setMinClicks,
        }}
        selectedPreset={preset}
        onPresetChange={(p) => { setPreset(p); if (p !== "custom") { setFrom(""); setTo(""); } }}
        from={from} to={to} setFrom={setFrom} setTo={setTo}
        onSync={handleSync}
        syncing={loading}
        level={level}
        onLevelChange={(l) => {
          setLevel(l);
          if (typeof window !== "undefined") {
            try { localStorage.setItem("vam.level", l); } catch {}
          }
        }}
        channel={channel}
        onChannelChange={(c) => {
          setChannel(c);
          if (typeof window !== "undefined") {
            try { localStorage.setItem("vam.channel", c); } catch {}
          }
        }}
        // keep icon-only import/export available if you wired handlers elsewhere
        onExportClick={() => window.dispatchEvent(new CustomEvent("vam:export-campaigns"))}
        onImportClick={() => window.dispatchEvent(new CustomEvent("vam:open-import"))}
        showAccount
        showLevel
        showChannel
        showThresholds
        showImportExport
        allowCustomRange
      />

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
            {level === "ad" ? "ROAS by Ad" : level === "adset" ? "ROAS by Ad Set" : "ROAS by Campaign"}
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

      {/* Table */}
      <Card className="mt-4 rounded-2xl border bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            {level === "ad" ? "Ad-Level Performance" : level === "adset" ? "Ad Set-Level Performance" : "Campaign-Level Performance"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">{level === "ad" ? "Ad" : level === "adset" ? "Ad Set" : "Campaign"}</th>
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
                  <td className="py-6 text-center text-slate-500" colSpan={17}>
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
