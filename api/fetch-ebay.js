
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  const items = req.body.items;
  const appId = process.env.EBAY_APP_ID;
  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item.name);
    const endpoint = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${appId}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&siteid=15&keywords=${query}&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&sortOrder=EndTimeSoonest`;

    const response = await fetch(endpoint);
    const data = await response.json();

    const entries = data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

    const soldItems = entries
      .filter(x => x.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ && x.viewItemURL?.[0])
      .slice(0, 10)
      .map(x => ({
        price: parseFloat(x.sellingStatus[0].currentPrice[0].__value__),
        url: x.viewItemURL[0]
      }));

    const soldPrices = soldItems.map(x => x.price);
    const soldUrls = soldItems.map(x => x.url);
    const avg = soldPrices.length ? (soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length).toFixed(2) : "NRS";

    results.push({
      name: item.name,
      value: avg === "NRS" ? "NRS" : `$${avg} AUD`,
      soldPrices,
      soldUrls,
      sold: soldItems.length,
      available: soldItems.length,
      ebayLink: `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Complete=1&LH_Sold=1`
    });
  }

  res.status(200).json({ results });
};
