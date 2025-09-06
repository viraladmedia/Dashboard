export function rowsToCSV(rows: Row[]): string {
    const header = [
    "date","channel","campaign","product","ad","impressions","clicks","leads","checkouts","purchases","ad_spend","revenue",
    ];
    const lines = rows.map(r => [
    r.date, r.channel, r.campaign, r.product, r.ad,
    r.impressions, r.clicks, r.leads, r.checkouts, r.purchases, r.ad_spend, r.revenue,
    ].join(","));
    return [header.join(","), ...lines].join("\n");
    }
