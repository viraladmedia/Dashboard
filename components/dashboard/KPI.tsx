// File: components/dashboard/KPI.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KPI({
  title, value, sub, icon: Icon,
}: { title: string; value: string; sub?: string; icon?: React.ComponentType<any> }) {
  return (
    <Card className="rounded-2xl border-2 border-white/40 bg-white/85 backdrop-blur overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-slate-600 flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        {sub ? <div className="text-[11px] text-slate-500">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
