/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import type { Row } from "@/lib/row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

function envAccountList(): string[] {
  const a = (process.env.META_ACCOUNT_IDS || "").trim();
  const b = (process.env.NEXT_PUBLIC_META_ACCOUNT_IDS || "").trim();
  const source = a || b; // prefer server-only, otherwise public
  if (!source) return [];
  return source.split(",").map(s => s.trim().replace(/^act_/, "")).filter(Boolean);
}

async function discoverAccounts(base: string): Promise<string[]> {
  try {
    const res = await fetch(`${base}/api/import/meta?accounts=1`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    // [{ key: "<id>", label: "..." }]
    if (!Array.isArray(data)) return [];
    const ids = data.map((x: any) => (x?.key ? String(x.key) : "")).filter(Boolean);
    return ids;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const level = (searchParams.get("level") || "ad").toLowerCase(); // "ad" | "adset" | "campaign"
  const format = (searchParams.get("format") || "json").toLowerCase(); // "json" | "csv"
  const datePreset = searchParams.get("date_preset") || ""; // e.g., "last_30d"
  const includeDims = searchParams.get("include_dims") === "1";
  const account = searchParams.get("account") || ""; // optional single account
  const channel = (searchParams.get("channel") || "all").toLowerCase(); // "all" | "meta" | "google" | "tiktok"

  const base = getBaseUrl(req);

  // Build common QS
  const commonQS = new URLSearchParams({ level });
  if (includeDims) commonQS.set("include_dims", "1");
  if (from && to) {
    commonQS.set("from", from);
    commonQS.set("to", to);
  } else if (datePreset) {
    commonQS.set("date_preset", datePreset);
  } else {
    commonQS.set("date_preset", "last_30d"); // default
  }

  const rows: Row[] = [];
  const requests: Promise<Response>[] = [];

  // -------- META --------
  const wantMeta = channel === "all" || channel === "meta";
  if (wantMeta) {
    if (account) {
      const qs = new URLSearchParams(commonQS);
      qs.set("account", account.replace(/^act_/, ""));
      requests.push(fetch(`${base}/api/import/meta?${qs.toString()}`, { cache: "no-store" }));
    } else {
      // fan out to many accounts when "All Accounts"
      let accounts = envAccountList();
      if (!accounts.length) {
        accounts = await discoverAccounts(base);
      }
      // If still none, we’ll try a single call (it will rely on META_AD_ACCOUNT_ID if set)
      if (!accounts.length) {
        requests.push(fetch(`${base}/api/import/meta?${commonQS.toString()}`, { cache: "no-store" }));
      } else {
        for (const acc of accounts) {
          const qs = new URLSearchParams(commonQS);
          qs.set("account", acc);
          requests.push(fetch(`${base}/api/import/meta?${qs.toString()}`, { cache: "no-store" }));
        }
      }
    }
  }

  // -------- GOOGLE --------
  const wantGoogle = channel === "all" || channel === "google";
  if (wantGoogle) {
    requests.push(fetch(`${base}/api/import/google?${commonQS.toString()}`, { cache: "no-store" }));
  }

  // -------- TIKTOK --------
  const wantTiktok = channel === "all" || channel === "tiktok";
  if (wantTiktok) {
    requests.push(fetch(`${base}/api/import/tiktok?${commonQS.toString()}`, { cache: "no-store" }));
  }

  // Fan-in + tolerate partial failures
  const outcomes = await Promise.allSettled(requests);
  for (const o of outcomes) {
    if (o.status === "fulfilled" && o.value.ok) {
      try {
        const part = (await o.value.json()) as Row[];
        if (Array.isArray(part)) rows.push(...part);
      } catch {
        // ignore parse errors
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
