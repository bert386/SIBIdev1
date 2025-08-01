
export default async function handler(req, res) {
  const items = req.body.items;
  const results = [];
  const sorted = [];

  for (let item of items) {
    const encodedName = encodeURIComponent(item.name);
    const link = \`https://www.ebay.com.au/sch/i.html?_nkw=\${encodedName}&LH_Sold=1&LH_Complete=1\`;
    const avgValue = "$25 AUD";  // placeholder
    const sold = 10; // mock
    const available = 4; // mock
    results.push({ ...item, value: avgValue, sold, available, link });
    sorted.push({ name: item.name, value: avgValue.replace(" AUD", "").replace("$", "") });
  }

  sorted.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
  const top3 = sorted.slice(0, 3);
  const summary = \`This lot includes \${items.length} items. The most valuable item is \${top3[0]?.name}.\`;

  res.status(200).json({ items: results, top3, summary });
}
