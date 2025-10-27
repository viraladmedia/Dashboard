// File: app/dashboard/profile/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import * as React from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const sb = getBrowserSupabase();
      if (!sb) {
        if (mounted) setErr("Supabase client unavailable.");
        setLoading(false);
        return;
      }

      const { data, error } = await sb.auth.getUser();
      if (!mounted) return;

      if (error) {
        setErr(error.message);
      } else if (data?.user) {
        const u = data.user;
        setEmail(u.email ?? "");
        setName((u.user_metadata as any)?.name ?? "");
        setAvatarUrl((u.user_metadata as any)?.avatar_url ?? "");
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSaving(true);

    const sb = getBrowserSupabase();
    if (!sb) {
      setErr("Supabase client unavailable.");
      setSaving(false);
      return;
    }

    const { error } = await sb.auth.updateUser({
      data: { name, avatar_url: avatarUrl },
    });

    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Profile updated.");
  }

  return (
    <div className="w-full">
      <TopBar
        title="Profile"
        subtitle="Account"
        showAccountInTitle={false}
        showAccountIdInSubtitle={false}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Basics */}
        <Card className="lg:col-span-2 rounded-2xl border bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form className="space-y-4" onSubmit={onSave}>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <Input value={email} disabled />
                <p className="mt-1 text-[11px] text-slate-500">
                  Email changes must be made from your authentication provider settings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Avatar URL</label>
                <Input
                  placeholder="https://…"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Used for your profile picture in the top bar.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={saving || loading}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <a href="/reset-password" className="text-sm text-indigo-600 hover:underline">
                  Reset password
                </a>
              </div>

              {msg && <p className="text-xs text-emerald-600">{msg}</p>}
              {err && <p className="text-xs text-red-600">{err}</p>}
            </form>
          </CardContent>
        </Card>

        {/* Preview / Quick actions */}
        <Card className="rounded-2xl border bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              {/* Lightweight avatar preview */}
              <div className="h-14 w-14 overflow-hidden rounded-full ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl || "/avatar.png"}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">
                  {name || "Your name"}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {email || "you@company.com"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <a className="text-sm text-indigo-600 hover:underline" href="/dashboard/settings">
                Open account settings →
              </a>
              <a className="text-sm text-slate-600 hover:underline" href="/dashboard">
                Back to dashboard →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-slate-500">Loading profile…</div>
      )}
    </div>
  );
}
