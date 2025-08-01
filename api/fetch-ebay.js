
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
      const soldURL = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&filter=sold_status:TRUE`;

      console.log("🔍 Fetching sold listings for:", decodeURIComponent(query));
      console.log("🔗 Sold URL:", soldURL);

      const soldRes = await fetch(soldURL, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY-AU"
        }
      });

      const soldData = await soldRes.json();
      const soldItems = (soldData.itemSummaries || []).slice(0, 10);

      console.log("📦 Found", soldItems.length, "sold items.");
      soldItems.forEach(x => console.log("✔", x.title, "-", x.price?.value, x.itemWebUrl));

      const soldPrices = soldItems.map(x => ({
        title: x.title,
        price: parseFloat(x.price?.value),
        url: x.itemWebUrl
      })).filter(x => x.price);

      results.push({
        item: item.name,
        soldPrices
      });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("eBay fetch error:", error);
    res.status(500).json({ error: error.message });
  }
};
