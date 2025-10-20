// File: app/dashboard/layout.tsx
import * as React from "react";
import { AccountProvider } from "@/components/dashboard/AccountContext";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Minimal, slim sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white/70 backdrop-blur">
          <Sidebar />
        </aside>

        {/* Content with slightly tighter gutters (but still breathing) */}
        <main className="flex-1 min-w-0 px-3 sm:px-5 lg:px-7 py-4">
          <AccountProvider>
            {children}
          </AccountProvider>
        </main>
      </div>
    </div>
  );
}
