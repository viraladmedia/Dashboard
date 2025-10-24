// File: components/dashboard/tables/PerformanceTable.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { currency, fmt } from "@/lib/metrics";
import { useThresholds } from "@/components/dashboard/ThresholdsContext";

export type RowAgg = {
  entity: string;
  product?: string;
  channel?: string;
  account?: string;
  imps?: number;
  clicks?: number;
  leads?: number;
  checkouts?: number;
  purchases?: number;
  spend: number;
  rev: number;
  roas: number | null;
  cpc: number | null;
  cpl: number | null;
  cpa: number | null;
  cpcb: number | null;
  ctr: number | null;
};

function decide(r: RowAgg, t: ReturnType<typeof useThresholds>["thresholds"]) {
  const spendOK = (r.spend ?? 0) >= (t.minSpend ?? 0);
  const clicksOK = (r.clicks ?? 0) >= (t.minClicks ?? 0);
  const hasVol = spendOK && clicksOK;

  const roas = r.roas ?? 0;
  const cpa = r.cpa ?? Infinity;

  if (hasVol && (roas <= t.roasKill || cpa >= t.cpaKill)) return "Kill";
  if (hasVol && (roas >= t.roasScale && cpa <= t.cpaGood)) return "Scale";
  return "Optimize";
}

function badge(status: ReturnType<typeof decide>) {
  const styles =
    status === "Scale"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : status === "Kill"
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return <span className={`px-2 py-0.5 rounded-full text-xs ${styles}`}>{status}</span>;
}

export function PerformanceTable({ rows, title }: { rows: RowAgg[]; title: string }) {
  const { thresholds } = useThresholds();

  return (
    <div className="rounded-2xl border bg-white/95">
      <div className="pb-2 px-3 pt-3 text-sm font-semibold text-slate-700">{title}</div>
      <div className="px-3 pb-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Product</th>
              <th className="py-2 pr-3">Channel</th>
              <th className="py-2 pr-3">Account</th>
              <th className="py-2 pr-3">Impr.</th>
              <th className="py-2 pr-3">Clicks</th>
              <th className="py-2 pr-3">Leads</th>
              <th className="py-2 pr-3">Checkouts</th>
              <th className="py-2 pr-3">Purchases</th>
              <th className="py-2 pr-3">Spend</th>
              <th className="py-2 pr-3">Revenue</th>
              <th className="py-2 pr-3">ROAS</th>
              <th className="py-2 pr-3">CPC</th>
              <th className="py-2 pr-3">CPL</th>
              <th className="py-2 pr-3">CPA</th>
              <th className="py-2 pr-0">CPCB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const st = decide(r, thresholds);
              return (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-3">{badge(st)}</td>
                  <td className="py-2 pr-3">{r.entity}</td>
                  <td className="py-2 pr-3">{r.product || "—"}</td>
                  <td className="py-2 pr-3">{r.channel || "—"}</td>
                  <td className="py-2 pr-3">{r.account || "—"}</td>
                  <td className="py-2 pr-3">{fmt(r.imps)}</td>
                  <td className="py-2 pr-3">{fmt(r.clicks)}</td>
                  <td className="py-2 pr-3">{fmt(r.leads)}</td>
                  <td className="py-2 pr-3">{fmt(r.checkouts)}</td>
                  <td className="py-2 pr-3">{fmt(r.purchases)}</td>
                  <td className="py-2 pr-3">{currency(r.spend)}</td>
                  <td className="py-2 pr-3">{currency(r.rev)}</td>
                  <td className="py-2 pr-3">{r.roas == null ? "–" : `${r.roas.toFixed(2)}x`}</td>
                  <td className="py-2 pr-3">{r.cpc == null ? "–" : currency(r.cpc)}</td>
                  <td className="py-2 pr-3">{r.cpl == null ? "–" : currency(r.cpl)}</td>
                  <td className="py-2 pr-3">{r.cpa == null ? "–" : currency(r.cpa)}</td>
                  <td className="py-2 pr-0">{r.cpcb == null ? "–" : currency(r.cpcb)}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={17} className="py-6 text-center text-slate-500">No data for this selection.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
