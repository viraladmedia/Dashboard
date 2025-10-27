// File: app/reset-password/page.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();

  const sb = React.useMemo(() => getBrowserSupabase(), []);
  const [stage, setStage] = React.useState<"verifying" | "ready" | "done" | "error">("verifying");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [p1, setP1] = React.useState("");
  const [p2, setP2] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // 1) When user lands from the email link (?code=...), exchange for a session.
  React.useEffect(() => {
    const run = async () => {
      if (!sb) return;
      const code = search.get("code");
      if (!code) {
        setErrorMsg("Missing reset code. Please use the password reset link from your email.");
        setStage("error");
        return;
      }
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) {
        setErrorMsg(error.message || "Could not verify reset link.");
        setStage("error");
        return;
      }
      setStage("ready");
    };
    run();
  }, [sb, search]);

  // 2) Submit new password
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!sb) return;
    if (p1.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (p1 !== p2) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await sb.auth.updateUser({ password: p1 });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setStage("done");
    // Optional redirect after a short delay
    setTimeout(() => router.replace("/login?reset=1"), 900);
  };

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-semibold">Reset password</h1>

      {stage === "verifying" && (
        <p className="text-sm text-slate-600">Verifying your reset link…</p>
      )}

      {stage === "error" && (
        <>
          <p className="mb-4 text-sm text-red-600">{errorMsg}</p>
          <a href="/login" className="text-sm text-indigo-600 hover:underline">
            Back to sign in
          </a>
        </>
      )}

      {stage === "ready" && (
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            type="password"
            placeholder="New password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Set new password"}
          </Button>
          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
        </form>
      )}

      {stage === "done" && (
        <>
          <p className="mb-2 text-sm text-emerald-600">Password updated successfully.</p>
          <p className="text-sm text-slate-600">Redirecting you to sign in…</p>
        </>
      )}
    </div>
  );
}
