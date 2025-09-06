// File: app/api/import/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Row } from "@/lib/row";


export async function GET(req: NextRequest) {
const { searchParams } = new URL(req.url);
const from = searchParams.get("from") || searchParams.get("date_from");
const to = searchParams.get("to") || searchParams.get("date_to");
const level = (searchParams.get("level") || "ad").toLowerCase();
const format = (searchParams.get("format") || "json").toLowerCase();


const qs = new URLSearchParams({ from: from || "", to: to || "", level });
const sources = [
process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID ? fetch(`/api/import/meta?${qs}`) : null,
process.env.GOOGLE_DEVELOPER_TOKEN ? fetch(`/api/import/google?${qs}`) : null,
process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID ? fetch(`/api/import/tiktok?${qs}`) : null,
].filter(Boolean) as Promise<Response>[];


// In Next.js API routes, relative fetches need absolute URL; if this fails in your setup,
// replace with full origin or call the handlers directly.
const origin = req.headers.get("x-forwarded-host") || req.headers.get("host");
const proto = req.headers.get("x-forwarded-proto") || "https";
const base = `${proto}://${origin}`;


const toAbs = (p: string) => (p.startsWith("http") ? p : base + p);


const tasks = [
process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID ? fetch(toAbs(`/api/import/meta?${qs}`)) : null,
process.env.GOOGLE_DEVELOPER_TOKEN ? fetch(toAbs(`/api/import/google?${qs}`)) : null,
process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID ? fetch(toAbs(`/api/import/tiktok?${qs}`)) : null,
].filter(Boolean) as Promise<Response>[];


const results = await Promise.all(tasks.map(p => p.catch(e => e)));


const rows: Row[] = [];
for (const res of results) {
if (res instanceof Response && res.ok) {
const part = await res.json();
rows.push(...part);
}
}


if (format === "csv") {
const { rowsToCSV } = await import("@/lib/csv");
const csv = rowsToCSV(rows);
return new NextResponse(csv, { headers: { "Content-Type": "text/csv" } });
}
return NextResponse.json(rows);
}


// ────────────────────────────────────────────────────────────────────────────────
// OPTIONAL: Client-side snippet to add a "Sync" button inside your dashboard page
// Paste into your dashboard component and call handleSync(from, to, level)
//
// async function handleSync(from: string, to: string, level: "ad"|"campaign"="ad") {
// const params = new URLSearchParams({ from, to, level });
// const res = await fetch(`/api/import/merge?${params}`);
// const data: Row[] = await res.json();
// setRows(data);
// }
//
// <Button onClick={() => handleSync("2025-08-01","2025-08-16","ad")} className="gap-2">
// <Upload className="h-4 w-4"/> Sync from APIs
// </Button>