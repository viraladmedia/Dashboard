// File: components/dashboard/ThresholdsContext.tsx
"use client";

import * as React from "react";

export type Thresholds = {
  roasKill: number;
  roasScale: number;
  cpaKill: number;
  cpaGood: number;
  minSpend: number;
  minClicks: number;
};

const DEFAULTS: Thresholds = {
  roasKill: 0.8,
  roasScale: 2.0,
  cpaKill: 100,
  cpaGood: 35,
  minSpend: 0,
  minClicks: 0,
};

function readLS(): Thresholds {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem("vam.thresholds");
    if (!raw) return DEFAULTS;
    const t = JSON.parse(raw);
    return { ...DEFAULTS, ...t };
  } catch { return DEFAULTS; }
}

function writeLS(t: Thresholds) {
  try { localStorage.setItem("vam.thresholds", JSON.stringify(t)); } catch {}
}

export const ThresholdsContext = React.createContext<{
  thresholds: Thresholds;
  setThresholds: (t: Partial<Thresholds>) => void;
}>({ thresholds: DEFAULTS, setThresholds: () => {} });

export function ThresholdsProvider({ children }: { children: React.ReactNode }) {
  const [thresholds, setState] = React.useState<Thresholds>(readLS);

  const setThresholds = React.useCallback((patch: Partial<Thresholds>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      writeLS(next);
      // broadcast so tables/charts can update immediately
      window.dispatchEvent(new CustomEvent("vam:thresholds", { detail: next }));
      return next;
    });
  }, []);

  React.useEffect(() => {
    // initialize once to ensure localStorage always has a value
    writeLS(thresholds);
  }, []);

  return (
    <ThresholdsContext.Provider value={{ thresholds, setThresholds }}>
      {children}
    </ThresholdsContext.Provider>
  );
}

export function useThresholds() {
  return React.useContext(ThresholdsContext);
}
