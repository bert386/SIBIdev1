import axios from 'axios';
import cheerio from 'cheerio';

const EBAY_BASE = 'https://www.ebay.com.au/sch/i.html';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST allowed' });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item.search);
    const soldUrl = `${EBAY_BASE}?_nkw=${query}&_sacat=0&LH_Sold=1&LH_Complete=1`;
    const activeUrl = `${EBAY_BASE}?_nkw=${query}&_sacat=0`;

    try {
      const soldHtml = await axios.get(soldUrl);
      const $sold = cheerio.load(soldHtml.data);
      const soldItems = [];

      $sold('li.s-item').each((i, el) => {
        if (soldItems.length >= 10) return;

        const priceText = $sold(el).find('.s-item__price').text().replace(/[\$,]/g, '');
        const price = parseFloat(priceText);
        const url = $sold(el).find('.s-item__link').attr('href');

        if (!isNaN(price) && url) {
          soldItems.push({ price, url });
        }
      });

      const avgValue = soldItems.length
        ? parseFloat((soldItems.reduce((sum, s) => sum + s.price, 0) / soldItems.length).toFixed(2))
        : null;

      const activeHtml = await axios.get(activeUrl);
      const $active = cheerio.load(activeHtml.data);
      const activeText = $active('.srp-controls__count-heading span.BOLD:first-child').text().replace(/[\,]/g, '');
      const activeCount = parseInt(activeText) || 0;

      const str = soldItems.length + activeCount > 0
        ? Math.round((soldItems.length / (soldItems.length + activeCount)) * 100)
        : 0;

      results.push({
        ...item,
        value: avgValue,
        str,
        solds: soldItems,
        ebaySearchUrl: soldUrl
      });

      console.log(`🔍 ${item.search}: $${avgValue} AUD avg, STR ${str}%`);
    } catch (err) {
      console.error(`❌ Error fetching data for ${item.search}:`, err.message);
      results.push({ ...item, value: null, str: null, solds: [], ebaySearchUrl: soldUrl });
    }
  }

  return res.status(200).json({ results });
}
