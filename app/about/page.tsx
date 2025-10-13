/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/about/page.tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "About — Viral Ad Media",
};

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl p-8 bg-white/80 backdrop-blur border-2 border-white/40">
        <Badge variant="outline" className="mb-3">About Us</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Built for media buyers & growth teams</h1>
        <p className="mt-3 text-slate-700">
          Viral Ad Media, LLC helps you move faster with clear, actionable reporting. Our dashboard
          tracks <b>CPC</b>, <b>CPL</b>, <b>CPA</b>, <b>CPCB</b>, and <b>ROAS</b> across products, campaigns, ad sets, and ads.
          Connect multiple accounts, filter instantly, and export clean summaries for clients and stakeholders.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="font-semibold">Clear decisions</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Threshold-driven statuses (Kill / Optimize / Scale) surface what matters now.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="font-semibold">Real data in minutes</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Sync last-30-days from APIs or import CSVs to get going instantly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
