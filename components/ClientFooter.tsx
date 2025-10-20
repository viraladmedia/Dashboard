// File: components/ClientFooter.tsx
"use client";

import { usePathname } from "next/navigation";

export default function ClientFooter() {
  const pathname = usePathname();

  // Hide footer on any /dashboard route
  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <footer className="mt-16 border-t border-white/60 bg-white/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6 text-xs text-slate-600 flex items-center justify-between">
        <span>© {new Date().getFullYear()} Viral Ad Media, LLC</span>
        <span>CPC • CPL • CPA • CPCB • ROAS</span>
      </div>
    </footer>
  );
}
