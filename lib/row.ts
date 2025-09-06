export type Row = {
    date: string; // YYYY-MM-DD
    channel: string; // Meta | Google | TikTok | YouTube | etc
    campaign: string;
    product: string; // funnel/product name
    ad: string; // creative/ad name
    impressions: number;
    clicks: number;
    leads: number; // lead events (if available)
    checkouts: number; // initiate_checkout (if available)
    purchases: number; // purchase events (if available)
    ad_spend: number; // USD
    revenue: number; // USD (if available)
    };
    
    
    export const emptyRow = (overrides: Partial<Row>): Row => ({
    date: "",
    channel: "",
    campaign: "",
    product: "",
    ad: "",
    impressions: 0,
    clicks: 0,
    leads: 0,
    checkouts: 0,
    purchases: 0,
    ad_spend: 0,
    revenue: 0,
    ...overrides,
    });