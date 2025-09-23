// File: app/api/import/google/route.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { Row, emptyRow } from "@/lib/row";
import { GoogleAdsApi } from "google-ads-api";

// google-ads-api requires Node runtime (not Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal shape for a GAQL row we use
type GoogleAdsQueryRow = {
  segments?: { date?: string };
  campaign?: { name?: string };
  entity_name?: string;
  metrics?: {
    impressions?: string | number;
    clicks?: string | number;
    cost_micros?: string | number;
    conversions?: string | number;
    conversions_value?: string | number;
  };
};

function asNumber(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    const level = (searchParams.get("level") || "ad").toLowerCase(); // ad | campaign | ad_group
    const format = (searchParams.get("format") || "json").toLowerCase();

    const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const customerId = process.env.GOOGLE_CUSTOMER_ID;
    const loginCustomerId = process.env.GOOGLE_LOGIN_CUSTOMER_ID || undefined;

    if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
      return NextResponse.json({ error: "Google Ads credentials missing" }, { status: 400 });
    }

    const client = new GoogleAdsApi({
      developer_token: developerToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const customer = client.Customer({
      customer_account_id: customerId,
      login_customer_id: loginCustomerId,
      refresh_token: refreshToken,
    });

    const selectName =
      level === "ad"
        ? "ad_group_ad.ad.name"
        : level === "campaign"
        ? "campaign.name"
        : "ad_group.name";

    const query = [
      "SELECT",
      "  segments.date,",
      "  campaign.name,",
      "  " + selectName + " AS entity_name,",
      "  metrics.impressions,",
      "  metrics.clicks,",
      "  metrics.cost_micros,",
      "  metrics.conversions,",
      "  metrics.conversions_value",
      "FROM ad_group_ad",
      "WHERE segments.date BETWEEN '" + from + "' AND '" + to + "'",
    ].join("\n");

    const resp = (await customer.query(query)) as unknown as GoogleAdsQueryRow[];

    const rows: Row[] = resp.map((r) => {
      const date = r.segments?.date ?? "";
      const campaign = r.campaign?.name ?? "";
      const ad = r.entity_name ?? "";
      const impressions = asNumber(r.metrics?.impressions);
      const clicks = asNumber(r.metrics?.clicks);
      const spend = asNumber(r.metrics?.cost_micros) / 1_000_000; // micros → currency
      const purchases = asNumber(r.metrics?.conversions);
      const revenue = asNumber(r.metrics?.conversions_value);
      const product = (campaign.split(" - ")[0] || campaign).trim();

      return emptyRow({
        date,
        channel: "Google",
        campaign,
        product,
        ad,
        impressions,
        clicks,
        purchases,
        ad_spend: spend,
        revenue,
      });
    });

    if (format === "csv") {
      const { rowsToCSV } = await import("@/lib/csv");
      const csv = rowsToCSV(rows);
      return new NextResponse(csv, { headers: { "Content-Type": "text/csv" } });
    }

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
