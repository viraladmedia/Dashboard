/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/import/meta/route.ts
import { NextRequest, NextResponse } from "next/server";

/** ----- Types from Meta ----- */
type Action = { action_type: string; value?: string };

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
  // When using breakdowns, Meta adds these fields when requested:
  publisher_platform?: string;   // e.g. facebook, instagram
  platform_position?: string;    // e.g. feed, story, reels_overlay
  impression_device?: string;    // e.g. desktop, mobile_android, mobile_ios
  country?: string;              // ISO country code
  age?: string;                  // e.g. 18-24
};

type MetaResponse = { data: Insight[] };

/** ----- Unified Row for our dashboard ----- */
type Row = {
  date: string;               // YYYY-MM-DD
  channel: "Meta";
  campaign: string;
  product: string;
  ad: string;
  adset: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  checkouts: number;
  purchases: number;
  ad_spend: number;
  revenue: number;
  account_id: string;
  account_name: string;
  // Unified dimensions (set only when include_dims=1)
  platform?: string;
  placement?: string;
  device?: string;
  country?: string;
  age?: string;
  // Useful to key/merge
  _key?: string;
  _level?: "ad" | "campaign";
};

/** ----- Utils ----- */
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
  } catch {}
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

function sumByType(list: Action[] | undefined, type: string): number {
  if (!list || !list.length) return 0;
  return list
    .filter((a) => a.action_type === type)
    .reduce((acc, a) => acc + (a.value ? Number(a.value) || 0 : 0), 0);
}

function computeMetrics(i: Insight) {
  const clicks = num(i.clicks);
  const spend = num(i.spend);
  const actions = i.actions ?? [];
  const actionValues = i.action_values ?? [];
  const leads = sumByType(actions, "lead") + sumByType(actions, "omni_lead");
  const checkouts =
    sumByType(actions, "checkout_initiated") +
    sumByType(actions, "omni_checkout_initiated") +
    sumByType(actions, "initiate_checkout");
  const purchases = sumByType(actions, "purchase") + sumByType(actions, "omni_purchase");
  const revenue = sumByType(actionValues, "purchase") + sumByType(actionValues, "omni_purchase");
  return { clicks, spend, leads, checkouts, purchases, revenue };
}

function rowKey(i: Insight, level: "ad" | "campaign") {
  // Key by date + account + entity identifiers to merge breakdown info back onto base rows.
  const parts = [
    i.date_start || "",
    i.account_id || "",
    level,
    i.campaign_name || "",
    level === "ad" ? (i.adset_name || "") : "",
    level === "ad" ? (i.ad_name || "") : "",
  ];
  return parts.join("|");
}

function toBaseRow(i: Insight, level: "ad" | "campaign"): Row {
  const { clicks, spend, leads, checkouts, purchases, revenue } = computeMetrics(i);
  return {
    date: i.date_start,
    channel: "Meta",
    campaign: i.campaign_name || "(no campaign)",
    product: i.campaign_name || "(no campaign)",
    ad: i.ad_name || "(no ad)",
    adset: i.adset_name || null,
    impressions: num(i.impressions),
    clicks,
    leads,
    checkouts,
    purchases,
    ad_spend: spend,
    revenue,
    account_id: i.account_id,
    account_name: i.account_name,
    _key: rowKey(i, level),
    _level: level,
  };
}

/** Core fetcher (no breakdowns) */
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
      "adset_name",
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
  return (json.data ?? []).map((i) => toBaseRow(i, level));
}

