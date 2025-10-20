// File: app/contact/page.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = React.useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending"); setError("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("sent");
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err: unknown) {
      setError((err as Error).message);
      setState("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Contact us</h1>
      <p className="mt-2 text-slate-700">
        Questions about setup, integrations, or custom metrics? Send us a note and we’ll get right back.
      </p>

      <Card className="mt-6 rounded-2xl border-2 border-white/40 bg-white/80 backdrop-blur">
        <CardContent className="p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-600">Name</label>
              <Input name="name" required placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Email</label>
              <Input type="email" name="email" required placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Message</label>
              <Textarea name="message" required placeholder="Tell us what you need…" />
            </div>
            <Button type="submit" className="w-full" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send message"}
            </Button>
            {state === "sent" && (
              <p className="text-sm text-emerald-600">Thanks! We’ve received your message.</p>
            )}
            {state === "error" && (
              <p className="text-sm text-rose-600">Something went wrong: {error}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-slate-600">
        Prefer email? Reach us at <a className="underline" href="mailto:hello@viraladmedia.example">hello@viraladmedia.example</a>
      </div>
    </div>
  );
}
