import React, { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleStart = async () => {
    setLoading(true);
    setResults([]);
    // Simulate API call (replace with actual fetch for image analysis + fetch-ebay)
    // Here we mock the result format you pasted above
    const apiResult = [
      {
        "product_title": "McLeod's Daughters - The Complete First Series / Season 1 One (DVD) 6 Disc setOpens in a new window or tab",
        "image": "https://i.ebayimg.com/images/g/UZsAAOSwDDJllOUb/s-l500.webp",
        "product_url": "https://www.ebay.com.au/itm/396417052597",
        "condition": "Pre-owned · DVD · Drama",
        "item_price": { "value": 17.99, "currency": "CAD" },
        "extra_info": "Best Offer",
        "shipping_cost": "Free delivery"
      }
    ];
    setTimeout(() => {
      setResults(apiResult);
      setLoading(false);
    }, 1000);
  };

  return (
    <div style={{ fontFamily: "Arial", margin: 32 }}>
      <h1>SIBI – Should I Buy It</h1>
      <div style={{ marginBottom: 16 }}>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleStart} disabled={loading || !file}>
          {loading ? "Analysing..." : "Start Analysis"}
        </button>
      </div>
      {loading && <div>Analysing image and fetching prices...</div>}
      {results.length > 0 && (
        <table border="1" cellPadding={6}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Image</th>
              <th>Condition</th>
              <th>Value</th>
              <th>Currency</th>
              <th>Shipping</th>
              <th>eBay Link</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, i) => (
              <tr key={i}>
                <td>{item.product_title}</td>
                <td>
                  {item.image ? (
                    <img src={item.image} alt="" style={{ width: 80 }} />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{item.condition || "—"}</td>
                <td>{item.item_price?.value ?? "—"}</td>
                <td>{item.item_price?.currency ?? "—"}</td>
                <td>{item.shipping_cost || "—"}</td>
                <td>
                  {item.product_url ? (
                    <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  ) : (
                    "—"
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