/** Breakdown fetcher (one breakdown at a time), returns a map key -> best label */
async function fetchBestLabelPerKey(args: {
  accountId: string;
  accessToken: string;
  apiVersion: string;
  level: "ad" | "campaign";
  breakdown: "publisher_platform" | "platform_position" | "impression_device" | "country" | "age";
  from?: string | null;
  to?: string | null;
  datePreset?: string | null;
}): Promise<Map<string, { label: string; purchases: number; leads: number }>> {
  const { accountId, accessToken, apiVersion, level, breakdown, from, to, datePreset } = args;

  const base = `https://graph.facebook.com/${apiVersion}/act_${accountId}/insights`;
  const params = new URLSearchParams({
    level,
    time_increment: "1",
    fields: [
      "date_start",
      "account_id",
      "campaign_name",
      "adset_name",
      "ad_name",
      "actions",
    ].join(","),
    breakdowns: breakdown, // one at a time to keep responses valid across API versions
    access_token: accessToken,
  });

  if (from && to) params.set("time_range", JSON.stringify({ since: from, until: to }));
  else if (datePreset) params.set("date_preset", datePreset);
  else params.set("date_preset", "last_30d");

  const url = `${base}?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    // Swallow breakdown errors to avoid failing the whole import
    return new Map();
  }
  const json = (await res.json()) as MetaResponse;
  const rows = json.data ?? [];

  // Accumulate by our key; pick the label with highest purchases (then leads)
  const best = new Map<string, { label: string; purchases: number; leads: number }>();
  for (const i of rows) {
    const key = rowKey(i, level);
    const label = (i as any)[breakdown] as string | undefined;
    if (!label) continue;
    const purchases = sumByType(i.actions, "purchase") + sumByType(i.actions, "omni_purchase");
    const leads = sumByType(i.actions, "lead") + sumByType(i.actions, "omni_lead");
    const prev = best.get(key);
    if (!prev || purchases > prev.purchases || (purchases === prev.purchases && leads > prev.leads)) {
      best.set(key, { label, purchases, leads });
    }
  }
  return best;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const date_preset = searchParams.get("date_preset");
    const levelParam = (searchParams.get("level") || "ad") as "ad" | "campaign";
    const accountParam = searchParams.get("account");
    const includeDims = searchParams.get("include_dims") === "1";

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

    // 1) Base rows (no breakdowns) for every account
    const baseResults = await Promise.allSettled(
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

    // Merge & stamp account label
    const baseMerged: Row[] = [];
    for (let i = 0; i < baseResults.length; i++) {
      const r = baseResults[i];
      const label = accounts[i]?.label ?? accounts[i]?.id ?? "";
      if (r.status === "fulfilled") {
        baseMerged.push(
          ...r.value.map((row) => ({
            ...row,
            account_name: row.account_name || label,
          }))
        );
      }
    }

    // 2) If dimensions requested, fetch each breakdown once per account,
    //    compute best label per (date+entity) key, then annotate base rows.
    if (includeDims && baseMerged.length) {
      const breakdowns = [
        "publisher_platform",
        "platform_position",
        "impression_device",
        "country",
        "age",
      ] as const;

      // Per-account, per-breakdown fetch → combine into one big map per breakdown
      const mapsByBreakdown: Record<string, Map<string, { label: string; purchases: number; leads: number }>> = {};

      for (const b of breakdowns) {
        mapsByBreakdown[b] = new Map();
      }

      // Fetch all breakdowns for all accounts concurrently
      const breakdownPromises: Promise<void>[] = [];
      for (const { id } of accounts) {
        for (const b of breakdowns) {
          breakdownPromises.push(
            (async () => {
              const m = await fetchBestLabelPerKey({
                accountId: id,
                accessToken,
                apiVersion,
                level: levelParam,
                breakdown: b,
                from,
                to,
                datePreset: date_preset,
              });
              // Merge into global map (prefer records with higher purchases/leads)
              const dest = mapsByBreakdown[b];
              m.forEach((val, key) => {
                const prev = dest.get(key);
                if (
                  !prev ||
                  val.purchases > prev.purchases ||
                  (val.purchases === prev.purchases && val.leads > prev.leads)
                ) {
                  dest.set(key, val);
                }
              });
            })()
          );
        }
      }
      await Promise.allSettled(breakdownPromises);

      // Annotate
      for (const row of baseMerged) {
        const key = row._key!;
        const pf = mapsByBreakdown["publisher_platform"].get(key)?.label;
        const pp = mapsByBreakdown["platform_position"].get(key)?.label;
        const dev = mapsByBreakdown["impression_device"].get(key)?.label;
        const ctry = mapsByBreakdown["country"].get(key)?.label;
        const age = mapsByBreakdown["age"].get(key)?.label;
        if (pf) row.platform = pf;
        if (pp) row.placement = pp;
        if (dev) row.device = dev;
        if (ctry) row.country = ctry;
        if (age) row.age = age;
      }
    }

    // Strip internal helpers before sending
    const cleaned = baseMerged.map(({ _key, _level, ...rest }) => rest);
    return NextResponse.json(cleaned);
  } catch (e) {
    return NextResponse.json({ error: `Meta API error: ${(e as Error).message}` }, { status: 500 });
  }
}
