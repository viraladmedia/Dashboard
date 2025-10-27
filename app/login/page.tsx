// app/login/page.tsx
"use client";

import * as React from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function LoginPage() {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";

  const [mode, setMode] = React.useState<"login" | "reset">("login");

  // login state
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [loginErr, setLoginErr] = React.useState<string | null>(null);

  // reset state
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetting, setResetting] = React.useState(false);
  const [resetMsg, setResetMsg] = React.useState<string | null>(null);
  const [resetErr, setResetErr] = React.useState<string | null>(null);

const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoggingIn(false);
    if (error) {
      setLoginErr(error.message);
      return;
    }
    router.replace(next);
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(null);
    setResetMsg(null);
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${location.origin}/reset-password?next=${encodeURIComponent(next)}`
    });
    setResetting(false);
    if (error) {
      setResetErr(error.message);
      return;
    }
    setResetMsg("If an account exists for that email, a reset link has been sent.");
  };

  if (!supabase) {
    // Friendly message when envs aren’t present in preview/build
  return (
    <div className="mx-auto max-w-sm py-16">
      {mode === "login" ? (
        <>
          <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
            Supabase credentials are missing. Set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment.
          <form className="space-y-3" onSubmit={onLogin}>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" disabled={loggingIn} className="w-full">
              {loggingIn ? "Signing in…" : "Sign in"}
            </Button>
            {loginErr && <p className="text-xs text-red-600">{loginErr}</p>}
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <button
              className="text-indigo-600 hover:underline"
              onClick={() => setMode("reset")}
              type="button"
            >
              Forgot password?
            </button>
            <a href={`/signup?next=${encodeURIComponent(next)}`} className="text-indigo-600 hover:underline">
              Create an account
            </a>
          </div>
        </>
      ) : (
        <>
          <h1 className="mb-6 text-2xl font-semibold">Reset password</h1>
          <form className="space-y-3" onSubmit={onReset}>
            <Input
              type="email"
              placeholder="you@company.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Button type="submit" disabled={resetting} className="w-full">
              {resetting ? "Sending link…" : "Send reset link"}
            </Button>
            {resetErr && <p className="text-xs text-red-600">{resetErr}</p>}
            {resetMsg && <p className="text-xs text-emerald-600">{resetMsg}</p>}
          </form>

          <div className="mt-4 text-sm">
            <button className="text-slate-600 hover:underline" onClick={() => setMode("login")} type="button">
              ← Back to sign in
            </button>
          </div>
        </>
      )}
    </div>
  );
   
  }
}
