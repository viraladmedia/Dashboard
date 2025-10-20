// File: lib/metrics.ts
import type { Row } from "@/app/types/dashboard";

export function safeDiv(n: number, d: number) { return !d ? null : n / d; }
export function currency(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
export function fmt(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return "–";
  const fixed = Number(n.toFixed(digits));
  return fixed.toLocaleString();
}

export function groupBy<T>(rows: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

export function aggregate(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + r.ad_spend, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  const checkouts = rows.reduce((s, r) => s + r.checkouts, 0);
  const purchases = rows.reduce((s, r) => s + r.purchases, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  return {
    spend, revenue, clicks, leads, checkouts, purchases, impressions,
    cpc: safeDiv(spend, clicks),
    cpl: safeDiv(spend, leads),
    cpa: safeDiv(spend, purchases),
    cpcb: safeDiv(spend, checkouts),
    roas: safeDiv(revenue, spend),
  };
}

export type Thresholds = {
  minSpend: number; minClicks: number; roasKill: number; roasScale: number;
  cpaKill: number | null; cpaGood: number | null;
};

export function statusFor(agg: ReturnType<typeof aggregate>, cfg: Thresholds) {
  const { minSpend, minClicks, roasKill, roasScale, cpaKill, cpaGood } = cfg;
  const meetsVolume = agg.spend >= minSpend && agg.clicks >= minClicks;
  if (meetsVolume && ((agg.roas != null && agg.roas < roasKill) || (cpaKill != null && agg.cpa != null && agg.cpa > cpaKill))) return "Kill" as const;
  if ((agg.roas != null && agg.roas >= roasScale) || (cpaGood != null && agg.cpa != null && agg.cpa <= cpaGood)) return "Scale" as const;
  return "Optimize" as const;
}
