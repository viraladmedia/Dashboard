// File: components/ClientHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientHeader() {
  const pathname = usePathname();

  // Hide header on any /dashboard route
  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/60">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-extrabold tracking-tight text-lg">
          <span className="bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Viral Ad Media, LLC
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link className="hover:text-indigo-600" href="/">Home</Link>
          <Link className="hover:text-indigo-600" href="/about">About</Link>
          <Link className="hover:text-indigo-600" href="/contact">Contact</Link>
          <Link
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 hover:bg-white/70 transition"
            href="/dashboard"
          >
            <span>Open Dashboard</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
