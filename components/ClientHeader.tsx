// File: components/ClientHeader.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; match: (p?: string) => boolean };

const nav: NavItem[] = [
  { href: "/",        label: "Home",    match: (p) => p === "/" },
  { href: "/about",   label: "About",   match: (p) => p?.startsWith("/about") ?? false },
  { href: "/contact", label: "Contact", match: (p) => p?.startsWith("/contact") ?? false },
    { href: "/login", label: "Login", match: (p) => p?.startsWith("/login") ?? false },
];

export default function ClientHeader() {
  const pathname = usePathname();

  // Hide header on any /dashboard route
  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 md:px-8"
        role="navigation"
        aria-label="Primary"
      >
        {/* Brand */}
        <Link href="/" className="font-extrabold tracking-tight text-lg" aria-label="Viral Ad Media Home">
          <span className="bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Viral Ad Media
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 sm:gap-2 text-sm">
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-1.5 transition-colors",
                  active
                    ? "text-indigo-700"
                    : "text-slate-700 hover:text-indigo-600"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* CTA */}
          <Link
            href="/signup"
            className={cn(
              "ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
              "text-slate-800 border-slate-200/70 bg-white/70 hover:bg-white transition-colors"
            )}
          >
            <span>Get Started</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
