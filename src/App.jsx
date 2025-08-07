import React, { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleAnalyse = async () => {
    setLoading(true);
    setResults([]);
    // Step 1: Upload image for item analysis
    const formData = new FormData();
    formData.append("file", file);
    const openaiRes = await fetch("/api/analyse-image", {
      method: "POST",
      body: formData,
    });
    const itemList = await openaiRes.json();
    setItems(itemList);

    // Step 2: For each identified item, get eBay sold data
    const ebayResults = await Promise.all(
      itemList.map(async (item) => {
        try {
          const ebayRes = await fetch("/api/fetch-ebay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ search: item.search }),
          });
          const ebayJson = await ebayRes.json();
          // Use the first sold item from new JSON structure, fallback to empty object
          const sold = Array.isArray(ebayJson.soldItems) && ebayJson.soldItems.length > 0
            ? ebayJson.soldItems[0]
            : {};
          return {
            ...item,
            ...sold,
          };
        } catch {
          return { ...item, error: "Fetch failed" };
        }
      })
    );
    setResults(ebayResults);
    setLoading(false);
  };

  return (
    <div style={{ margin: 32, fontFamily: "Arial" }}>
      <h1>SIBI – Should I Buy It</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleAnalyse} disabled={!file || loading}>
        {loading ? "Analysing..." : "Start"}
      </button>
      <hr />
      {results.length > 0 && (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Title</th>
              <th>Platform</th>
              <th>Year</th>
              <th>Category</th>
              <th>Sold Price</th>
              <th>Currency</th>
              <th>eBay Link</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, i) => (
              <tr key={i}>
                <td>{item.product_title || item.title || "—"}</td>
                <td>{item.platform || "—"}</td>
                <td>{item.year || "—"}</td>
                <td>{item.category || "—"}</td>
                <td>
                  {item.item_price?.value ||
                    item.price ||
                    item.soldPrice ||
                    "—"}
                </td>
                <td>
                  {item.item_price?.currency ||
                    item.currency ||
                    "—"}
                </td>
                <td>
                  {item.product_url || item.link ? (
                    <a
                      href={item.product_url || item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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