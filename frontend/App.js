import React, { useState } from 'react';

export default function App() {
  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setProgress(10);

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    const analyseRes = await fetch('/api/analyse-image', {
      method: 'POST',
      body: formData
    });

    const analyseData = await analyseRes.json();
    const ebayRes = await fetch('/api/fetch-ebay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: analyseData.items })
    });

    const ebayData = await ebayRes.json();
    setResults(ebayData.results);
    setProgress(100);
  };

  const totalValue = results?.reduce((sum, item) =>
    typeof item.value === 'number' ? sum + item.value : sum, 0
  ).toFixed(2);

  return (
    <div>
      <h1>SIBI – Should I Buy It</h1>
      <input type="file" multiple onChange={handleUpload} />
      <progress value={progress} max="100" />

      {results && (
        <div>
          <h2>Total Lot Value: ${totalValue} AUD</h2>
          <table border="1">
            <thead>
              <tr>
                <th>Item</th>
                <th>Value</th>
                <th>Sold</th>
                <th>Available</th>
                <th>eBay</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{typeof item.value === 'number' ? `$${item.value} AUD` : item.value}</td>
                  <td>{item.soldCount}</td>
                  <td>{item.availableCount}</td>
                  <td><a href={item.searchUrl} target="_blank" rel="noreferrer">View</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}