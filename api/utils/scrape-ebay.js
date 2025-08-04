
import fetch from 'node-fetch';
import cheerio from 'cheerio';

export async function scrapeEbayData(title, category, platform) {
  const query = encodeURIComponent(`${title} ${platform || ''}`);
  const soldURL = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;
  const activeURL = `https://www.ebay.com.au/sch/i.html?_nkw=${query}`;

  const soldHTML = await fetch(soldURL).then(res => res.text());
  const activeHTML = await fetch(activeURL).then(res => res.text());

  const $sold = cheerio.load(soldHTML);
  const $active = cheerio.load(activeHTML);

  const soldPrices = [];
  $sold('.s-item__price').slice(0, 10).each((_, el) => {
    const price = parseFloat($sold(el).text().replace(/[^\d.]/g, ''));
    if (price) soldPrices.push(price);
  });

  const avgValue = soldPrices.length ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length) : 'NRS';
  const totalSold = soldPrices.length;
  const totalActive = $active('.s-item__info').length;
  const STR = totalSold + totalActive > 0 ? `${Math.round((totalSold / (totalSold + totalActive)) * 100)}%` : 'NRS';

  return {
    value: avgValue,
    STR,
    ebayLink: soldURL
  };
}
