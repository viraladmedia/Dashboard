// File: app/api/import/tiktok/route.ts
},
body: JSON.stringify(body),
});


if (!res.ok) {
const text = await res.text();
return NextResponse.json({ error: `TikTok API error: ${text}` }, { status: 500 });
}


const json = await res.json() as any;
const list: any[] = json.data?.list || [];


const rows: Row[] = list.map((d: any) => {
const date = d.stat_time_day;
const campaign = d.campaign_name || "";
const ad = d.ad_name || d.adgroup_name || "";
const impressions = Number(d.impressions || 0);
const clicks = Number(d.clicks || 0);
const spend = Number(d.spend || 0);
const purchases = Number(d.purchase || 0);
const leads = Number(d.lead || 0);
const checkouts = Number(d.checkout || 0);
const revenue = Number(d.purchase_value || 0);
const product = campaign.split(" – ")[0] || campaign;


return emptyRow({
date,
channel: "TikTok",
campaign,
product,
ad,
impressions,
clicks,
leads,
checkouts,
purchases,
ad_spend: spend,
revenue,
});
});


if (format === "csv") {
const { rowsToCSV } = await import("@/lib/csv");
const csv = rowsToCSV(rows);
return new NextResponse(csv, { headers: { "Content-Type": "text/csv" } });
}
return NextResponse.json(rows);
}
