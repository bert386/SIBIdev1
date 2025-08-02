
import React, { useState } from 'react';

export default function App() {
  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
const [selectedItem, setSelectedItem] = useState(null);

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
    setResults(ebayData);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SIBI (v1.1.0)</h1>
      <input type="file" multiple onChange={handleUpload} />
      <p>Progress: {progress}%</p>
      {results && (
        <>
          <h2>Top 3 Most Valuable Items</h2>
          <ul>
            {results.top3.map((item, idx) => (
              <li key={idx}>{item.name} – {item.value}</li>
            ))}
          </ul>
          <h2>All Items</h2>
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
              {results.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.value}</td>
                  <td>{item.sold}</td>
                  <td>{item.available}</td>
                  <td><a href={item.link} target="_blank">View</a></td>
      <td>
        {item.soldLinks && item.soldLinks.length > 0 && (
          <button onClick={() => setSelectedItem(item)}>Sold Prices</button>
        )}
      </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Summary</h2>
          <p>{results.summary}</p>
        </>
      )}
    
      {selectedItem && (
        <div style={{
          position: 'fixed', top: 50, left: '10%', width: '80%', background: '#fff',
          border: '1px solid #000', padding: 20, zIndex: 1000, maxHeight: '80vh', overflowY: 'scroll'
        }}>
          <h3>Sold Prices for {selectedItem.name}</h3>
          <table border="1" width="100%">
            <thead><tr><th>Title</th><th>Price</th></tr></thead>
            <tbody>
              {selectedItem.soldLinks.map((link, idx) => (
                <tr key={idx}>
                  <td><a href={link.url} target="_blank">{link.title}</a></td>
                  <td>{link.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setSelectedItem(null)}>Close</button>
        </div>
      )}
</div>
  );
}
