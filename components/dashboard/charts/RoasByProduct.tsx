// File: components/dashboard/charts/RoasByProduct.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function RoasByProduct({ data }: { data: Array<{ product: string; roas: number; spend?: number }> }) {
  return (
    <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur overflow-hidden">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">ROAS by Product</CardTitle></CardHeader>
      <CardContent className="pt-0 h-64 min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="product" tick={{ fontSize: 11 }} angle={-15} height={50} interval={0} />
            <YAxis tickFormatter={(v: number) => `${v.toFixed(1)}x`} />
            <Tooltip formatter={(val: unknown, name: string) => name === "roas" ? `${Number(val as number).toFixed(2)}x` : val as any} />
            <Legend />
            <Bar dataKey="roas" name="ROAS" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
