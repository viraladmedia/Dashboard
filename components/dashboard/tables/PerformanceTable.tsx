// File: components/dashboard/tables/PerformanceTable.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currency, fmt } from "@/lib/metrics";
import type { Thresholds } from "@/lib/metrics";
import type { Row, Level } from "@/app/types/dashboard";
import { aggregate, statusFor } from "@/lib/metrics";
import { Settings2, Rocket, Trash2 } from "lucide-react";

function StatusBadge({ s }: { s: ReturnType<typeof statusFor> }) {
  const styles: Record<string, string> = {
    Scale: "bg-emerald-500/15 text-emerald-600 border-emerald-400/40",
    Optimize: "bg-amber-500/15 text-amber-600 border-amber-400/40",
    Kill: "bg-rose-500/15 text-rose-600 border-rose-400/40",
  };
  const Icon = s === "Scale" ? Rocket : s === "Kill" ? Trash2 : Settings2;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[s]}`}><Icon className="h-3.5 w-3.5" /> {s}</span>;
}

export function PerformanceTable({
  groups, level, roasKill, roasScale,
}: {
  groups: Array<any>;
  level: Level;
  roasKill: number; roasScale: number;
}) {
  return (
    <Card className="rounded-2xl border-2 border-white/40 bg-white/90 backdrop-blur overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-slate-700">
          {level === "ad" ? "Ad-Level Performance" : level === "adset" ? "Ad Set–Level Performance" : "Campaign-Level Performance"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[110px]" />
            <col className="w-[170px]" />
            <col className="w-[240px]" />
            <col className="w-[110px]" />
            <col className="w-[120px]" />
            <col className="w-[80px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[90px]" />
            <col className="w-[100px]" />
          </colgroup>
          <thead>
            <tr className="text-left text-slate-600 border-b">
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">{level === "ad" ? "Ad" : level === "adset" ? "Ad Set" : "Campaign"} <span className="text-[11px] text-slate-400 ml-1">{level !== "campaign" ? "(incl. campaign)" : ""}</span></th>
              <th className="py-2 pr-4">Spend</th>
              <th className="py-2 pr-4">Revenue</th>
              <th className="py-2 pr-4">ROAS</th>
              <th className="py-2 pr-4">CPC</th>
              <th className="py-2 pr-4">CPL</th>
              <th className="py-2 pr-4">CPA</th>
              <th className="py-2 pr-4">CPCB</th>
              <th className="py-2 pr-4">Clicks</th>
              <th className="py-2 pr-4">Leads</th>
              <th className="py-2 pr-4">Checkouts</th>
              <th className="py-2 pr-4">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g: any, i: number) => (
              <tr key={g.key + i} className="border-b hover:bg-gradient-to-r hover:from-fuchsia-50/60 hover:to-cyan-50/60">
                <td className="py-2 pr-4"><StatusBadge s={g.status} /></td>
                <td className="py-2 pr-4">
                  <div className="font-semibold text-slate-800 truncate">{g.product}</div>
                  <div className="text-[11px] text-slate-500 truncate">{g.channel}</div>
                </td>
                <td className="py-2 pr-4">
                  {level === "ad" && (
                    <div className="truncate">
                      <div className="text-slate-800">{g.ad}</div>
                      <div className="text-[11px] text-slate-500">{g.campaign}</div>
                    </div>
                  )}
                  {level === "adset" && (
                    <div className="truncate">
                      <div className="text-slate-800">{g.adset}</div>
                      <div className="text-[11px] text-slate-500">{g.campaign}</div>
                    </div>
                  )}
                  {level === "campaign" && <div className="truncate text-slate-800">{g.campaign}</div>}
                </td>
                <td className="py-2 pr-4 font-medium">{currency(g.spend)}</td>
                <td className="py-2 pr-4 font-medium">{currency(g.revenue)}</td>
                <td className={`py-2 pr-4 font-semibold ${g.roas != null && g.roas >= roasScale ? "text-emerald-600" : g.roas != null && g.roas < roasKill ? "text-rose-600" : "text-slate-700"}`}>{g.roas != null ? `${g.roas.toFixed(2)}x` : "–"}</td>
                <td className="py-2 pr-4">{currency(g.cpc)}</td>
                <td className="py-2 pr-4">{currency(g.cpl)}</td>
                <td className="py-2 pr-4">{currency(g.cpa)}</td>
                <td className="py-2 pr-4">{currency(g.cpcb)}</td>
                <td className="py-2 pr-4">{fmt(g.clicks, 0)}</td>
                <td className="py-2 pr-4">{fmt(g.leads, 0)}</td>
                <td className="py-2 pr-4">{fmt(g.checkouts, 0)}</td>
                <td className="py-2 pr-4">{fmt(g.purchases, 0)}</td>
              </tr>
            ))}
            {!groups.length && (
              <tr><td colSpan={14} className="py-10 text-center text-slate-500">No data for current filters.</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
