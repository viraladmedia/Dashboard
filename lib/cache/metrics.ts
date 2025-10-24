// File: lib/cache/metrics.ts
import type { Row } from "@/app/types/dashboard";
import { getServiceClient } from "@/lib/supabase/service";

export async function cacheRowsToDB(rows: Row[]) {
  if (!rows?.length) return;
  const supabase = getServiceClient();

  // Map incoming merged rows → ad_metrics columns
  const payload = rows.map((r) => ({
    date: r.date?.slice(0,10),
    channel: r.channel ?? "meta",
    level: r.level ?? "ad",
    account_id: (r as any).account_id ?? (r as any).accountId ?? undefined,
    account_name: r.account_name ?? (r as any).account ?? undefined,
    campaign_id: (r as any).campaign_id ?? undefined,
    campaign: r.campaign ?? undefined,
    adset_id: (r as any).adset_id ?? undefined,
    adset: r.adset ?? undefined,
    ad_id: (r as any).ad_id ?? undefined,
    ad: r.ad ?? undefined,
    product: r.product ?? undefined,
    impressions: Number(r.impressions || 0),
    clicks: Number(r.clicks || 0),
    leads: Number(r.leads || 0),
    checkouts: Number(r.checkouts || 0),
    purchases: Number(r.purchases || 0),
    ad_spend: Number((r as any).ad_spend ?? (r as any).spend ?? 0),
    revenue: Number(r.revenue || 0),
  }));

  // Simple insert (duplicates are acceptable since we use time-based slices).
  // You can replace with a "upsert on unique key" if you add a unique composite index.
  await supabase.from("ad_metrics").insert(payload, { count: "exact" });
}

export type QueryParams = {
  level: "ad" | "adset" | "campaign";
  channel?: "meta" | "tiktok" | "google";
  account?: string;
  from?: string;
  to?: string;
  date_preset?: string;
};

export async function readRowsFromDB(params: QueryParams) {
  const supabase = getServiceClient();

  let q = supabase.from("ad_metrics").select("*");

  q = q.eq("level", params.level);
  if (params.channel && params.channel !== "all") q = q.eq("channel", params.channel);
  if (params.account && params.account !== "all") q = q.eq("account_id", params.account);

  // date ranges
  if (params.from && params.to) {
    q = q.gte("date", params.from).lte("date", params.to);
  } else if (params.date_preset) {
    const now = new Date();
    const to = now.toISOString().slice(0,10);
    const from = (() => {
      const d = new Date(now);
      const map: Record<string, number> = {
        last_24h: 1, last_48h: 2, last_7d: 7, last_30d: 30, last_60d: 60, last_90d: 90,
      };
      d.setDate(d.getDate() - (map[params.date_preset] ?? 7));
      return d.toISOString().slice(0,10);
    })();
    q = q.gte("date", from).lte("date", to);
  }

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  // Map back to your Row type minimally
  const rows = (data ?? []).map((r: any) => ({
    date: r.date,
    channel: r.channel,
    level: r.level,
    account_name: r.account_name,
    campaign: r.campaign,
    adset: r.adset,
    ad: r.ad,
    product: r.product,
    impressions: r.impressions,
    clicks: r.clicks,
    leads: r.leads,
    checkouts: r.checkouts,
    purchases: r.purchases,
    revenue: r.revenue,
    ad_spend: r.ad_spend,
  })) as Row[];

  return rows;
}
