
import React, { useState } from 'react';

export default function App() {
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPrices, setFetchingPrices] = useState(false);

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
      setItems(data.items);
    } catch (err) {
      console.error('❌ Error:', err);
    }

    setLoading(false);
  };

  const handleFetchPrices = async () => {
    setFetchingPrices(true);
    const enriched = [...items];

    for (let i = 0; i < enriched.length; i++) {
      const item = enriched[i];
      try {
        console.log('🔄 Fetching eBay pricing for:', item.search);
        const ebayRes = await fetch('/api/fetch-ebay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ search: item.search }),
        });

        const ebayData = await ebayRes.json();
        console.log('📦 eBay Response:', ebayData);

        item.median = ebayData.median ? `$${ebayData.median} AUD` : 'N/A';
item.min = ebayData.min ? `$${ebayData.min} AUD` : '';
item.max = ebayData.max ? `$${ebayData.max} AUD` : '';
item.solds = `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(item.search)}&_sop=13&LH_Sold=1&LH_Complete=1`;
      } catch (scrapeErr) {
        console.error('❌ Failed to fetch eBay data:', scrapeErr);
        item.value = 'Scrape failed';
      }
    }

    setItems(enriched);
    setFetchingPrices(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SIBI – Should I Buy It</h1>
      <p>Version: v1.4.9 (Sequential Fix)</p>
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={loading || !file} style={{ marginLeft: 10 }}>
        Start Analysis
      </button>

      {loading && <p>🔄 Analysing image...</p>}
      {items.length > 0 && !loading && <p>✅ Analysis complete</p>}

      {items.length > 0 && !loading && (
        <button onClick={handleFetchPrices} disabled={fetchingPrices} style={{ marginTop: 10 }}>
          {fetchingPrices ? 'Fetching Prices…' : 'Fetch eBay Prices'}
        </button>
      )}

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
            {(Array.isArray(items)?items:[]).map((item, idx) => (
              <tr key={idx}>
                <td>{item.title}</td>
                <td>{item.platform}</td>
                <td>{item.year}</td>
                <td>{item.category}</td>
                <td><div><b>Median:</b> {item.median}<br/><b>Mean:</b> {item.mean}<br/><small style={{color: '#666'}}>min: {item.min} / max: {item.max}<br/>qty: {item.qty}{item.usedFallback ? ' (Fallback: no strong matches)' : ''}</small></div></td>
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
