// File: app/api/import/google/route.ts
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;
const customerId = process.env.GOOGLE_CUSTOMER_ID!;
const loginCustomerId = process.env.GOOGLE_LOGIN_CUSTOMER_ID;


if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
return NextResponse.json({ error: "Google Ads credentials missing" }, { status: 400 });
}


const client = new GoogleAdsApi({
developer_token: developerToken,
client_id: clientId,
client_secret: clientSecret,
});


const customer = client.Customer({
customer_account_id: customerId,
login_customer_id: loginCustomerId,
refresh_token: refreshToken,
});


const dateRange = ` BETWEEN '${from}' AND '${to}'`;
const selectName = level === "ad" ? "ad_group_ad.ad.name" : level === "campaign" ? "campaign.name" : "ad_group.name";


const query = `
SELECT
segments.date,
campaign.name,
${selectName} AS entity_name,
metrics.impressions,
metrics.clicks,
metrics.cost_micros,
metrics.conversions,
metrics.conversions_value
FROM ad_group_ad
WHERE segments.date${dateRange}
`;


const resp = await customer.query(query);
const rows: Row[] = resp.map((r: any) => {
const date = r.segments?.date;
const campaign = r.campaign?.name || "";
const ad = r.entity_name || "";
const impressions = Number(r.metrics?.impressions || 0);
const clicks = Number(r.metrics?.clicks || 0);
const spend = Number(r.metrics?.cost_micros || 0) / 1_000_000; // to USD
const purchases = Number(r.metrics?.conversions || 0);
const revenue = Number(r.metrics?.conversions_value || 0);
const product = campaign.split(" – ")[0] || campaign;


return emptyRow({
date,
channel: "Google",
campaign,
product,
ad,
impressions,
clicks,
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