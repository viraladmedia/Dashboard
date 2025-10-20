// File: app/types/dashboard.ts
export type Level = "ad" | "adset" | "campaign";
export type Channel = "all" | "Meta" | "TikTok" | "Google";

export type Row = {
  date: string;
  channel: string;         // "Meta" | "TikTok" | "Google"
  campaign: string;
  product: string;
  ad: string;
  adset?: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  checkouts: number;
  purchases: number;
  ad_spend: number;
  revenue: number;
  account_id?: string | null;
  account_name?: string | null;
};
