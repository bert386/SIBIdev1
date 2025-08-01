
export default async function handler(req, res) {
  const items = req.body.items;
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const authRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    });

    const { access_token } = await authRes.json();
    const results = [];

    for (const item of items) {
      const query = encodeURIComponent(item.name);
      const soldURL = \`https://api.ebay.com/buy/browse/v1/item_summary/search?q=\${query}&filter=conditionIds:{1000,3000,4000},sold_status:TRUE\`;
      const activeURL = \`https://api.ebay.com/buy/browse/v1/item_summary/search?q=\${query}\`;

      const soldRes = await fetch(soldURL, {
        headers: { Authorization: \`Bearer \${access_token}\` }
      });
      const activeRes = await fetch(activeURL, {
        headers: { Authorization: \`Bearer \${access_token}\` }
      });

      const soldData = await soldRes.json();
      const activeData = await activeRes.json();

      const soldPrices = (soldData.itemSummaries || [])
        .map(x => x.price?.value)
        .filter(Boolean)
        .slice(0, 10)
        .map(parseFloat);

      const avgValue = soldPrices.length
        ? `$${(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length).toFixed(2)} AUD`
        : "NRS";

      results.push({
        name: item.name,
        value: avgValue,
        sold: soldData.total || 0,
        available: activeData.total || 0,
        link: \`https://www.ebay.com.au/sch/i.html?_nkw=\${query}&LH_Sold=1&LH_Complete=1\`,
      });
    }

    const sorted = [...results]
      .filter(r => r.value !== "NRS")
      .sort((a, b) => parseFloat(b.value.replace("$", "")) - parseFloat(a.value.replace("$", "")));

    const top3 = sorted.slice(0, 3);
    const summary = \`This lot contains \${results.length} items. Top item: \${top3[0]?.name || "N/A"}.\`;

    res.status(200).json({ items: results, top3, summary });
  } catch (e) {
    console.error("Error in fetch-ebay:", e);
    res.status(500).json({ error: "eBay lookup failed" });
  }
}
