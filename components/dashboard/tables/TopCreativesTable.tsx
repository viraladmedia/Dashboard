// File: components/dashboard/tables/TopCreativesTable.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currency, fmt } from "@/lib/metrics";

export function TopCreativesTable({
  items, loading,
}: { items: Array<{ key: string; channel: string; campaign: string; ad: string; revenue: number; roas: number; purchases: number }>; loading?: boolean }) {
  return (
    <Card className="rounded-2xl border-2 border-white/40 bg-white/90 backdrop-blur overflow-hidden">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-sm font-semibold text-slate-700">Top Performing Creatives</CardTitle>
        <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
          {loading ? "Loading…" : `${items.length} items`}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup><col className="w-[120px]" /><col className="w-[180px]" /><col /><col className="w-[120px]" /><col className="w-[110px]" /><col className="w-[80px]" /></colgroup>
          <thead>
            <tr className="text-left text-slate-600 border-b">
              <th className="py-2 pr-3">Channel</th>
              <th className="py-2 pr-3">Campaign</th>
              <th className="py-2 pr-3">Creative</th>
              <th className="py-2 pr-3">Revenue</th>
              <th className="py-2 pr-3">ROAS</th>
              <th className="py-2 pr-3">Purch.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.key} className="border-b hover:bg-gradient-to-r hover:from-fuchsia-50/60 hover:to-cyan-50/60">
                <td className="py-2 pr-3">{c.channel}</td>
                <td className="py-2 pr-3 truncate">{c.campaign || "(no campaign)"}</td>
                <td className="py-2 pr-3 truncate">{c.ad}</td>
                <td className="py-2 pr-3 font-medium">{currency(c.revenue)}</td>
                <td className={`py-2 pr-3 font-semibold ${c.roas >= 3 ? "text-emerald-600" : c.roas < 1 ? "text-rose-600" : "text-slate-700"}`}>{c.roas ? `${c.roas.toFixed(2)}x` : "–"}</td>
                <td className="py-2 pr-3">{fmt(c.purchases)}</td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={6} className="py-10 text-center text-slate-500">{loading ? "Loading…" : "No creatives found"}</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
