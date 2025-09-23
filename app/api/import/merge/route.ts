import { NextRequest, NextResponse } from "next/server";
import { Row } from "@/lib/row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || searchParams.get("date_from") || "";
  const to = searchParams.get("to") || searchParams.get("date_to") || "";
  const level = (searchParams.get("level") || "ad").toLowerCase();
  const format = (searchParams.get("format") || "json").toLowerCase();

  const origin = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const base = `${proto}://${origin}`;
  const qs = new URLSearchParams({ from, to, level });

  const tasks: Promise<Response>[] = [];
  if (process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID) {
    tasks.push(fetch(`${base}/api/import/meta?${qs}`));
  }
  if (process.env.GOOGLE_DEVELOPER_TOKEN) {
    tasks.push(fetch(`${base}/api/import/google?${qs}`));
  }
  if (process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID) {
    tasks.push(fetch(`${base}/api/import/tiktok?${qs}`));
  }

  const results = await Promise.allSettled(tasks);

  const rows: Row[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.ok) {
      const part = (await r.value.json()) as Row[];
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
