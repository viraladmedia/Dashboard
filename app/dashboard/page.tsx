/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/dashboard/page.tsx
"use client";

import React from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ArrowDownRight, ArrowUpRight, DollarSign, Download, LineChart as LineChartIcon,
  Rocket, Search, Settings2, Trash2, Upload, Calendar as CalendarIcon, X as XIcon,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import Papa from "papaparse";

/** Row supports account & adset metadata populated by APIs */
type Row = {
  date: string;
  channel: string;
  campaign: string;
  product: string;
  ad: string;
  adset?: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  checkouts: number;
  purchases: number;
  ad_spend: number;
  revenue: number;
  account_id?: string | null;
  account_name?: string | null;
};

function safeDiv(n: number, d: number) { return !d ? null : n / d; }
function formatCurrency(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function fmt(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "–";
  return Number(n.toFixed(digits)).toLocaleString();
}
function by<T extends Record<string, unknown>>(arr: T[], key: (t: T) => string) {
  const map = new Map<string, T[]>();
  for (const it of arr) { const k = key(it); if (!map.has(k)) map.set(k, []); map.get(k)!.push(it); }
  return map;
}
function aggregate(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + r.ad_spend, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  const checkouts = rows.reduce((s, r) => s + r.checkouts, 0);
  const purchases = rows.reduce((s, r) => s + r.purchases, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  return {
    spend, revenue, clicks, leads, checkouts, purchases, impressions,
    cpc: safeDiv(spend, clicks), cpl: safeDiv(spend, leads),
    cpa: safeDiv(spend, purchases), cpcb: safeDiv(spend, checkouts),
    roas: safeDiv(revenue, spend),
  };
}
type Thresholds = {
  minSpend: number; minClicks: number; roasKill: number; roasScale: number;
  cpaKill: number | null; cpaGood: number | null;
};
function statusFor(agg: ReturnType<typeof aggregate>, cfg: Thresholds) {
  const { minSpend, minClicks, roasKill, roasScale, cpaKill, cpaGood } = cfg;
  const meetsVolume = agg.spend >= minSpend && agg.clicks >= minClicks;
  if (meetsVolume && ((agg.roas != null && agg.roas < roasKill) || (cpaKill != null && agg.cpa != null && agg.cpa > cpaKill))) return "Kill" as const;
  if ((agg.roas != null && agg.roas >= roasScale) || (cpaGood != null && agg.cpa != null && agg.cpa <= cpaGood)) return "Scale" as const;
  return "Optimize" as const;
}

function useCSVImporter(setRows: (r: Row[]) => void) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const onPick = () => inputRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    Papa.parse<Row>(f, {
      header: true, dynamicTyping: true, skipEmptyLines: true,
      complete: (res) => {
        const parsed = (res.data as unknown[]).map((r: any) => ({
          date: String(r.date ?? r.Date ?? r.DATE ?? ""),
          channel: String(r.channel ?? r.Channel ?? r.CHANNEL ?? ""),
          campaign: String(r.campaign ?? r.Campaign ?? r.CAMPAIGN ?? ""),
          product: String(r.product ?? r.Product ?? r.PRODUCT ?? ""),
          ad: String(r.ad ?? r.Ad ?? r.AD ?? r.creative ?? ""),
          adset: String(r.adset ?? r.ad_set ?? r["ad set"] ?? r.adset_name ?? r.Adset ?? r.AdSet ?? "") || null,
          impressions: Number(r.impressions ?? r.Impressions ?? r.IMPR ?? r.impr ?? 0),
          clicks: Number(r.clicks ?? r.Clicks ?? r.CLICKS ?? 0),
          leads: Number(r.leads ?? r.Leads ?? r.LEADS ?? 0),
          checkouts: Number(r.checkouts ?? r.Checkouts ?? r.checkout_started ?? 0),
          purchases: Number(r.purchases ?? r.Purchases ?? r.Sales ?? r.orders ?? 0),
          ad_spend: Number(r.ad_spend ?? r.spend ?? r.Spend ?? r.cost ?? 0),
          revenue: Number(r.revenue ?? r.Revenue ?? r.rev ?? 0),
          account_id: String(r.account_id ?? r.AccountId ?? r.account ?? "") || null,
          account_name: String(r.account_name ?? r.AccountName ?? "") || null,
        })) as Row[];
        setRows(parsed);
      },
      error: (err) => alert(`CSV parse error: ${err.message}`),
    });
  };
  return { inputRef, onPick, onFile };
}

