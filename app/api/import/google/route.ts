// app/api/import/google/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

/**
 * Expected unified Row shape for dashboard
 */
type Row = {
  date: string;
  channel: "Google";
  campaign: string;
  product: string;
  ad: string;
  adset: string | null;            // <— NEW (Google "Ad group")
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

/**
 * If you are using the official google-ads-api client, your handler
 * probably already builds a GAQL query. Make sure it selects:
 *  segments.date, customer.id, customer.descriptive_name,
 *  campaign.name, ad_group.name, ad_group_ad.ad.name,
 *  metrics.impressions, metrics.clicks, metrics.cost_micros,
 *  metrics.conversions, metrics.all_conversions_value, etc.
 *
 * Below we shape generic JSON "rows" into the unified Row.
 */
function toNumber(x: unknown): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function shape(record: any): Row {
  // Handle common Google Ads field paths
  const date =
    String(record.date ?? record["segments.date"] ?? record.segments?.date ?? "");
  const campaign =
    String(record.campaign?.name ?? record["campaign.name"] ?? record.campaign_name ?? "(no campaign)");
  const adgroupName =
    String(record.ad_group?.name ?? record["ad_group.name"] ?? record.ad_group_name ?? "") || null;
  const adName =
    String(
      record.ad?.name ??
        record["ad_group_ad.ad.name"] ??
        record.ad_name ??
        record.headline ??
        ""
    ) || "(no ad)";

  const impressions = toNumber(
    record.impressions ??
      record["metrics.impressions"] ??
      record.metrics?.impressions
  );
  const clicks = toNumber(
    record.clicks ?? record["metrics.clicks"] ?? record.metrics?.clicks
  );
  const spendMicros =
    toNumber(
      record.cost_micros ??
        record["metrics.cost_micros"] ??
        record.metrics?.cost_micros
    ) || 0;
  const spend = spendMicros / 1_000_000;

  // You can adapt these depending on your conversion schema
  const leads = toNumber(record.leads ?? record.metrics?.conversions_from_interactions_rate_lead ?? 0);
  const checkouts = toNumber(record.checkouts ?? 0);
  const purchases =
    toNumber(record.purchases ?? record["metrics.conversions"] ?? record.metrics?.conversions ?? 0);
  const revenue =
    toNumber(record.revenue ?? record["metrics.all_conversions_value"] ?? record.metrics?.all_conversions_value ?? 0);

  const customerId = String(
    record.customer?.id ?? record["customer.id"] ?? record.customer_id ?? ""
  ) || null;
  const customerName = String(
    record.customer?.descriptive_name ??
      record["customer.descriptive_name"] ??
      record.account_name ??
      ""
  ) || null;

  const product =
    String(record.product ?? record.campaign?.name ?? "(no campaign)");

  return {
    date,
    channel: "Google",
    campaign,
    product,
    ad: adName,
    adset: adgroupName,               // <— map Ad group to adset
    impressions,
    clicks,
    leads,
    checkouts,
    purchases,
    ad_spend: spend,
    revenue,
    account_id: customerId,
    account_name: customerName,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Pass-through dates/level if your backend needs them
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const datePreset = searchParams.get("date_preset") || "last_30d";
    const _level = searchParams.get("level") || "ad";

    // Replace this block with your actual Google Ads fetch.
    // For now, we gracefully handle an empty upstream.
    const upstream = await fetch(
      `${process.env.GOOGLE_PROXY_URL ?? ""}?${new URLSearchParams({
        from: from ?? "",
        to: to ?? "",
        date_preset: datePreset,
        level: _level,
      }).toString()}`,
      { next: { revalidate: 0 } }
    ).catch(() => null);

    if (!upstream || !upstream.ok) {
      // No data; return empty list (merge route is resilient)
      return NextResponse.json([]);
    }

    const json = (await upstream.json()) as unknown;
    const list = Array.isArray(json) ? json : (json as any)?.data ?? [];
    const rows: Row[] = (list as any[]).map(shape);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: `Google import error: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
