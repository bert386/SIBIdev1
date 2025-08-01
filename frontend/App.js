
import React, { useState } from 'react';

export default function App() {
  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [selectedSold, setSelectedSold] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setProgress(10);

    const formData = new FormData();
    files.forEach((file, idx) => formData.append(`images`, file));
    setProgress(30);

    const analyseRes = await fetch('/api/analyse-image', {
      method: 'POST',
      body: formData,
    });
    const items = await analyseRes.json();
    setProgress(60);

    const ebayRes = await fetch('/api/fetch-ebay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const ebayData = await ebayRes.json();
    setProgress(100);
    
    const all = ebayData.results.map(entry => {
      const filtered = entry.soldPrices.filter(p => typeof p.price === 'number');
      if (!filtered.length) return null;
      const avg = filtered.reduce((sum, p) => sum + p.price, 0) / filtered.length;
      return { ...entry, soldPrices: filtered, average: avg };
    });

    const top3 = [...all]
      .sort((a, b) => b.average - a.average)
      .slice(0, 3)
      .filter(Boolean)
      .map(x => ({
        name: x.item,
        value: `$${x.average.toFixed(2)} AUD`
      }));

    setResults({ top3: top3 || [], results: all });
    
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SIBI (v1.1.1)</h1>
      <input type="file" multiple onChange={handleUpload} />
      <p>Progress: {progress}%</p>
      {results && (
        <>
          <h2>All Items</h2>
          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Item</th>
                <th>Sold Avg</th>
                <th>Sold History</th>
              </tr>
            </thead>
            <tbody>
              {results.results.filter(Boolean).map((entry, idx) => {
                const avg = (
                  entry.soldPrices.reduce((sum, p) => sum + p.price, 0) /
                  entry.soldPrices.length
                ).toFixed(2);
                return (
                  <tr key={idx}>
                    <td>{entry.item}</td>
                    <td>${avg} AUD</td>
                    <td>
                      <button onClick={() => setSelectedSold(entry.soldPrices)}>
                        View Last Solds
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {selectedSold && (
        <div style={{
          position: 'fixed', top: 50, left: '10%', right: '10%', background: 'white', border: '1px solid black', padding: 20, zIndex: 10
        }}>
          <h3>Last 10 Sold Prices</h3>
          <ul>
            {selectedSold.map((x, i) => (
              <li key={i}>
                <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> – ${x.price} AUD
              </li>
            ))}
          </ul>
          <button onClick={() => setSelectedSold(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
