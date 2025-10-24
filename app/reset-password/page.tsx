"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [ready, setReady] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // 1) When arriving from the email link, there should be a `code` query param.
  //    We must exchange it for a session before calling updateUser.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // already logged in? good—allow reset
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (!cancelled) setReady(true);
        return;
      }

      const code = sp.get("code");
      if (!code) {
        // Some links still deliver tokens in hash; try full URL just in case:
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (!error && !cancelled) {
          setReady(true);
          return;
        }
        if (!cancelled) setErr("Invalid or expired reset link. Request a new one from the login page.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (!cancelled) setErr(error.message);
        return;
      }
      if (!cancelled) setReady(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!password || password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Password updated. Redirecting…");
    setTimeout(() => router.replace(next), 800);
  };

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-semibold">Set a new password</h1>

      {!ready && !err && (
        <p className="text-sm text-slate-600">Validating reset link…</p>
      )}

      {err && (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{err}</p>
          <a href="/login" className="text-sm text-indigo-600 hover:underline">Back to login</a>
        </div>
      )}

      {ready && !err && (
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving…" : "Update password"}
          </Button>
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        </form>
      )}
    </div>
  );
}
