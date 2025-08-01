
module.exports = async function handler(req, res) {
  const items = req.body.items;
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
    });

    const { access_token } = await tokenRes.json();
    const results = [];

    for (const item of items) {
      const query = encodeURIComponent(item.name);
      const soldURL = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&filter=sold_status:TRUE&limit=10`;
      const activeURL = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}`;

      
    const soldRes = await fetch(soldURL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_AU"
      }
    });
    const soldData = await soldRes.json();

    const soldItems = (soldData.itemSummaries || []).map(item => ({
      price: item.price?.value || 0,
      url: item.itemWebUrl || ""
    }));

    const prices = soldItems.map(i => parseFloat(i.price)).filter(p => !isNaN(p));
    const average = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : "NRS";

    results.push({
      name: item.name,
      prices,
      links: soldItems.map(i => i.url),
      average
    });
    
    }

    const top3 = [...results]
      .filter(i => i.value !== "NRS")
      .sort((a, b) => parseFloat(b.value.replace("$", "")) - parseFloat(a.value.replace("$", "")))
      .slice(0, 3);

    const summary = `This lot contains ${results.length} items. Most valuable: ${top3[0]?.name || "N/A"}`;

    res.status(200).json({ items: results, top3, summary });
  } catch (e) {
    console.error("Error in fetch-ebay:", e);
    res.status(500).json({ error: "eBay fetch failed" });
  }
};
