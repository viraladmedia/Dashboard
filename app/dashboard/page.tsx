"use client";

import * as React from "react";
import { useAccount } from "@/components/dashboard/AccountContext";
import { TopBar } from "@/components/dashboard/TopBar";
import type { Row } from "@/app/types/dashboard";
import { aggregate, currency, fmt, groupBy } from "@/lib/metrics";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  LineChart as RLineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

/** Local union types used on this page */
type Level = "ad" | "adset" | "campaign";
type Channel = "all" | "meta" | "tiktok" | "google";
type Preset = "last_24h" | "last_48h" | "last_7d" | "last_30d" | "last_60d" | "last_90d" | "custom";

export default function OverviewPage() {
  const { accountId } = useAccount();

  // Campaign-level only (per requirement)
  const [level] = React.useState<Level>("campaign");
  const [channel, setChannel] = React.useState<Channel>("all");
  const [preset, setPreset] = React.useState<Preset>("last_30d"); // default to last 30 days
  const [from, setFrom] = React.useState(""); 
  const [to, setTo] = React.useState("");

  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchRows = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("level", "campaign");
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
  }, [accountId, channel, preset, from, to]);

  React.useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const hay = [r.campaign, r.product, r.channel, r.account_name]
        .map(x => (x || "").toString().toLowerCase()).join(" ");
      return hay.includes(q);
    });
  }, [rows, query]);

  const agg = React.useMemo(() => aggregate(filtered), [filtered]);

  const dailyTrend = React.useMemo(() => {
    const g = groupBy(filtered, r => r.date);
    return Array.from(g.entries())
      .map(([date, arr]) => {
        const a = aggregate(arr);
        return { date, spend: a.spend, revenue: a.revenue };
      })
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filtered]);

  const topCampaigns = React.useMemo(() => {
    const g = groupBy(filtered, r => r.campaign || "(no campaign)");
    return Array.from(g.entries())
      .map(([campaign, arr]) => {
        const a = aggregate(arr);
        return {
          campaign,
          spend: a.spend,
          revenue: a.revenue,
          roas: a.roas ?? 0,
          clicks: a.clicks,
          purchases: a.purchases,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filtered]);

  return (
    <div className="w-full">
      {/* Top bar: no query props anymore */}
      <TopBar subtitle="Overview" title="Campaign Performance" />

      {/* Lightweight search just under the bar */}
      <div className="my-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaign, product, channel, or account…"
            className="pl-8"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-5">
        <Stat title="Spend" value={currency(agg.spend)} />
        <Stat title="Revenue" value={currency(agg.revenue)} />
        <Stat title="ROAS" value={agg.roas == null ? "–" : `${agg.roas.toFixed(2)}x`} />
        <Stat title="Clicks" value={fmt(agg.clicks)} />
        <Stat title="Leads" value={fmt(agg.leads)} />
        <Stat title="Purchases" value={fmt(agg.purchases)} />
      </div>

      {/* Trend */}
      <Card className="rounded-2xl border-2 border-white/40 bg-white/85 backdrop-blur overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Spend vs Revenue ({labelForPreset(preset)})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 h-64">
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

      {/* Top Campaigns */}
      <Card className="mt-4 rounded-2xl border bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Top Campaigns ({labelForPreset(preset)})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3">Spend</th>
                <th className="py-2 pr-3">Revenue</th>
                <th className="py-2 pr-3">ROAS</th>
                <th className="py-2 pr-0">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-3">{r.campaign}</td>
                  <td className="py-2 pr-3">{currency(r.spend)}</td>
                  <td className="py-2 pr-3">{currency(r.revenue)}</td>
                  <td className="py-2 pr-3">{r.roas ? `${r.roas.toFixed(2)}x` : "–"}</td>
                  <td className="py-2 pr-0">{fmt(r.clicks)}</td>
                </tr>
              ))}
              {!topCampaigns.length && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={5}>
                    {loading ? "Loading…" : "No data for this selection."}
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
