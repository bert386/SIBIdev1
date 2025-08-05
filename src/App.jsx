
import React, { useState } from 'react';

export default function App() {
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyse-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      const enriched = [];

      for (const item of data.items) {
        enriched.push({ ...item, value: 'Getting Pricing...', solds: '' });
        setItems([...enriched]);

        try {
          console.log('🔄 Fetching eBay pricing for:', item.search);
          const ebayRes = await fetch('/api/fetch-ebay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ search: item.search }),
          });

          const ebayData = await ebayRes.json();
          console.log('📦 eBay Response:', ebayData);

          const idx = enriched.findIndex(i => i.search === item.search);
          enriched[idx].value = ebayData.average ? `$${ebayData.average} AUD` : 'N/A';
          enriched[idx].solds = `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(item.search)}&_sop=13&LH_Sold=1&LH_Complete=1`;
          setItems([...enriched]);
        } catch (scrapeErr) {
          console.error('❌ Failed to fetch eBay data:', scrapeErr);
          const idx = enriched.findIndex(i => i.search === item.search);
          enriched[idx].value = 'Scrape failed';
          setItems([...enriched]);
        }
      }
    } catch (err) {
      console.error('❌ Error:', err);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SIBI – Should I Buy It</h1>
      <p>Version: v1.4.0</p>
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={loading || !file} style={{ marginLeft: 10 }}>
        Start Analysis
      </button>

      {loading && <p>🔄 Analysing image and fetching pricing...</p>}

      {items.length > 0 && !loading && <p>✅ Analysis complete</p>}

      {items.length > 0 && (
        <table border="1" cellPadding="6" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Platform</th>
              <th>Year</th>
              <th>Category</th>
              <th>Value (AUD)</th>
              <th>Last Solds</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.title}</td>
                <td>{item.platform}</td>
                <td>{item.year}</td>
                <td>{item.category}</td>
                <td>{item.value}</td>
                <td>
                  {item.solds ? (
                    <a href={item.solds} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  ) : (
                    '...'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
