// File: lib/cache/metrics.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Row } from "@/app/types/dashboard";
import { getServiceClient } from "@/lib/supabase/service";

/** Columns we insert into ad_metrics */
type AdMetricsInsert = {
  date: string | null;
  channel: string | null;
  level: "ad" | "adset" | "campaign";
  account_id?: string | null;
  account_name?: string | null;
  campaign_id?: string | null;
  campaign?: string | null;
  adset_id?: string | null;
  adset?: string | null;
  ad_id?: string | null;
  ad?: string | null;
  product?: string | null;
  impressions?: number | null;
  clicks?: number | null;
  leads?: number | null;
  checkouts?: number | null;
  purchases?: number | null;
  ad_spend?: number | null;
  revenue?: number | null;
};

export async function cacheRowsToDB(rows: Row[]) {
  if (!rows?.length) return;
  const supabase = getServiceClient();

  const payload: AdMetricsInsert[] = rows.map((r) => {
    const any = r as any;
    const level: "ad" | "adset" | "campaign" =
      (any.level as "ad" | "adset" | "campaign") ?? "ad";

    return {
      date: r.date?.slice(0, 10) ?? null,
      channel: (r.channel as string) ?? "meta",
      level,
      account_id: any.account_id ?? any.accountId ?? null,
      account_name: r.account_name ?? any.account ?? null,
      campaign_id: any.campaign_id ?? null,
      campaign: r.campaign ?? null,
      adset_id: any.adset_id ?? null,
      adset: (r as any).adset ?? null,
      ad_id: any.ad_id ?? null,
      ad: r.ad ?? null,
      product: r.product ?? null,
      impressions: Number(r.impressions || 0),
      clicks: Number(r.clicks || 0),
      leads: Number(r.leads || 0),
      checkouts: Number(r.checkouts || 0),
      purchases: Number(r.purchases || 0),
      ad_spend: Number(any.ad_spend ?? any.spend ?? 0),
      revenue: Number(r.revenue || 0),
    };
  });

  // If you add a composite unique index later, switch to .upsert(payload, { onConflict: '...' })
  await supabase.from("ad_metrics").insert(payload, { count: "exact" });
}

export type QueryParams = {
  level: "ad" | "adset" | "campaign";
  channel?: "meta" | "tiktok" | "google" | "all";
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
    const to = now.toISOString().slice(0, 10);
    const from = (() => {
      const d = new Date(now);
      const map: Record<string, number> = {
        last_24h: 1,
        last_48h: 2,
        last_7d: 7,
        last_30d: 30,
        last_60d: 60,
        last_90d: 90,
      };
      d.setDate(d.getDate() - (map[params.date_preset] ?? 7));
      return d.toISOString().slice(0, 10);
    })();
    q = q.gte("date", from).lte("date", to);
  }

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  // Map only the Row-compatible fields back out
  const rows = (data ?? []).map((r: any) => {
    const out: Partial<Row> = {
      date: r.date,
      channel: r.channel,
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
    };
    return out as Row;
  });

  return rows;
}
