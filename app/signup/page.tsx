// File: app/signup/page.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";

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

    const sb = getBrowserSupabase();
    if (!sb) {
      setErr("Supabase client unavailable in this environment.");
      return;
    }

    setLoading(true);
    try {
      // Where to send the email confirmation link (if confirmations are enabled)
      const redirect =
        (typeof window !== "undefined" ? window.location.origin : "") + "/dashboard";

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: redirect,
        },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // If email confirmations are required, the user will exist but no session yet
      if (data?.user && !data?.session) {
        setMsg("Check your email to confirm your account, then sign in.");
        return;
      }

      // Otherwise they’re signed in immediately
      router.replace(next);
    } catch (e) {
      setErr((e as Error).message);
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
