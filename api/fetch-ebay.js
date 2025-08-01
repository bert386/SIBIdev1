
const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
  const items = req.body.items;
  const appId = process.env.EBAY_CLIENT_ID;
  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item.name);
    const url = `https://svcs.ebay.com/services/search/FindingService/v1` +
                `?OPERATION-NAME=findCompletedItems` +
                `&SERVICE-VERSION=1.0.0` +
                `&SECURITY-APPNAME=${appId}` +
                `&RESPONSE-DATA-FORMAT=JSON` +
                `&REST-PAYLOAD&GLOBAL-ID=EBAY-AU` +
                `&keywords=${query}` +
                `&itemFilter(0).name=SoldItemsOnly` +
                `&itemFilter(0).value=true` +
                `&sortOrder=EndTimeSoonest` +
                `&paginationInput.entriesPerPage=10`;

    try {
      const response = await fetch(url);
      const json = await response.json();
      const itemsFound = json.findCompletedItemsResponse[0].searchResult[0].item || [];

      const soldPrices = itemsFound.map(i => parseFloat(i.sellingStatus[0].currentPrice[0].__value__)).filter(n => !isNaN(n));
      const soldLinks = itemsFound.map(i => i.viewItemURL[0]);

      const avgValue = soldPrices.length
        ? (soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length).toFixed(2)
        : "NRS";

      results.push({
        name: item.name,
        value: soldPrices.length ? `$${avgValue} AUD` : "NRS",
        sold: soldPrices.length,
        available: "-",
        link: `https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sop=13&LH_Complete=1&LH_Sold=1`,
        soldPrices: soldPrices,
        soldLinks: soldLinks
      });
    } catch (error) {
      console.error("eBay fetch error:", error);
      results.push({
        name: item.name,
        value: "NRS",
        sold: 0,
        available: "-",
        link: `https://www.ebay.com.au/sch/i.html?_nkw=${query}`,
        soldPrices: [],
        soldLinks: []
      });
    }
  }

  const sorted = results.filter(r => r.value !== "NRS")
                        .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

  const top3 = sorted.slice(0, 3).map(i => ({ name: i.name, value: i.value }));

  const summary = `This lot contains ${results.length} items. Estimated total value: $${sorted.reduce((sum, i) => sum + parseFloat(i.value), 0).toFixed(2)} AUD.`;

  res.status(200).json({ items: results, top3, summary });
};
