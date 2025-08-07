import axios from 'axios';

export default async (req, res) => {
  try {
    const { search } = req.body;
    const scraperApiKey = process.env.SCRAPERAPI_KEY;
    const targetUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(search)}&_sop=12&LH_Sold=1&LH_Complete=1`;
    const url = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}&country_code=au`;

    const { data } = await axios.get(url);

    // If data is an array of objects with product_title, just return it in soldItems
    if (Array.isArray(data) && data[0] && data[0].product_title) {
      return res.json({ soldItems: data });
    }

    // Otherwise, try to parse legacy structure if possible (not expected in your case)
    return res.json({ soldItems: [] });
  } catch (error) {
    res.status(200).json({ soldItems: [], error: error.toString() });
  }
};