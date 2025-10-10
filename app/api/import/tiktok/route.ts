// app/api/import/tiktok/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

type Row = {
  date: string;
  channel: "TikTok";
  campaign: string;
  product: string;
  ad: string;
  adset: string | null;           // <— NEW (TikTok "Ad group")
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

function n(x: unknown): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function shape(rec: any): Row {
  const date =
    String(rec.date ?? rec.stat_time_day ?? rec.report_date ?? "");
  const campaign =
    String(rec.campaign_name ?? rec.campaign?.name ?? "(no campaign)");
  const adset =
    String(rec.adgroup_name ?? rec.ad_group_name ?? rec.adgroup?.name ?? "") ||
    null;
  const ad =
    String(rec.ad_name ?? rec.creative_name ?? rec.ad?.name ?? "") ||
    "(no ad)";

  const impressions = n(rec.impressions ?? rec.show_cnt);
  const clicks = n(rec.clicks ?? rec.click_cnt);
  const spend = n(rec.spend ?? rec.spend_sum);
  const leads = n(rec.leads ?? rec.lead_cnt);
  const checkouts = n(rec.checkouts ?? rec.checkout_start_cnt);
  const purchases = n(rec.purchases ?? rec.purchase_cnt ?? rec.complete_payment_cnt);
  const revenue = n(rec.revenue ?? rec.purchase_value ?? rec.complete_payment_amount);

  const account_id = String(rec.advertiser_id ?? "") || null;
  const account_name = String(rec.advertiser_name ?? "") || null;

  const product = String(rec.product ?? campaign);

  return {
    date,
    channel: "TikTok",
    campaign,
    product,
    ad,
    adset,                           // <— set adset
    impressions,
    clicks,
    leads,
    checkouts,
    purchases,
    ad_spend: spend,
    revenue,
    account_id,
    account_name,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const datePreset = searchParams.get("date_preset") || "last_30d";
    const _level = searchParams.get("level") || "ad";

    // Replace with your real TikTok fetch. Keep resilient behavior.
    const upstream = await fetch(
      `${process.env.TIKTOK_PROXY_URL ?? ""}?${new URLSearchParams({
        from: from ?? "",
        to: to ?? "",
        date_preset: datePreset,
        level: _level,
      }).toString()}`,
      { next: { revalidate: 0 } }
    ).catch(() => null);

    if (!upstream || !upstream.ok) {
      return NextResponse.json([]);
    }

    const json = (await upstream.json()) as unknown;
    const list = Array.isArray(json) ? json : (json as any)?.data ?? [];
    const rows: Row[] = (list as any[]).map(shape);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: `TikTok import error: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
