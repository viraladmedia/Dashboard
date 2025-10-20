// File: components/dashboard/charts/SpendRevenueOverTime.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { currency } from "@/lib/metrics";

export function SpendRevenueOverTime({ data }: { data: Array<{ date: string; spend: number; revenue: number }> }) {
  return (
    <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-slate-700">Spend vs Revenue (by Date)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 h-64 min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: unknown) => currency(Number(v as number))} />
            <Legend />
            <Bar dataKey="spend" name="Ad Spend" radius={[6, 6, 0, 0]} />
            <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
