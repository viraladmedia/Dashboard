// File: app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viral Ad Media — Dashboard",
  description: "Marketing performance & finance dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-cyan-50 text-slate-800 antialiased">
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
        <main className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-8">{children}</main>
        <footer className="mt-16 border-t border-white/60 bg-white/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6 text-xs text-slate-600 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Viral Ad Media, LLC</span>
            <span>CPC • CPL • CPA • CPCB • ROAS</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
