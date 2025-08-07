module.exports = async (req, res) => {
  try {
    // Assume the scraper already returns correct JSON, just forward it.
    // (If axios fetch is still needed, adjust here.)
    const items = req.body.results || req.body.items || req.body.data || [];
    res.json({ soldItems: items });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
};