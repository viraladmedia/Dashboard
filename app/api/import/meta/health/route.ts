/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/api/import/meta/health/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID; // digits-only
  if (!token || !accountId) {
    return NextResponse.json({ ok: false, error: "Missing META credentials" }, { status: 400 });
  }
  const url = `https://graph.facebook.com/v19.0/act_${accountId}?fields=name,account_status&access_token=${encodeURIComponent(
    token
  )}`;
  const res = await fetch(url);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return NextResponse.json({ ok: res.ok, status: res.status, data: json });
}
