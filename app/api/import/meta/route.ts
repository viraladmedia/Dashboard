// File: app/api/import/meta/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Row, emptyRow } from "@/lib/row";


function pickAction(actions: any[] | undefined, type: string): number {
if (!actions) return 0;
const f = actions.find(a => a.action_type === type);
if (!f) return 0;
const v = Number(f.value || f.action_value || 0);
return Number.isFinite(v) ? v : 0;
}


function pickActionValue(values: any[] | undefined, type: string): number {
if (!values) return 0;
const f = values.find((a: any) => a.action_type === type);
if (!f) return 0;
const v = Number(f.value || 0);
return Number.isFinite(v) ? v : 0;
}


export async function GET(req: NextRequest) {
const { searchParams } = new URL(req.url);
const from = searchParams.get("from") || searchParams.get("date_from");
const to = searchParams.get("to") || searchParams.get("date_to");
const level = (searchParams.get("level") || "ad").toLowerCase(); // ad | campaign
const format = (searchParams.get("format") || "json").toLowerCase();


const token = process.env.META_ACCESS_TOKEN!;
const accountId = process.env.META_AD_ACCOUNT_ID!; // no act_
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


const params = new URLSearchParams({
time_range: JSON.stringify({ since: from, until: to }),
level,
fields,
time_increment: "1",
action_attribution_windows: "1d_click,7d_click,1d_view",
limit: "5000",
});


const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?${params.toString()}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
const text = await res.text();
return NextResponse.json({ error: `Meta API error: ${text}` }, { status: 500 });
}
const json = await res.json() as any;


const rows: Row[] = (json.data || []).map((d: any) => {
}