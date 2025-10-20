// File: components/dashboard/AccountContext.tsx
"use client";
import * as React from "react";

type AccountCtx = {
  accountId: string;        // "all" or specific id
  accountLabel: string;     // "All Accounts" or name
  setAccount: (id: string, label: string) => void;
};

const Ctx = React.createContext<AccountCtx | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = React.useState<string>(
    (typeof window !== "undefined" && localStorage.getItem("vam.account")) || "all"
  );
  const [accountLabel, setAccountLabel] = React.useState<string>(
    (typeof window !== "undefined" && localStorage.getItem("vam.account_label")) || "All Accounts"
  );

  // Listen to Sidebar broadcasts
  React.useEffect(() => {
    const onAcc = ((e: Event) => {
      const d = (e as CustomEvent).detail as { account?: string; account_label?: string } | undefined;
      if (d?.account) setAccountId(d.account);
      if (d?.account_label) setAccountLabel(d.account_label);
    }) as EventListener;
    window.addEventListener("vam:set-account", onAcc);
    return () => window.removeEventListener("vam:set-account", onAcc);
  }, []);

  // Allow programmatic updates too (optional)
  const setAccount = React.useCallback((id: string, label: string) => {
    setAccountId(id);
    setAccountLabel(label);
    try {
      localStorage.setItem("vam.account", id);
      localStorage.setItem("vam.account_label", label);
    } catch {}
    window.dispatchEvent(new CustomEvent("vam:set-account", {
      detail: { account: id, account_label: label },
    }));
  }, []);

  return (
    <Ctx.Provider value={{ accountId, accountLabel, setAccount }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAccount() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAccount must be used within <AccountProvider>");
  return v;
}
