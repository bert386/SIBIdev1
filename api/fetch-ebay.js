
import axios from 'axios';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }
  const { search } = req.body;
  if (!search) {
    return res.status(400).json({ message: 'Missing search' });
  }

  const url = 'https://api.scraperapi.com/structured/ebay/search';
  const params = {
    api_key: SCRAPER_API_KEY,
    query: search,
    show_only: 'sold_items',
    country_code: 'au',
    tld: 'com'
  };

  try {
    const { data } = await axios.get(url, { params });
    if (!data || !Array.isArray(data.results)) {
      return res.status(500).json({ message: 'No results from ScraperAPI', raw: data });
    }
    return res.status(200).json({
      items: data.results,
      qty: data.results.length
    });
  } catch (err) {
    return res.status(500).json({ message: 'Structured API call failed', error: err.message });
  }
}
