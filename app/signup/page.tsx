// File: app/signup/page.tsx
"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic"; // avoid SSG since we read search params

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-16 text-sm text-slate-600">Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const sb = getBrowserSupabase();
      if (!sb) throw new Error("Supabase unavailable");

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${location.origin}/login?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;

      // If email confirmations are enabled, the user may not have a session yet.
      if (data.user && !data.session) {
        setMsg("Check your email to confirm your account, then sign in.");
        return;
      }

      // Otherwise they’re signed in—go to next page.
      router.replace(next);
    } catch (e: any) {
      setErr(e?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-semibold">Create account</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
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
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Sign up"}
        </Button>
        {err && <p className="text-xs text-red-600">{err}</p>}
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
      </form>

      <div className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <a href={`/login?next=${encodeURIComponent(next)}`} className="text-indigo-600 hover:underline">
          Sign in
        </a>
      </div>
    </div>
  );
}
