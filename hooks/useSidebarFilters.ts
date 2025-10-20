// File: hooks/useSidebarFilters.ts
"use client";

import * as React from "react";
import type { Channel, Level } from "@/app/types/dashboard";

export function useSidebarFilters() {
  const [account, setAccount] = React.useState<string>("all");
  const [level, setLevel] = React.useState<Level>("ad");
  const [channel, setChannel] = React.useState<Channel>("all");

  React.useEffect(() => {
    const acc = localStorage.getItem("vam.account");
    const lvl = localStorage.getItem("vam.level") as Level | null;
    const ch = localStorage.getItem("vam.channel") as Channel | null;
    if (acc) setAccount(acc);
    if (lvl) setLevel(lvl);
    if (ch) setChannel(ch);

    const onAccount = (e: Event) => {
      const detail = (e as CustomEvent).detail as { account?: string };
      if (detail?.account) setAccount(detail.account);
    };
    const onLevel = (e: Event) => {
      const detail = (e as CustomEvent).detail as { level?: Level };
      if (detail?.level) setLevel(detail.level);
    };
    const onChannel = (e: Event) => {
      const detail = (e as CustomEvent).detail as { channel?: Channel };
      if (detail?.channel) setChannel(detail.channel);
    };

    window.addEventListener("vam:set-account", onAccount as EventListener);
    window.addEventListener("vam:set-level", onLevel as EventListener);
    window.addEventListener("vam:set-channel", onChannel as EventListener);

    return () => {
      window.removeEventListener("vam:set-account", onAccount as EventListener);
      window.removeEventListener("vam:set-level", onLevel as EventListener);
      window.removeEventListener("vam:set-channel", onChannel as EventListener);
    };
  }, []);

  return { account, level, channel };
}
