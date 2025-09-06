"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Download,
  Filter,
  LineChart as LineChartIcon,
  Rocket,
  Search,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Papa from "papaparse";

/**
 * Viral Ad Media — Financial Dashboard
 * Next.js + Tailwind + shadcn/ui + recharts + PapaParse
 *
 * Features
 * - At-a-glance KPIs (Spend, Revenue, ROAS, Leads, Purchases)
 * - Interactive filters (date, channel, product, search, min spend)
 * - Threshold controls to auto-flag Kill / Optimize / Scale
 * - Charts: ROAS by Product, Spend vs Revenue over time, ROAS vs CPA scatter
 * - Ad/Product table with CPC, CPL, CPA, CPCB, ROAS
 * - CSV import (with header), CSV template download, CSV export (filtered)
 * - Colorful, accessible design with clear visual hierarchy
 *
 * Data expectations (CSV headers):
 * date,channel,campaign,product,ad,impressions,clicks,leads,checkouts,purchases,ad_spend,revenue
 */

type Row = {
  date: string; // YYYY-MM-DD
  channel: string; // e.g., Meta, Google, TikTok
  campaign: string;
  product: string; // funnel/product
  ad: string; // creative/ad name
  impressions: number;
  clicks: number;
  leads: number;
  checkouts: number; // checkout begun
  purchases: number;
  ad_spend: number;
  revenue: number;
};

// --- Fake seed data (replace via CSV upload) ---
const SEED: Row[] = [
  {
    date: "2025-08-01",
    channel: "Meta",
    campaign: "TOF – UGC Hook A",
    product: "AI Amazon Bootcamp",
    ad: "UGC_V1_15s",
    impressions: 18000,
    clicks: 720,
    leads: 95,
    checkouts: 40,
    purchases: 18,
    ad_spend: 1250,
    revenue: 5400,
  },
  {
    date: "2025-08-01",
    channel: "Google",
    campaign: "Search – High Intent",
    product: "AI Amazon Bootcamp",
    ad: "KW_Exact_[ai amazon course]",
    impressions: 9200,
    clicks: 410,
    leads: 120,
    checkouts: 55,
    purchases: 25,
    ad_spend: 1620,
    revenue: 7500,
  },
  {
    date: "2025-08-02",
    channel: "TikTok",
    campaign: "Spark – Test 1",
    product: "AI Amazon Bootcamp",
    ad: "Hook_C_TalkingHead",
    impressions: 24000,
    clicks: 840,
    leads: 60,
    checkouts: 22,
    purchases: 8,
    ad_spend: 980,
    revenue: 2400,
  },
  {
    date: "2025-08-02",
    channel: "Meta",
    campaign: "MOF – Retarget 7d",
    product: "AI Amazon Bootcamp",
    ad: "Carousel_3Pains",
    impressions: 11000,
    clicks: 520,
    leads: 160,
    checkouts: 70,
    purchases: 35,
    ad_spend: 890,
    revenue: 10500,
  },
  {
    date: "2025-08-03",
    channel: "YouTube",
    campaign: "In-Stream – Creator Review",
    product: "TikTok Shop Playbook",
    ad: "Review_60s_V2",
    impressions: 15000,
    clicks: 300,
    leads: 45,
    checkouts: 18,
    purchases: 9,
    ad_spend: 700,
    revenue: 3150,
  },
  {
    date: "2025-08-03",
    channel: "Google",
    campaign: "PMAX – Bootcamp",
    product: "AI Amazon Bootcamp",
    ad: "PMAX_A",
    impressions: 13000,
    clicks: 520,
    leads: 140,
    checkouts: 58,
    purchases: 26,
    ad_spend: 1350,
    revenue: 7800,
  },
  {
    date: "2025-08-04",
    channel: "Meta",
    campaign: "TOF – UGC Hook B",
    product: "TikTok Shop Playbook",
    ad: "UGC_V2_9x16",
    impressions: 20000,
    clicks: 640,
    leads: 70,
    checkouts: 28,
    purchases: 10,
    ad_spend: 990,
    revenue: 3500,
  },
  {
    date: "2025-08-04",
    channel: "TikTok",
    campaign: "Spark – Test 2",
    product: "TikTok Shop Playbook",
    ad: "Hook_B_Duet",
    impressions: 27000,
    clicks: 900,
    leads: 100,
    checkouts: 36,
    purchases: 12,
    ad_spend: 1100,
    revenue: 4200,
  },
  {
    date: "2025-08-05",
    channel: "Google",
    campaign: "Search – Competitors",
    product: "AI Amazon Bootcamp",
    ad: "KW_Phrase_amazon coaching",
    impressions: 8000,
    clicks: 260,
    leads: 65,
    checkouts: 24,
    purchases: 11,
    ad_spend: 640,
    revenue: 3300,
  },
  {
    date: "2025-08-05",
    channel: "Meta",
    campaign: "BOF – Retarget 3d",
    product: "TikTok Shop Playbook",
    ad: "UGC_Testimonials",
    impressions: 9000,
    clicks: 460,
    leads: 130,
    checkouts: 50,
    purchases: 28,
    ad_spend: 760,
    revenue: 5600,
  },
];

