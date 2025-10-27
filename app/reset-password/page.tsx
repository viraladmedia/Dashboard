// File: app/reset-password/page.tsx
"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic"; // avoid SSG for this page

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-16 text-sm text-slate-600">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [phase, setPhase] = React.useState<"request" | "update">("request");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // If the user arrives from the Supabase recovery link, they'll have a session.
  // In that case we show the "update password" form automatically.
  React.useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      if (data.session) setPhase("update");
    })();
  }, []);

  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const sb = getBrowserSupabase();
      if (!sb) throw new Error("Supabase unavailable");
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-password?next=${encodeURIComponent(next)}`,
      });
      if (error) throw error;
      setMsg("Check your inbox for the password reset link.");
    } catch (e: any) {
      setErr(e?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const sb = getBrowserSupabase();
      if (!sb) throw new Error("Supabase unavailable");
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMsg("Password updated. Redirecting…");
      setTimeout(() => router.replace(next), 800);
    } catch (e: any) {
      setErr(e?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-16">
      {phase === "request" ? (
        <>
          <h1 className="mb-6 text-2xl font-semibold">Reset your password</h1>
          <form className="space-y-3" onSubmit={onRequest}>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            {err && <p className="text-xs text-red-600">{err}</p>}
            {msg && <p className="text-xs text-emerald-600">{msg}</p>}
          </form>
        </>
      ) : (
        <>
          <h1 className="mb-6 text-2xl font-semibold">Set a new password</h1>
          <form className="space-y-3" onSubmit={onUpdate}>
            <Input
              type="password"
              placeholder="New strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating…" : "Update password"}
            </Button>
            {err && <p className="text-xs text-red-600">{err}</p>}
            {msg && <p className="text-xs text-emerald-600">{msg}</p>}
          </form>
        </>
      )}

      <div className="mt-4 text-sm text-slate-600">
        <a href="/login" className="text-indigo-600 hover:underline">Back to sign in</a>
      </div>
    </div>
  );
}
