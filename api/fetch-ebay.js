
import axios from 'axios';
import * as cheerio from 'cheerio';

function isAdOrShop(title) {
  const t = title.toLowerCase();
  return t.includes('shop on ebay') || t.includes('ad') || t === '';
}

function calcMedian(prices) {
  if (!prices.length) return 0;
  const sorted = prices.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function calcMean(prices) {
  if (!prices.length) return 0;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { search } = req.body;
  const encoded = encodeURIComponent(search);
  const ebayUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&_sop=13&LH_Sold=1&LH_Complete=1`;

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const proxyUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(ebayUrl)}`;

  try {
    const { data: html } = await axios.get(proxyUrl);
    const $ = cheerio.load(html);

    // DOM walking to split above/below
    let aboveNodes = [];
    let belowNodes = [];
    let allValidNodes = [];
    let inFewerWords = false;

    const resultContainer = $('#srp-river-results, .srp-results, .srp-river').first().length
      ? $('#srp-river-results, .srp-results, .srp-river').first()
      : $('body');

    resultContainer.children().each((_, el) => {
      const tag = el.tagName || el.name;
      const isLi = tag === 'li' && $(el).hasClass('s-item');
      const isH3 = tag === 'h3' && $(el).text().trim() === "Results matching fewer words";

      if (isH3) {
        inFewerWords = true;
        return;
      }
      if (isLi) {
        if (inFewerWords) {
          belowNodes.push(el);
        } else {
          aboveNodes.push(el);
        }
        allValidNodes.push(el);
      }
    });

    function extractItems(nodes, maxResults) {
      const items = [];
      for (const el of nodes) {
        const title = $(el).find('.s-item__title').text().trim();
        const priceText = $(el).find('.s-item__price').first().text().trim();
        const link = $(el).find('.s-item__link').attr('href');
        if (!title || !priceText || !link) continue;
        if (isAdOrShop(title)) continue;
        const priceMatch = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(priceMatch);
        if (isNaN(price) || price <= 0) continue;
        if (!items.some(i => i.title === title && i.price == price)) {
          items.push({ title, price, link });
        }
        if (items.length >= maxResults) break;
      }
      return items;
    }

    let items = extractItems(aboveNodes, 10);
    let usedFallback = false;
    let debug = {
      aboveCount: aboveNodes.length,
      belowCount: belowNodes.length,
      allCount: allValidNodes.length
    };
    if (!items.length) {
      items = extractItems(belowNodes, 5);
      if (!items.length) {
        // fallback: first 5 from all s-items
        items = extractItems(allValidNodes, 5);
        usedFallback = true;
      }
    }

    const pricesUsed = items.map(i => i.price);
    const median = calcMedian(pricesUsed);
    const mean = calcMean(pricesUsed);
    const min = pricesUsed.length ? Math.min(...pricesUsed) : 0;
    const max = pricesUsed.length ? Math.max(...pricesUsed) : 0;

    return res.status(200).json({
      median,
      mean,
      min,
      max,
      prices: pricesUsed,
      items,
      qty: pricesUsed.length,
      usedFallback,
      debug
    });
  } catch (err) {
    return res.status(500).json({ message: 'Scraping failed' });
  }
}
