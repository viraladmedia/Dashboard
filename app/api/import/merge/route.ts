// File: app/api/import/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Row } from "@/lib/row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const level = (searchParams.get("level") || "ad").toLowerCase(); // "ad" | "campaign"
  const format = (searchParams.get("format") || "json").toLowerCase(); // "json" | "csv"
  const datePreset = searchParams.get("date_preset") || ""; // e.g., "last_30d"

  const base = getBaseUrl(req);

  // Build downstream query string
  const qs = new URLSearchParams({ level });
  if (from && to) {
    qs.set("from", from);
    qs.set("to", to);
  } else if (datePreset) {
    qs.set("date_preset", datePreset);
  } else {
    // Sensible default if nothing provided
    qs.set("date_preset", "last_30d");
  }

  // Fan out to enabled sources only
  const requests: Promise<Response>[] = [];
  if (process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID) {
    requests.push(fetch(`${base}/api/import/meta?${qs.toString()}`));
  }
  if (process.env.GOOGLE_DEVELOPER_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CUSTOMER_ID) {
    requests.push(fetch(`${base}/api/import/google?${qs.toString()}`));
  }
  if (process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID) {
    requests.push(fetch(`${base}/api/import/tiktok?${qs.toString()}`));
  }

  const outcomes = await Promise.allSettled(requests);

  const rows: Row[] = [];
  for (const o of outcomes) {
    if (o.status === "fulfilled" && o.value.ok) {
      try {
        const part = (await o.value.json()) as Row[];
        if (Array.isArray(part)) rows.push(...part);
      } catch {
        // ignore non-JSON responses
      }
    }
  }

  if (format === "csv") {
    const { rowsToCSV } = await import("@/lib/csv");
    const csv = rowsToCSV(rows);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv" } });
  }

  return NextResponse.json(rows);
}