function safeDiv(n: number, d: number) {
  if (!d || d === 0) return null;
  return n / d;
}

function formatCurrency(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "–";
  return Number(n.toFixed(digits)).toLocaleString();
}

function by<T extends Record<string, any>>(arr: T[], key: (t: T) => string) {
  const map = new Map<string, T[]>();
  for (const it of arr) {
    const k = key(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(it);
  }
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
    spend,
    revenue,
    clicks,
    leads,
    checkouts,
    purchases,
    impressions,
    cpc: safeDiv(spend, clicks),
    cpl: safeDiv(spend, leads),
    cpa: safeDiv(spend, purchases),
    cpcb: safeDiv(spend, checkouts),
    roas: safeDiv(revenue, spend),
  };
}

function statusFor(agg: ReturnType<typeof aggregate>, cfg: Thresholds) {
  const { minSpend, minClicks, roasKill, roasScale, cpaKill, cpaGood } = cfg;
  const meetsVolume = agg.spend >= minSpend && agg.clicks >= minClicks;
  if (meetsVolume && (agg.roas != null && agg.roas < roasKill || (cpaKill != null && agg.cpa != null && agg.cpa > cpaKill))) return "Kill" as const;
  if (agg.roas != null && agg.roas >= roasScale || (cpaGood != null && agg.cpa != null && agg.cpa <= cpaGood)) return "Scale" as const;
  return "Optimize" as const;
}

type Thresholds = {
  minSpend: number;
  minClicks: number;
  roasKill: number;
  roasScale: number;
  cpaKill: number | null;
  cpaGood: number | null;
};

