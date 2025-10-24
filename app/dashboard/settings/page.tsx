// File: app/dashboard/settings/page.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type Settings = {
  profile: { name?: string; email?: string; company?: string };
  integrations: { meta_token?: string; tiktok_token?: string; google_refresh?: string };
  security: { twofa?: boolean; session_alerts?: boolean };
  appearance: { theme?: "light" | "dark" | "system"; accent?: "violet" | "indigo" | "fuchsia" | "emerald" | "cyan" };
};

export default function SettingsPage() {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Local form state
  const [profile, setProfile] = React.useState<Settings["profile"]>({ name: "", email: "", company: "" });
  const [integrations, setIntegrations] = React.useState<Settings["integrations"]>({
    meta_token: "",
    tiktok_token: "",
    google_refresh: "",
  });
  const [security, setSecurity] = React.useState<Settings["security"]>({ twofa: false, session_alerts: false });
  const [appearance, setAppearance] = React.useState<Settings["appearance"]>({ theme: "light", accent: "indigo" });

  // Load current settings on mount
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = (await res.json()) as Settings;
        setProfile(data.profile || {});
        setIntegrations(data.integrations || {});
        setSecurity(data.security || {});
        setAppearance(data.appearance || {});
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSection = async (patch: Partial<Settings>, toastMsg = "Saved!") => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e?.error || "Error saving");
        return;
      }
      const data = (await res.json()) as Settings;
      // re-hydrate all so UI stays in sync
      setProfile(data.profile || {});
      setIntegrations(data.integrations || {});
      setSecurity(data.security || {});
      setAppearance(data.appearance || {});
      // simple feedback; swap to shadcn toast later
      alert(toastMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <TopBar subtitle="Settings" title="Workspace Settings" showAccountInTitle={false} />

      <Card className="mt-3 rounded-2xl border bg-white/95">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>

            {/* Profile */}
            <TabsContent value="profile" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={profile.name || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@viraladmedia.com"
                    value={profile.email || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Viral Ad Media"
                    value={profile.company || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" disabled={loading} onClick={() => saveSection({ profile }, "Profile saved!")}>
                  Save Profile
                </Button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => window.location.reload()}>
                  Cancel
                </Button>
              </div>
            </TabsContent>

            {/* Integrations */}
            <TabsContent value="integrations" className="space-y-4">
              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Meta (Facebook)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label htmlFor="meta-token">Access Token</Label>
                      <Input
                        id="meta-token"
                        placeholder="EAAB..."
                        value={integrations.meta_token || ""}
                        onChange={(e) =>
                          setIntegrations((x) => ({ ...x, meta_token: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        disabled={loading}
                        onClick={() => saveSection({ integrations }, "Meta token saved!")}
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">TikTok Ads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label htmlFor="tiktok-token">Access Token</Label>
                      <Input
                        id="tiktok-token"
                        placeholder="tk_..."
                        value={integrations.tiktok_token || ""}
                        onChange={(e) =>
                          setIntegrations((x) => ({ ...x, tiktok_token: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        disabled={loading}
                        onClick={() => saveSection({ integrations }, "TikTok token saved!")}
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Google Ads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label htmlFor="google-refresh">Refresh Token</Label>
                      <Input
                        id="google-refresh"
                        placeholder="1//0g..."
                        value={integrations.google_refresh || ""}
                        onChange={(e) =>
                          setIntegrations((x) => ({ ...x, google_refresh: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        disabled={loading}
                        onClick={() => saveSection({ integrations }, "Google token saved!")}
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button type="button" disabled={loading} onClick={() => saveSection({ integrations }, "Integrations saved!")}>
                  Save Integrations
                </Button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => window.location.reload()}>
                  Cancel
                </Button>
              </div>
            </TabsContent>

            {/* Security */}
            <TabsContent value="security" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="password">Change Password</Label>
                  <Input id="password" type="password" placeholder="New password" />
                </div>
                <div>
                  <Label htmlFor="password2">Confirm Password</Label>
                  <Input id="password2" type="password" placeholder="Confirm password" />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Two-Factor Authentication</div>
                    <div className="text-xs text-slate-500">Add an extra layer of security to your account.</div>
                  </div>
                  <Switch
                    id="twofa"
                    checked={!!security.twofa}
                    onCheckedChange={(v) => setSecurity((s) => ({ ...s, twofa: v }))}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Session Alerts</div>
                    <div className="text-xs text-slate-500">Email me when a new device signs in.</div>
                  </div>
                  <Switch
                    id="session-alerts"
                    checked={!!security.session_alerts}
                    onCheckedChange={(v) => setSecurity((s) => ({ ...s, session_alerts: v }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" disabled={loading} onClick={() => saveSection({ security }, "Security saved!")}>
                  Save Security
                </Button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => window.location.reload()}>
                  Cancel
                </Button>
              </div>
            </TabsContent>

            {/* Appearance */}
            <TabsContent value="appearance" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <Label>Theme</Label>
                  <Select
                    value={appearance.theme || "light"}
                    onValueChange={(v: "light" | "dark" | "system") =>
                      setAppearance((a) => ({ ...a, theme: v }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Accent</Label>
                  <div className="flex gap-2">
                    {(["violet", "indigo", "fuchsia", "emerald", "cyan"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAppearance((a) => ({ ...a, accent: c }))}
                        className={[
                          "h-9 w-9 rounded-md border outline-offset-2",
                          c === "violet" ? "bg-violet-500" :
                          c === "indigo" ? "bg-indigo-500" :
                          c === "fuchsia" ? "bg-fuchsia-500" :
                          c === "emerald" ? "bg-emerald-500" : "bg-cyan-500",
                          appearance.accent === c ? "ring-2 ring-slate-900" : ""
                        ].join(" ")}
                        title={c}
                        aria-pressed={appearance.accent === c}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" disabled={loading} onClick={() => saveSection({ appearance }, "Appearance saved!")}>
                  Save Appearance
                </Button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => window.location.reload()}>
                  Cancel
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
