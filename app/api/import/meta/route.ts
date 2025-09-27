/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/api/import/meta/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Row, emptyRow } from "@/lib/row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickAction(actions: any[] | undefined, type: string): number {
  if (!actions) return 0;
  const f = actions.find((a) => a.action_type === type);
  const v = Number(f?.value ?? f?.action_value ?? 0);
  return Number.isFinite(v) ? v : 0;
}
function pickActionValue(values: any[] | undefined, type: string): number {
  if (!values) return 0;
  const f = values.find((a: any) => a.action_type === type);
  const v = Number(f?.value ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const level = (searchParams.get("level") || "ad").toLowerCase(); // ad | campaign
  const format = (searchParams.get("format") || "json").toLowerCase();

  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID; // digits only
  if (!token || !accountId) {
    return NextResponse.json({ error: "Meta credentials missing" }, { status: 400 });
  }

  const fields = [
    "date_start,date_stop",
    level === "ad" ? "ad_name" : "campaign_name",
    "campaign_name",
    "impressions,clicks,spend",
    "actions,action_values",
  ].join(",");

  const base = `https://graph.facebook.com/v19.0/act_${accountId}/insights`;
  const params = new URLSearchParams({
    fields,
    level,
    time_increment: "1",
    action_attribution_windows: "1d_click,7d_click,1d_view",
    limit: "5000",
  });

  // Prefer explicit time_range; fall back to preset if not supplied
  if (from && to) {
    params.set("time_range", JSON.stringify({ since: from, until: to }));
  } else {
    params.set("date_preset", "last_30d");
  }

  const url = `${base}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  // Try to read the raw text to capture error detail
  const raw = await res.text();
  if (!res.ok) {
    let err: any;
    try { err = JSON.parse(raw); } catch { err = { raw }; }
    return NextResponse.json({ error: "Meta API error", meta: err }, { status: 502 });
  }

  let json: any;
  try { json = JSON.parse(raw); } catch { json = { data: [] }; }

  const rows: Row[] = (json.data || []).map((d: any) => {
    const date = d.date_start;
    const campaign = d.campaign_name || "";
    const ad = d.ad_name || "";
    const clicks = Number(d.clicks || 0);
    const spend = Number(d.spend || 0);
    const impressions = Number(d.impressions || 0);
    const leads = pickAction(d.actions, "lead");
    const checkouts = pickAction(d.actions, "initiate_checkout");
    const purchases = pickAction(d.actions, "purchase");
    const revenue = pickActionValue(d.action_values, "purchase");
    const product = campaign.split(" - ")[0] || campaign;

    return emptyRow({
      date,
      channel: "Meta",
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