function useCSVImporter(setRows: (r: Row[]) => void) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = () => inputRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    Papa.parse<Row>(f, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = (res.data as any[]).map((r) => ({
          date: String(r.date ?? r.Date ?? r.DATE ?? ""),
          channel: String(r.channel ?? r.Channel ?? r.CHANNEL ?? ""),
          campaign: String(r.campaign ?? r.Campaign ?? r.CAMPAIGN ?? ""),
          product: String(r.product ?? r.Product ?? r.PRODUCT ?? ""),
          ad: String(r.ad ?? r.Ad ?? r.AD ?? r.creative ?? ""),
          impressions: Number(r.impressions ?? r.Impressions ?? r.IMPR ?? r.impr ?? 0),
          clicks: Number(r.clicks ?? r.Clicks ?? r.CLICKS ?? 0),
          leads: Number(r.leads ?? r.Leads ?? r.LEADS ?? 0),
          checkouts: Number(r.checkouts ?? r.Checkouts ?? r.checkout_started ?? 0),
          purchases: Number(r.purchases ?? r.Purchases ?? r.Sales ?? r.orders ?? 0),
          ad_spend: Number(r.ad_spend ?? r.spend ?? r.Spend ?? r.cost ?? 0),
          revenue: Number(r.revenue ?? r.Revenue ?? r.rev ?? 0),
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1">Financial & Performance Dashboard</h1>
          <p className="opacity-95 mt-1 text-sm md:text-base">Track Sales & Ad Spend • CPC • CPL • CPA • CPCB • ROAS — per funnel/product and ad.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/15 backdrop-blur text-white border border-white/30">Live Preview</Badge>
          <Badge className="bg-black/20 backdrop-blur border border-white/30">Colorful</Badge>
        </div>
      </div>
    </div>
  );
}

export default function FinancialDashboard() {
  const [rows, setRows] = useState<Row[]>(SEED);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<string>("all");
  const [product, setProduct] = useState<string>("all");
  const [minSpend, setMinSpend] = useState<number>(500);
  const [minClicks, setMinClicks] = useState<number>(100);
  const [roasKill, setRoasKill] = useState<number>(1.0);
  const [roasScale, setRoasScale] = useState<number>(3.0);
  const [cpaKill, setCpaKill] = useState<number | "">("");
  const [cpaGood, setCpaGood] = useState<number | "">("");
  const [mode, setMode] = useState<"ad" | "product">("ad");

  const thresholds: Thresholds = {
    minSpend,
    minClicks,
    roasKill,
    roasScale,
    cpaKill: cpaKill === "" ? null : Number(cpaKill),
    cpaGood: cpaGood === "" ? null : Number(cpaGood),
  };

  const { inputRef, onPick, onFile } = useCSVImporter(setRows);

  const allChannels = useMemo(() => Array.from(new Set(rows.map((r) => r.channel))), [rows]);
  const allProducts = useMemo(() => Array.from(new Set(rows.map((r) => r.product))), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (channel !== "all" && r.channel !== channel) return false;
      if (product !== "all" && r.product !== product) return false;
      if (!q) return true;
      const hay = `${r.product} ${r.campaign} ${r.ad} ${r.channel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, channel, product]);

  const totals = useMemo(() => aggregate(filtered), [filtered]);

  // Grouping for table based on mode
  const grouped = useMemo(() => {
    const keyFn = (r: Row) => (mode === "ad" ? `${r.product} | ${r.ad}` : r.product);
    const groups = by(filtered, keyFn);
    const out = Array.from(groups.entries()).map(([k, arr]) => {
      const agg = aggregate(arr);
      const [prod, ad] = mode === "ad" ? k.split(" | ") : [k, ""];
      return {
        key: k,
        product: prod,
        ad: ad || undefined,
        channel: arr[0].channel,
        campaign: arr[0].campaign,
        rows: arr,
        ...agg,
        status: statusFor(agg, thresholds),
      };
    });
    // Sort by status -> spend desc
    const order = { Scale: 0, Optimize: 1, Kill: 2 } as Record<string, number>;
    return out.sort((a, b) => {
      const d = order[a.status] - order[b.status];
      if (d !== 0) return d;
      return b.spend - a.spend;
    });
  }, [filtered, thresholds, mode]);

  // Charts data
  const roasByProduct = useMemo(() => {
    const groups = by(filtered, (r) => r.product);
    return Array.from(groups.entries()).map(([product, arr]) => {
      const agg = aggregate(arr);
      return { product, roas: agg.roas ?? 0, spend: agg.spend };
    });
  }, [filtered]);

  const spendRevenueOverTime = useMemo(() => {
    const groups = by(filtered, (r) => r.date);
    return Array.from(groups.entries())
      .map(([date, arr]) => {
        const agg = aggregate(arr);
        return { date, spend: agg.spend, revenue: agg.revenue };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const roasVsCpa = useMemo(() => {
    return grouped.map((g) => ({
      name: mode === "ad" ? `${g.product}: ${g.ad}` : g.product,
      roas: g.roas ?? 0,
      cpa: g.cpa ?? 0,
      spend: g.spend,
    }));
  }, [grouped, mode]);

  function exportFilteredCSV() {
    const header = [
      "product",
      ...(mode === "ad" ? ["ad"] : []),
      "spend",
      "revenue",
      "roas",
      "clicks",
      "leads",
      "checkouts",
      "purchases",
      "cpc",
      "cpl",
      "cpa",
      "cpcb",
      "status",
    ];
    const rowsCsv = grouped.map((g) => [
      g.product,
      ...(mode === "ad" ? [g.ad ?? ""] : []),
      g.spend,
      g.revenue,
      g.roas ?? "",
      g.clicks,
      g.leads,
      g.checkouts,
      g.purchases,
      g.cpc ?? "",
      g.cpl ?? "",
      g.cpa ?? "",
      g.cpcb ?? "",
      g.status,
    ]);
    const csv = Papa.unparse([header, ...rowsCsv]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viral-ad-media-${mode}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const header = [
      "date",
      "channel",
      "campaign",
      "product",
      "ad",
      "impressions",
      "clicks",
      "leads",
      "checkouts",
      "purchases",
      "ad_spend",
      "revenue",
    ];
    const csv = Papa.unparse([header]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viral-ad-media-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function StatusBadge({ s }: { s: ReturnType<typeof statusFor> }) {
    const styles: Record<string, string> = {
      Scale: "bg-emerald-500/15 text-emerald-600 border-emerald-400/40",
      Optimize: "bg-amber-500/15 text-amber-600 border-amber-400/40",
      Kill: "bg-rose-500/15 text-rose-600 border-rose-400/40",
    };
    const Icon = s === "Scale" ? Rocket : s === "Kill" ? Trash2 : Settings2;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[s]}`}>
        <Icon className="h-3.5 w-3.5" /> {s}
      </span>
    );
  }

  function KPI({ title, value, sub, trend }: { title: string; value: string; sub?: string; trend?: "up" | "down" }) {
    const Trend = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;
    return (
      <Card className="rounded-2xl shadow-sm border-2 border-white/40 bg-white/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end gap-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">{value}</div>
            {Trend && (
              <span className={`inline-flex items-center gap-1 text-xs ${trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>
                <Trend className="h-3.5 w-3.5" /> {sub}
              </span>
            )}
            {!Trend && sub && <span className="text-xs text-slate-500">{sub}</span>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-violet-50 to-cyan-50 p-4 sm:p-6 md:p-8">
      <GradientHeader />

      {/* Controls */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product, campaign, ad…" className="pl-8" />
              </div>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {allChannels.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Product" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {allProducts.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Min Spend</span>
                <div className="w-40"><Slider value={[minSpend]} min={0} max={5000} step={50} onValueChange={(v) => setMinSpend(v[0])} /></div>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">{formatCurrency(minSpend)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Min Clicks</span>
                <div className="w-40"><Slider value={[minClicks]} min={0} max={2000} step={10} onValueChange={(v) => setMinClicks(v[0])} /></div>
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">{fmt(minClicks, 0)}</Badge>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-auto">
                <Button onClick={onPick} variant="secondary" className="gap-2"><Upload className="h-4 w-4" />Import CSV</Button>
                <Button onClick={downloadTemplate} variant="outline" className="gap-2"><Download className="h-4 w-4" />Template</Button>
                <Button onClick={exportFilteredCSV} className="gap-2"><Download className="h-4 w-4" />Export</Button>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-600"><Settings2 className="h-4 w-4" />
              <span className="text-sm font-medium">Decision Thresholds</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">ROAS – Kill below</label>
                <Input type="number" step="0.1" value={roasKill} onChange={(e) => setRoasKill(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">ROAS – Scale at/above</label>
                <Input type="number" step="0.1" value={roasScale} onChange={(e) => setRoasScale(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">CPA – Kill above (optional)</label>
                <Input type="number" step="0.01" value={cpaKill} onChange={(e) => setCpaKill(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">CPA – Scale at/below (optional)</label>
                <Input type="number" step="0.01" value={cpaGood} onChange={(e) => setCpaGood(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-600"><Filter className="h-4 w-4" /><span className="text-sm font-medium">Group By</span></div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="ad">Ad (Creative)</TabsTrigger>
                <TabsTrigger value="product">Product / Funnel</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-slate-500 mt-2">Use <span className="font-semibold">Ad</span> to spot winning/losing creatives; <span className="font-semibold">Product</span> for funnel-level decisions.</p>
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
        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">ROAS by Product</CardTitle></CardHeader>
          <CardContent className="pt-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roasByProduct}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product" hide={false} tick={{ fontSize: 11 }} angle={-15} height={50} interval={0} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${v.toFixed(1)}x`} />
                <Tooltip formatter={(val: any, name: string) => (name === "roas" ? `${Number(val).toFixed(2)}x` : formatCurrency(Number(val)))} />
                <Legend />
                <Bar dataKey="roas" yAxisId="left" name="ROAS" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><LineChartIcon className="h-4 w-4" /> Spend vs Revenue (by Date)</CardTitle>
            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Trend</Badge>
          </CardHeader>
          <CardContent className="pt-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendRevenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="spend" yAxisId="left" name="Ad Spend" radius={[6, 6, 0, 0]} />
                <Bar dataKey="revenue" yAxisId="left" name="Revenue" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur lg:col-span-3">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">ROAS vs CPA (bubble size = Spend)</CardTitle></CardHeader>
          <CardContent className="pt-0 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="roas" name="ROAS" tickFormatter={(v) => `${v.toFixed(1)}x`} />
                <YAxis type="number" dataKey="cpa" name="CPA" tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: any, n: string, p: any) => (n === "roas" ? `${Number(v).toFixed(2)}x` : formatCurrency(Number(v)))} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={roasVsCpa} name={mode === "ad" ? "Ads" : "Products"} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-2 border-white/40 bg-white/90 backdrop-blur">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">{mode === "ad" ? "Ad-Level Performance" : "Product/Funnel Performance"}</CardTitle>
          <div className="md:hidden flex items-center gap-2">
            <Button onClick={onPick} variant="secondary" className="gap-2"><Upload className="h-4 w-4" />Import CSV</Button>
            <Button onClick={downloadTemplate} variant="outline" className="gap-2"><Download className="h-4 w-4" />Template</Button>
            <Button onClick={exportFilteredCSV} className="gap-2"><Download className="h-4 w-4" />Export</Button>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
          </div>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Product</th>
                {mode === "ad" && <th className="py-2 pr-4">Ad</th>}
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
              {grouped.map((g, i) => (
                <tr key={g.key + i} className="border-b hover:bg-gradient-to-r hover:from-fuchsia-50/60 hover:to-cyan-50/60">
                  <td className="py-2 pr-4"><StatusBadge s={g.status} /></td>
                  <td className="py-2 pr-4">
                    <div className="font-semibold text-slate-800">{g.product}</div>
                    {mode === "ad" && (
                      <div className="text-[11px] text-slate-500">{g.campaign} • {g.rows[0]?.channel}</div>
                    )}
                  </td>
                  {mode === "ad" && <td className="py-2 pr-4 text-slate-700">{g.ad}</td>}
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
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-slate-500">No rows match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Footer helper */}
      <div className="mt-8 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" />
          <span>
            <span className="font-semibold">CPC</span> = Spend / Clicks; <span className="font-semibold">CPL</span> = Spend / Leads; <span className="font-semibold">CPA</span> = Spend / Purchases; <span className="font-semibold">CPCB</span> = Spend / Checkouts; <span className="font-semibold">ROAS</span> = Revenue / Spend.
          </span>
        </div>
        <div className="opacity-80">© {new Date().getFullYear()} Viral Ad Media, LLC</div>
      </div>
    </div>
  );
}
