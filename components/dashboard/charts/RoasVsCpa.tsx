// File: components/dashboard/charts/RoasVsCpa.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { currency } from "@/lib/metrics";

export function RoasVsCpa({ data }: { data: Array<{ name: string; roas: number; cpa: number; spend: number }> }) {
  return (
    <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur overflow-hidden">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">ROAS vs CPA (bubble size = Spend)</CardTitle></CardHeader>
      <CardContent className="pt-0 h-72 min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="roas" name="ROAS" tickFormatter={(v: number) => `${v.toFixed(1)}x`} />
            <YAxis type="number" dataKey="cpa" name="CPA" tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
            <Tooltip formatter={(v: unknown, n: string) => n === "roas" ? `${Number(v as number).toFixed(2)}x` : currency(Number(v as number))} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} name="Ads" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
