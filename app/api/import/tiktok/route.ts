// File: app/api/import/tiktok/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Row, emptyRow } from "@/lib/row";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || searchParams.get("date_from");
  const to = searchParams.get("to") || searchParams.get("date_to");
  const level = (searchParams.get("level") || "ad").toLowerCase(); // ad | campaign | ad_group
  const format = (searchParams.get("format") || "json").toLowerCase();

  const token = process.env.TIKTOK_ACCESS_TOKEN!;
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID!;
  if (!token || !advertiserId) {
    return NextResponse.json({ error: "TikTok credentials missing" }, { status: 400 });
  }

  // TikTok Marketing API v1.3 integrated report
  const body = {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: level.toUpperCase(),
    dimensions: ["stat_time_day", level === "ad" ? "ad_name" : level === "campaign" ? "campaign_name" : "adgroup_name", "campaign_name"],
    metrics: ["impressions","clicks","spend","conversion","purchase","purchase_value","lead","checkout"],
    start_date: from,
    end_date: to,
    time_granularity: "DAILY",
    page_size: 1000,
    page: 1,
  };

  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/reports/integrated/get/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `TikTok API error: ${text}` }, { status: 500 });
  }

  const json = await res.json() as any;
  const list: any[] = json.data?.list || [];

  const rows: Row[] = list.map((d: any) => {
    const date = d.stat_time_day;
    const campaign = d.campaign_name || "";
    const ad = d.ad_name || d.adgroup_name || "";
    const impressions = Number(d.impressions || 0);
    const clicks = Number(d.clicks || 0);
    const spend = Number(d.spend || 0);
    const purchases = Number(d.purchase || 0);
    const leads = Number(d.lead || 0);
    const checkouts = Number(d.checkout || 0);
    const revenue = Number(d.purchase_value || 0);
    const product = campaign.split(" – ")[0] || campaign;

    return emptyRow({
      date,
      channel: "TikTok",
      campaign,
      product,
      ad,
      impressions,
      clicks,
      leads,
      checkouts,
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
}
