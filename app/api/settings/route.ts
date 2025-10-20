/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/api/settings/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_KEY = "vam_settings";
const ONE_YEAR = 60 * 60 * 24 * 365;

type Settings = {
  profile: {
    name?: string;
    email?: string;
    company?: string;
  };
  integrations: {
    meta_token?: string;
    tiktok_token?: string;
    google_refresh?: string;
  };
  security: {
    twofa?: boolean;
    session_alerts?: boolean;
  };
  appearance: {
    theme?: "light" | "dark" | "system";
    accent?: "violet" | "indigo" | "fuchsia" | "emerald" | "cyan";
  };
};

const DEFAULTS: Settings = {
  profile: { name: "", email: "", company: "Viral Ad Media" },
  integrations: { meta_token: "", tiktok_token: "", google_refresh: "" },
  security: { twofa: false, session_alerts: false },
  appearance: { theme: "light", accent: "indigo" },
};

function readSettings(): Settings {
  const c = cookies().get(COOKIE_KEY)?.value;
  if (!c) return DEFAULTS;
  try {
    const parsed = JSON.parse(c);
    return deepMerge(DEFAULTS, parsed);
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(v: Settings) {
  cookies().set({
    name: COOKIE_KEY,
    value: JSON.stringify(v),
    httpOnly: false, // demo: allow client to read if needed; switch to true when using server reads only
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

function deepMerge<T extends Record<string, any>>(a: T, b: Partial<T>): T {
  const out: any = Array.isArray(a) ? [...a] : { ...a };
  for (const k of Object.keys(b)) {
    const v = (b as any)[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(a[k] || {}, v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

export async function GET() {
  const data = readSettings();
  return NextResponse.json(data, { status: 200 });
}

export async function PATCH(req: Request) {
  try {
    const patch = (await req.json()) as Partial<Settings>;
    // Basic validation / narrowing
    if (patch.appearance?.theme && !["light", "dark", "system"].includes(patch.appearance.theme))
      return NextResponse.json({ error: "Invalid theme" }, { status: 422 });
    if (
      patch.appearance?.accent &&
      !["violet", "indigo", "fuchsia", "emerald", "cyan"].includes(patch.appearance.accent)
    )
      return NextResponse.json({ error: "Invalid accent" }, { status: 422 });
    if (patch.profile?.email && typeof patch.profile.email !== "string")
      return NextResponse.json({ error: "Invalid email" }, { status: 422 });

    const current = readSettings();
    const merged = deepMerge(current, patch);
    writeSettings(merged);
    return NextResponse.json(merged, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
