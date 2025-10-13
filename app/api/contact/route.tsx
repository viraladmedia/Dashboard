// File: app/api/contact/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO: wire this up to your preferred email/CRM service
    // For now, we just echo it back.
    return NextResponse.json({ ok: true, received: body }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
