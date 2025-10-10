/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/import/meta/route.ts
import { NextRequest, NextResponse } from "next/server";

type Action = {
  action_type: string;
  value?: string;
};

type Insight = {
  date_start: string;
  account_id: string;
  account_name: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Action[];
  action_values?: Action[];
};

type MetaResponse = {
  data: Insight[];
};

type Row = {
  date: string;               // YYYY-MM-DD
  channel: "Meta";
  campaign: string;
  product: string;
  ad: string;
  adset: string | null;       // <— NEW
  impressions: number;
  clicks: number;
  leads: number;
  checkouts: number;
  purchases: number;
  ad_spend: number;
  revenue: number;
  account_id: string;
  account_name: string;
};

function num(x: string | undefined): number {
  if (!x) return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function getEnvJSON(name: string): Record<string, string> | null {
  const raw = process.env[name];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
  } catch {
    // ignore
  }
  return null;
}

function getEnvCSV(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function resolveAccounts(accountParam?: string | null): Array<{ id: string; label: string }> {
  const map = getEnvJSON("META_ACCOUNT_MAP");
  if (map && Object.keys(map).length > 0) {
    if (accountParam && accountParam !== "all") {
      if (map[accountParam]) return [{ id: map[accountParam], label: accountParam }];
      for (const [label, id] of Object.entries(map)) if (id === accountParam) return [{ id, label }];
      return [{ id: accountParam, label: accountParam }];
    }
    return Object.entries(map).map(([label, id]) => ({ id, label }));
  }
  const ids = getEnvCSV("META_ACCOUNT_IDS");
  if (ids.length > 0) {
    if (accountParam && accountParam !== "all") {
      if (ids.includes(accountParam)) return [{ id: accountParam, label: accountParam }];
      return [{ id: accountParam, label: accountParam }];
    }
    return ids.map((id) => ({ id, label: id }));
  }
  return [];
}

function toRow(i: Insight): Row {
  const clicks = num(i.clicks);
  const spend = num(i.spend);

  const actions = i.actions ?? [];
  const actionValues = i.action_values ?? [];

  const sumByType = (type: string): number =>
    actions
      .filter((a) => a.action_type === type)
      .reduce((acc, a) => acc + (a.value ? Number(a.value) || 0 : 0), 0);

  const sumValueByType = (type: string): number =>
    actionValues
      .filter((a) => a.action_type === type)
      .reduce((acc, a) => acc + (a.value ? Number(a.value) || 0 : 0), 0);

  const leads = sumByType("lead") + sumByType("omni_lead");
  const checkouts =
    sumByType("checkout_initiated") +
    sumByType("omni_checkout_initiated") +
    sumByType("initiate_checkout");
  const purchases = sumByType("purchase") + sumByType("omni_purchase");
  const revenue = sumValueByType("purchase") + sumValueByType("omni_purchase");

  return {
    date: i.date_start,
    channel: "Meta",
    campaign: i.campaign_name || "(no campaign)",
    product: i.campaign_name || "(no campaign)",
    ad: i.ad_name || "(no ad)",
    adset: i.adset_name || null,           // <— NEW
    impressions: num(i.impressions),
    clicks,
    leads,
    checkouts,
    purchases,
    ad_spend: spend,
    revenue,
    account_id: i.account_id,
    account_name: i.account_name,
  };
}

async function fetchInsightsForAccount(args: {
  accountId: string;
  accessToken: string;
  apiVersion: string;
  level: "ad" | "campaign";
  from?: string | null;
  to?: string | null;
  datePreset?: string | null;
}): Promise<Row[]> {
  const { accountId, accessToken, apiVersion, level, from, to, datePreset } = args;

  const base = `https://graph.facebook.com/${apiVersion}/act_${accountId}/insights`;
  const params = new URLSearchParams({
    level,
    time_increment: "1",
    fields: [
      "date_start",
      "account_id",
      "account_name",
      "campaign_name",
      "adset_name",           // <— include adset_name
      "ad_name",
      "impressions",
      "clicks",
      "spend",
      "actions",
      "action_values",
    ].join(","),
    access_token: accessToken,
  });

  if (from && to) params.set("time_range", JSON.stringify({ since: from, until: to }));
  else if (datePreset) params.set("date_preset", datePreset);
  else params.set("date_preset", "last_30d");

  const url = `${base}?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API error (${accountId}): ${text}`);
  }
  const json = (await res.json()) as MetaResponse;
  return (json.data ?? []).map(toRow);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const date_preset = searchParams.get("date_preset");
    const levelParam = (searchParams.get("level") || "ad") as "ad" | "campaign";
    const accountParam = searchParams.get("account");

    const accessToken = process.env.META_ACCESS_TOKEN || "";
    if (!accessToken) {
      return NextResponse.json({ error: "META_ACCESS_TOKEN missing" }, { status: 500 });
    }
    const apiVersion = process.env.META_API_VERSION || "v19.0";

    const accounts = resolveAccounts(accountParam);
    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No Meta accounts configured. Define META_ACCOUNT_MAP or META_ACCOUNT_IDS." },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      accounts.map(({ id }) =>
        fetchInsightsForAccount({
          accountId: id,
          accessToken,
          apiVersion,
          level: levelParam,
          from,
          to,
          datePreset: date_preset,
        })
      )
    );

    const merged: Row[] = [];
    const labelById = new Map<string, string>();
    for (const a of accounts) labelById.set(a.id, a.label);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const accountId = accounts[i]?.id;
      const label = accounts[i]?.label ?? accountId ?? "";
      if (r.status === "fulfilled") {
        const rows = r.value.map((row) => ({
          ...row,
          account_name: row.account_name || label,
        }));
        merged.push(...rows);
      }
    }

    return NextResponse.json(merged);
  } catch (e) {
    return NextResponse.json({ error: `Meta API error: ${(e as Error).message}` }, { status: 500 });
  }
}
