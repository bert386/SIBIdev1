
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { items } = req.body;
  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item);
    const ebaySearchUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Complete=1&LH_Sold=1`;

    const soldItems = [];
    let soldCount = 0;
    let availableCount = 0;

    try {
      const html = await fetch(ebaySearchUrl).then(res => res.text());
      const regex = /<li class="s-item.*?">.*?<span class="s-item__price">\$(\d+(\.\d{1,2})?)<\/span>.*?<a.*?href="(https:\/\/www\.ebay\.com\.au\/itm\/[^"]+)"/gs;

      let match;
      while ((match = regex.exec(html)) !== null && soldItems.length < 10) {
        soldItems.push({ price: match[1], url: match[3] });
      }

      soldCount = (html.match(/s-item__title/g) || []).length;
      availableCount = soldCount;

    } catch (e) {
      console.error("Error fetching eBay:", e);
    }

    const avg = soldItems.length ? (soldItems.reduce((acc, i) => acc + parseFloat(i.price), 0) / soldItems.length).toFixed(2) : 'NRS';

    results.push({
      name: item,
      value: soldItems.length ? `$${avg} AUD` : 'NRS',
      sold: soldCount,
      available: availableCount,
      link: ebaySearchUrl,
      soldItems
    });
  }

  const sorted = results
    .filter(i => i.value !== 'NRS')
    .sort((a, b) => parseFloat(b.value.replace(/[^\d.]/g, '')) - parseFloat(a.value.replace(/[^\d.]/g, '')));

  const top3 = sorted.slice(0, 3).map(i => ({ name: i.name, value: i.value }));

  const summary = `This lot contains ${results.length} items. Most valuable: ${top3.length ? top3[0].name : "N/A"}`;

  res.json({ items: results, top3, summary });
};
