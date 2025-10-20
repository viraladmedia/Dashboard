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
  const jar = await cookies(); // Next.js 15: async
  const raw = jar.get(COOKIE_KEY)?.value;
  let data: Settings = DEFAULTS;
  if (raw) {
    try {
      data = deepMerge(DEFAULTS, JSON.parse(raw));
    } catch {
      data = DEFAULTS;
    }
  }
  return NextResponse.json(data, { status: 200 });
}

export async function PATCH(req: Request) {
  try {
    const patch = (await req.json()) as Partial<Settings>;

    // Minimal validation
    if (patch.appearance?.theme && !["light", "dark", "system"].includes(patch.appearance.theme))
      return NextResponse.json({ error: "Invalid theme" }, { status: 422 });
    if (
      patch.appearance?.accent &&
      !["violet", "indigo", "fuchsia", "emerald", "cyan"].includes(patch.appearance.accent)
    )
      return NextResponse.json({ error: "Invalid accent" }, { status: 422 });
    if (patch.profile?.email && typeof patch.profile.email !== "string")
      return NextResponse.json({ error: "Invalid email" }, { status: 422 });

    // Read current
    const jar = await cookies();
    const raw = jar.get(COOKIE_KEY)?.value;
    const current: Settings = raw ? (() => {
      try { return deepMerge(DEFAULTS, JSON.parse(raw)); } catch { return DEFAULTS; }
    })() : DEFAULTS;

    // Merge & respond
    const merged = deepMerge(current, patch);
    const res = NextResponse.json(merged, { status: 200 });

    // Write cookie on the response
    res.cookies.set({
      name: COOKIE_KEY,
      value: JSON.stringify(merged),
      httpOnly: false,      // set true if you only read via server
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