function GradientHeader() {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-6 bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-400 text-white shadow-lg">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_30%,white,transparent_35%)]" />
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest/relaxed opacity-90">Viral Ad Media, LLC</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1 leading-tight break-words">Financial & Performance Dashboard</h1>
          <p className="opacity-95 mt-1 text-sm md:text-base leading-snug break-words">
            Track Sales & Ad Spend • CPC • CPL • CPA • CPCB • ROAS — per funnel/product, adset, and ad.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/15 backdrop-blur text-white border border-white/30">Live Preview</Badge>
          <Badge className="bg-black/20 backdrop-blur border border-white/30">Colorful</Badge>
        </div>
      </div>
    </div>
  );
}
function yyyymmdd(d: Date) { return d.toISOString().slice(0, 10); }

export default function FinancialDashboard() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [query, setQuery] = React.useState("");
  const [channel, setChannel] = React.useState<string>("all");
  const [product, setProduct] = React.useState<string>("all");
  const [account, setAccount] = React.useState<string>("all");

  // Decision thresholds
  const [minSpend, setMinSpend] = React.useState<number>(500);
  const [minClicks, setMinClicks] = React.useState<number>(100);
  const [roasKill, setRoasKill] = React.useState<number>(1.0);
  const [roasScale, setRoasScale] = React.useState<number>(3.0);
  const [cpaKill, setCpaKill] = React.useState<number | "">("");
  const [cpaGood, setCpaGood] = React.useState<number | "">("");

  // API Sync controls
  const today = new Date();
  const twoWeeksAgo = new Date(Date.now() - 13 * 24 * 3600 * 1000);
  const [from, setFrom] = React.useState<string>(yyyymmdd(twoWeeksAgo));
  const [to, setTo] = React.useState<string>(yyyymmdd(today));
  const [syncLevel, setSyncLevel] = React.useState<"ad" | "campaign">("ad");
  const [syncLoading, setSyncLoading] = React.useState(false);

  const thresholds = React.useMemo(
    () => ({
      minSpend, minClicks, roasKill, roasScale,
      cpaKill: cpaKill === "" ? null : Number(cpaKill),
      cpaGood: cpaGood === "" ? null : Number(cpaGood),
    }),
    [minSpend, minClicks, roasKill, roasScale, cpaKill, cpaGood]
  );

  const { inputRef, onPick, onFile } = useCSVImporter(setRows);

  const allChannels = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.channel))).sort(),
    [rows]
  );
  const allProducts = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.product))).sort(),
    [rows]
  );
  const accountOptions = React.useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((r) => {
      const key = (r.account_id || r.account_name || "").trim();
      if (!key) return;
      const label = (r.account_name || r.account_id || "Unlabeled").toString();
      set.set(key, label);
    });
    return Array.from(set.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  // Counts for “All …”
  const channelCount = allChannels.length;
  const productCount = allProducts.length;
  const accountCount = accountOptions.length;

  // Filters & search
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (channel !== "all" && r.channel !== channel) return false;
      if (product !== "all" && r.product !== product) return false;
      if (account !== "all") {
        const key = (r.account_id || r.account_name || "").trim();
        if (key !== account) return false;
      }
      if (!q) return true;
      const hay = `${r.product} ${r.campaign} ${r.ad} ${r.adset ?? ""} ${r.channel} ${r.account_name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, channel, product, account]);

  const totals = React.useMemo(() => aggregate(filtered), [filtered]);

  // Groupings
  const groupedAd = React.useMemo(() => {
    const groups = by(filtered, (r) => `${r.product} | ${r.campaign} | ${r.ad}`);
    const order = { Scale: 0, Optimize: 1, Kill: 2 } as Record<string, number>;
    return Array.from(groups.entries()).map(([k, arr]) => {
      const agg = aggregate(arr);
      const [prod, camp, ad] = k.split(" | ");
      return {
        key: k, product: prod, campaign: camp, ad,
        channel: arr[0].channel, rows: arr,
        ...agg, status: statusFor(agg, thresholds),
      };
    }).sort((a, b) => (order[a.status] - order[b.status]) || (b.spend - a.spend));
  }, [filtered, thresholds]);

  const groupedAdset = React.useMemo(() => {
    const groups = by(filtered, (r) => `${r.product} | ${r.campaign} | ${r.adset ?? "(no ad set)"}`);
    const order = { Scale: 0, Optimize: 1, Kill: 2 } as Record<string, number>;
    return Array.from(groups.entries()).map(([k, arr]) => {
      const agg = aggregate(arr);
      const [prod, camp, adset] = k.split(" | ");
      return {
        key: k, product: prod, campaign: camp, adset,
        channel: arr[0].channel, rows: arr,
        ...agg, status: statusFor(agg, thresholds),
      };
    }).sort((a, b) => (order[a.status] - order[b.status]) || (b.spend - a.spend));
  }, [filtered, thresholds]);

  const groupedCampaign = React.useMemo(() => {
    const groups = by(filtered, (r) => `${r.product} | ${r.campaign}`);
    const order = { Scale: 0, Optimize: 1, Kill: 2 } as Record<string, number>;
    return Array.from(groups.entries()).map(([k, arr]) => {
      const agg = aggregate(arr);
      const [prod, camp] = k.split(" | ");
      return {
        key: k, product: prod, campaign: camp,
        channel: arr[0].channel, rows: arr,
        ...agg, status: statusFor(agg, thresholds),
      };
    }).sort((a, b) => (order[a.status] - order[b.status]) || (b.spend - a.spend));
  }, [filtered, thresholds]);

  // Charts
  const roasByProduct = React.useMemo(() => {
    const groups = by(filtered, (r) => r.product);
    return Array.from(groups.entries()).map(([product, arr]) => {
      const agg = aggregate(arr);
      return { product, roas: agg.roas ?? 0, spend: agg.spend };
    });
  }, [filtered]);

  const spendRevenueOverTime = React.useMemo(() => {
    const groups = by(filtered, (r) => r.date);
    return Array.from(groups.entries())
      .map(([date, arr]) => {
        const agg = aggregate(arr);
        return { date, spend: agg.spend, revenue: agg.revenue };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const roasVsCpa = React.useMemo(() => groupedAd.map((g) => ({
    name: `${g.product}: ${g.ad}`, roas: g.roas ?? 0, cpa: g.cpa ?? 0, spend: g.spend,
  })), [groupedAd]);

  // CSV helpers (only keep Campaign export since others were removed)
  function exportFilteredCSVCampaign() {
    const header = ["product", "campaign", "spend", "revenue", "roas", "clicks", "leads", "checkouts", "purchases", "cpc", "cpl", "cpa", "cpcb", "status"];
    const rowsCsv = groupedCampaign.map((g) => [g.product, g.campaign, g.spend, g.revenue, g.roas ?? "", g.clicks, g.leads, g.checkouts, g.purchases, g.cpc ?? "", g.cpl ?? "", g.cpa ?? "", g.cpcb ?? "", g.status]);
    const csv = Papa.unparse([header, ...rowsCsv]); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `viral-ad-media-campaign-report.csv`; a.click(); URL.revokeObjectURL(url);
  }
  function downloadTemplate() {
    const header = ["date","channel","campaign","product","ad","adset","impressions","clicks","leads","checkouts","purchases","ad_spend","revenue","account_id","account_name"];
    const csv = Papa.unparse([header]); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "viral-ad-media-template.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function StatusBadge({ s }: { s: ReturnType<typeof statusFor> }) {
    const styles: Record<string, string> = {
      Scale: "bg-emerald-500/15 text-emerald-600 border-emerald-400/40",
      Optimize: "bg-amber-500/15 text-amber-600 border-amber-400/40",
      Kill: "bg-rose-500/15 text-rose-600 border-rose-400/40",
    };
    const Icon = s === "Scale" ? Rocket : s === "Kill" ? Trash2 : Settings2;
    return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[s]}`}><Icon className="h-3.5 w-3.5" /> {s}</span>;
  }
  function KPI({ title, value, sub, trend }: { title: string; value: string; sub?: string; trend?: "up" | "down" }) {
    const Trend = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;
    return (
      <Card className="rounded-2xl shadow-sm border-2 border-white/40 bg-white/80 backdrop-blur overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end gap-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">{value}</div>
            {Trend ? (
              <span className={`inline-flex items-center gap-1 text-xs ${trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>
                <Trend className="h-3.5 w-3.5" /> {sub}
              </span>
            ) : sub ? <span className="text-xs text-slate-500 whitespace-nowrap">{sub}</span> : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  // API Sync — accepts account
  const handleSync = React.useCallback(
    async (fromDate: string, toDate: string, level: "ad" | "campaign" = "ad", accountKey?: string) => {
      try {
        setSyncLoading(true);
        const params = new URLSearchParams({ level });
        if (fromDate && toDate) { params.set("from", fromDate); params.set("to", toDate); }
        else { params.set("date_preset", "last_30d"); }
        if (accountKey && accountKey !== "all") params.set("account", accountKey);

        let res = await fetch(`/api/import/merge?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data: unknown = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          const retry = new URLSearchParams({ level, date_preset: "last_30d" });
          if (accountKey && accountKey !== "all") retry.set("account", accountKey);
          res = await fetch(`/api/import/merge?${retry.toString()}`);
          if (res.ok) data = await res.json();
        }
        if (!Array.isArray(data) || data.length === 0) return;
        setRows(data as Row[]);
      } catch (err: unknown) {
        alert(`Sync failed: ${(err as Error).message}`);
      } finally { setSyncLoading(false); }
    },
    []
  );

  // Initial load: last 30 days
  React.useEffect(() => { handleSync("", "", "ad", account); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Reload when account changes
  React.useEffect(() => { handleSync(from, to, syncLevel, account); }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------- UI helpers -------
  const hasActiveFilters = channel !== "all" || product !== "all" || account !== "all" || query.trim() !== "";
  const resetFilter = (which: "channel" | "product" | "account" | "query") => {
    if (which === "channel") setChannel("all");
    if (which === "product") setProduct("all");
    if (which === "account") setAccount("all");
    if (which === "query") setQuery("");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-violet-50 to-cyan-50">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8">
        <div className="mb-4">
          <GradientHeader />
        </div>

        {/* Row: Filters (lighter), Actions & Thresholds (new), Sync */}
        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          {/* Filters */}
          <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur overflow-hidden lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search product, campaign, ad, adset, channel, or account…"
                    className="pl-8 pr-8"
                  />
                  {query && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Account */}
                <Select value={account} onValueChange={setAccount}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder={`All Accounts (${accountCount})`}>
                      {account === "all"
                        ? `All Accounts (${accountCount})`
                        : (accountOptions.find(a => a.value === account)?.label ?? account)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{`All Accounts (${accountCount})`}</SelectItem>
                    {accountOptions.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Channel */}
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder={`All Channels (${channelCount})`}>
                      {channel === "all" ? `All Channels (${channelCount})` : channel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{`All Channels (${channelCount})`}</SelectItem>
                    {allChannels.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Product */}
                <Select value={product} onValueChange={setProduct}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder={`All Products (${productCount})`}>
                      {product === "all" ? `All Products (${productCount})` : product}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{`All Products (${productCount})`}</SelectItem>
                    {allProducts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Active filters */}
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {query.trim() && (
                    <Badge variant="outline" className="gap-1 bg-slate-50">
                      Search: “{query.trim()}”
                      <button onClick={() => resetFilter("query")} className="ml-1 opacity-70 hover:opacity-100">
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {account !== "all" && (
                    <Badge variant="outline" className="gap-1 bg-slate-50">
                      Account: {accountOptions.find(a => a.value === account)?.label ?? account}
                      <button onClick={() => resetFilter("account")} className="ml-1 opacity-70 hover:opacity-100">
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {channel !== "all" && (
                    <Badge variant="outline" className="gap-1 bg-slate-50">
                      Channel: {channel}
                      <button onClick={() => resetFilter("channel")} className="ml-1 opacity-70 hover:opacity-100">
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {product !== "all" && (
                    <Badge variant="outline" className="gap-1 bg-slate-50">
                      Product: {product}
                      <button onClick={() => resetFilter("product")} className="ml-1 opacity-70 hover:opacity-100">
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setQuery(""); setAccount("all"); setChannel("all"); setProduct("all"); }} className="ml-auto">
                    Reset All
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions & Thresholds */}
          <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Actions & Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {/* Thresholds row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Min Spend</span>
                    <div className="w-36"><Slider value={[minSpend]} min={0} max={5000} step={50} onValueChange={(v) => setMinSpend(v[0])} /></div>
                    <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">{formatCurrency(minSpend)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Min Clicks</span>
                    <div className="w-36"><Slider value={[minClicks]} min={0} max={2000} step={10} onValueChange={(v) => setMinClicks(v[0])} /></div>
                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">{fmt(minClicks, 0)}</Badge>
                  </div>
                </div>

                {/* Import / Template (Export Campaigns only) */}
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={onPick} variant="secondary" className="gap-2 whitespace-nowrap"><Upload className="h-4 w-4" />Import CSV</Button>
                  <Button onClick={downloadTemplate} variant="outline" className="gap-2 whitespace-nowrap"><Download className="h-4 w-4" />Template</Button>
                  <Button onClick={exportFilteredCSVCampaign} variant="outline" className="gap-2 whitespace-nowrap col-span-2"><Download className="h-4 w-4" />Export Campaigns</Button>
                </div>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
              </div>
            </CardContent>
          </Card>

          {/* Sync */}
          <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur overflow-hidden lg:col-span-3">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2 text-slate-600"><CalendarIcon className="h-4 w-4" /><span className="text-sm font-medium">Sync from APIs</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="md:col-span-1">
                  <label className="text-xs text-slate-500">From</label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-slate-500">To</label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-slate-500">Level</label>
                  <Select value={syncLevel} onValueChange={(v) => setSyncLevel(v as "ad" | "campaign")}>
                    <SelectTrigger><SelectValue placeholder="Level">{syncLevel === "ad" ? "Ad" : "Campaign"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ad">Ad</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex items-end gap-2">
                  <Button disabled={syncLoading} onClick={() => handleSync(from, to, syncLevel, account)} className="gap-2 whitespace-nowrap shrink-0">
                    <Upload className="h-4 w-4" /> {syncLoading ? "Syncing…" : "Sync from APIs"}
                  </Button>
                  {/* Removed: Sync (Last 30 Days) */}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5 mb-6">
          <KPI title="Ad Spend" value={formatCurrency(totals.spend)} sub="Total" trend="down" />
          <KPI title="Revenue" value={formatCurrency(totals.revenue)} sub="Total" trend="up" />
          <KPI title="ROAS" value={totals.roas != null ? totals.roas.toFixed(2) + "x" : "–"} sub="Return" trend={totals.roas && totals.roas >= 1 ? "up" : "down"} />
          <KPI title="Leads" value={fmt(totals.leads, 0)} />
          <KPI title="Purchases" value={fmt(totals.purchases, 0)} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur lg:col-span-1 overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">ROAS by Product</CardTitle></CardHeader>
            <CardContent className="pt-0 h-64 min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roasByProduct}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product" hide={false} tick={{ fontSize: 11 }} angle={-15} height={50} interval={0} />
                  <YAxis yAxisId="left" tickFormatter={(v: number) => `${v.toFixed(1)}x`} />
                  <Tooltip formatter={(val: unknown, name: string) => name === "roas" ? `${Number(val as number).toFixed(2)}x` : formatCurrency(Number(val as number))} />
                  <Legend />
                  <Bar dataKey="roas" yAxisId="left" name="ROAS" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><LineChartIcon className="h-4 w-4" /> Spend vs Revenue (by Date)</CardTitle>
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Trend</Badge>
            </CardHeader>
            <CardContent className="pt-0 h-64 min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendRevenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v as number))} />
                  <Legend />
                  <Bar dataKey="spend" yAxisId="left" name="Ad Spend" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="revenue" yAxisId="left" name="Revenue" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur lg:col-span-3 overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">ROAS vs CPA (bubble size = Spend)</CardTitle></CardHeader>
            <CardContent className="pt-0 h-72 min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="roas" name="ROAS" tickFormatter={(v: number) => `${v.toFixed(1)}x`} />
                  <YAxis type="number" dataKey="cpa" name="CPA" tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                  <Tooltip formatter={(v: unknown, n: string) => n === "roas" ? `${Number(v as number).toFixed(2)}x` : formatCurrency(Number(v as number))} cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={roasVsCpa} name="Ads" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Ad-Level Table */}
        <Card className="rounded-2xl border-2 border-white/40 bg-white/90 backdrop-blur overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">Ad-Level Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[170px]" />
                <col className="w-[220px]" />
                <col className="w-[220px]" />
                <col className="w-[110px]" />
                <col className="w-[120px]" />
                <col className="w-[80px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[80px]" />
                <col className="w-[80px]" />
                <col className="w-[90px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Ad</th>
                  <th className="py-2 pr-4">Spend</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4">ROAS</th>
                  <th className="py-2 pr-4">CPC</th>
                  <th className="py-2 pr-4">CPL</th>
                  <th className="py-2 pr-4">CPA</th>
                  <th className="py-2 pr-4">CPCB</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Leads</th>
                  <th className="py-2 pr-4">Checkouts</th>
                  <th className="py-2 pr-4">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {groupedAd.map((g, i) => (
                  <tr key={g.key + i} className="border-b hover:bg-gradient-to-r hover:from-fuchsia-50/60 hover:to-cyan-50/60">
                    <td className="py-2 pr-4"><StatusBadge s={g.status} /></td>
                    <td className="py-2 pr-4">
                      <div className="font-semibold text-slate-800 truncate">{g.product}</div>
                      <div className="text-[11px] text-slate-500 truncate">{g.rows[0]?.channel}</div>
                    </td>
                    <td className="py-2 pr-4 truncate">{g.campaign}</td>
                    <td className="py-2 pr-4 text-slate-700 truncate">{g.ad}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(g.spend)}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(g.revenue)}</td>
                    <td className={`py-2 pr-4 font-semibold ${g.roas != null && g.roas >= roasScale ? "text-emerald-600" : g.roas != null && g.roas < roasKill ? "text-rose-600" : "text-slate-700"}`}>{g.roas != null ? `${g.roas.toFixed(2)}x` : "–"}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpc)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpl)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpa)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpcb)}</td>
                    <td className="py-2 pr-4">{fmt(g.clicks, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.leads, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.checkouts, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.purchases, 0)}</td>
                  </tr>
                ))}
                {groupedAd.length === 0 && (
                  <tr><td colSpan={15} className="py-10 text-center text-slate-500">{syncLoading ? "Loading…" : "No ad-level data yet."}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Adset-Level Table */}
        <Card className="mt-6 rounded-2xl border-2 border-white/40 bg-white/90 backdrop-blur overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">Adset-Level Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[170px]" />
                <col className="w-[220px]" />
                <col className="w-[220px]" />
                <col className="w-[110px]" />
                <col className="w-[120px]" />
                <col className="w-[80px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[80px]" />
                <col className="w-[80px]" />
                <col className="w-[90px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Adset</th>
                  <th className="py-2 pr-4">Spend</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4">ROAS</th>
                  <th className="py-2 pr-4">CPC</th>
                  <th className="py-2 pr-4">CPL</th>
                  <th className="py-2 pr-4">CPA</th>
                  <th className="py-2 pr-4">CPCB</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Leads</th>
                  <th className="py-2 pr-4">Checkouts</th>
                  <th className="py-2 pr-4">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {groupedAdset.map((g, i) => (
                  <tr key={g.key + i} className="border-b hover:bg-gradient-to-r hover:from-fuchsia-50/60 hover:to-cyan-50/60">
                    <td className="py-2 pr-4"><StatusBadge s={g.status} /></td>
                    <td className="py-2 pr-4">
                      <div className="font-semibold text-slate-800 truncate">{g.product}</div>
                      <div className="text-[11px] text-slate-500 truncate">{g.channel}</div>
                    </td>
                    <td className="py-2 pr-4 truncate">{g.campaign}</td>
                    <td className="py-2 pr-4 text-slate-700 truncate">{g.adset}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(g.spend)}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(g.revenue)}</td>
                    <td className={`py-2 pr-4 font-semibold ${g.roas != null && g.roas >= roasScale ? "text-emerald-600" : g.roas != null && g.roas < roasKill ? "text-rose-600" : "text-slate-700"}`}>{g.roas != null ? `${g.roas.toFixed(2)}x` : "–"}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpc)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpl)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpa)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpcb)}</td>
                    <td className="py-2 pr-4">{fmt(g.clicks, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.leads, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.checkouts, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.purchases, 0)}</td>
                  </tr>
                ))}
                {groupedAdset.length === 0 && (
                  <tr><td colSpan={15} className="py-10 text-center text-slate-500">{syncLoading ? "Loading…" : "No adset-level data yet."}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Campaign-Level Table */}
        <Card className="mt-6 rounded-2xl border-2 border-white/40 bg-white/90 backdrop-blur overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">Campaign-Level Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[110px]" /><col className="w-[200px]" /><col />
                <col className="w-[110px]" /><col className="w-[120px]" /><col className="w-[80px]" />
                <col className="w-[90px]" /><col className="w-[90px]" /><col className="w-[90px]" />
                <col className="w-[90px]" /><col className="w-[80px]" /><col className="w-[80px]" />
                <col className="w-[90px]" /><col className="w-[100px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Spend</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4">ROAS</th>
                  <th className="py-2 pr-4">CPC</th>
                  <th className="py-2 pr-4">CPL</th>
                  <th className="py-2 pr-4">CPA</th>
                  <th className="py-2 pr-4">CPCB</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Leads</th>
                  <th className="py-2 pr-4">Checkouts</th>
                  <th className="py-2 pr-4">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {groupedCampaign.map((g, i) => (
                  <tr key={g.key + i} className="border-b hover:bg-gradient-to-r hover:from-fuchsia-50/60 hover:to-cyan-50/60">
                    <td className="py-2 pr-4"><StatusBadge s={g.status} /></td>
                    <td className="py-2 pr-4">
                      <div className="font-semibold text-slate-800 truncate">{g.product}</div>
                      <div className="text-[11px] text-slate-500 truncate">{g.channel}</div>
                    </td>
                    <td className="py-2 pr-4 truncate">{g.campaign}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(g.spend)}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(g.revenue)}</td>
                    <td className={`py-2 pr-4 font-semibold ${g.roas != null && g.roas >= roasScale ? "text-emerald-600" : g.roas != null && g.roas < roasKill ? "text-rose-600" : "text-slate-700"}`}>{g.roas != null ? `${g.roas.toFixed(2)}x` : "–"}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpc)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpl)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpa)}</td>
                    <td className="py-2 pr-4">{formatCurrency(g.cpcb)}</td>
                    <td className="py-2 pr-4">{fmt(g.clicks, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.leads, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.checkouts, 0)}</td>
                    <td className="py-2 pr-4">{fmt(g.purchases, 0)}</td>
                  </tr>
                ))}
                {groupedCampaign.length === 0 && (
                  <tr><td colSpan={14} className="py-10 text-center text-slate-500">{syncLoading ? "Loading…" : "No campaign-level data yet."}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5" />
            <span><b>CPC</b>=Spend/Clicks · <b>CPL</b>=Spend/Leads · <b>CPA</b>=Spend/Purchases · <b>CPCB</b>=Spend/Checkouts · <b>ROAS</b>=Revenue/Spend</span>
          </div>
          <div className="opacity-80">© {new Date().getFullYear()} Viral Ad Media, LLC</div>
        </div>
      </div>
    </div>
  );
}
