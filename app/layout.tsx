// File: app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import ClientHeader from "@/components/ClientHeader";
import ClientFooter from "@/components/ClientFooter";

export const metadata: Metadata = {
  title: "Viral Ad Media — Dashboard",
  description: "Marketing performance & finance dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-cyan-50 text-slate-800 antialiased">
        <ClientHeader />
        <main className="mx-auto">{children}</main>
        <ClientFooter />
      </body>
    </html>
  );
}
