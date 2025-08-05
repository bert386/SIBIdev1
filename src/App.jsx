
import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({});

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
    }
  };

  const handleAnalyse = async () => {
    if (!image) return;
    setLoading(true);
    setResults([]);
    setValues({});

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("/api/analyse-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("🧠 Raw OpenAI response:", data);
      setResults(data.items || []);
    } catch (err) {
      console.error("❌ Error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    const fetchPricing = async () => {
      if (!results.length) return;

      console.log("🔁 Starting pricing loop for", results.length, "items");

      for (let idx = 0; idx < results.length; idx++) {
        const item = results[idx];
        const query = `${item.title} ${item.platform || ""} ${item.category || ""} ${item.year || ""}`.trim();
        const search = encodeURIComponent(query);

        try {
          console.log(`📡 Fetching /api/fetch-ebay?search=${search}`);
          const res = await fetch(`/api/fetch-ebay?search=${search}`);
          const json = await res.json();
          console.log(`💰 ${item.title} – $${json.avg} from ${json.solds.length} solds`);
          setValues((prev) => ({ ...prev, [idx]: json.avg }));
        } catch (err) {
          console.error(`❌ Error fetching eBay price for ${item.title}:`, err);
          setValues((prev) => ({ ...prev, [idx]: "N/A" }));
        }
      }
    };

    fetchPricing();
  }, [results]);

  return (
    <div className="App">
      <h1>SIBI – Should I Buy It?</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <button onClick={handleAnalyse} disabled={!image || loading}>
        {loading ? "Analysing..." : "Analyse Image"}
      </button>

      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Platform</th>
              <th>Year</th>
              <th>Category</th>
              <th>Value (AUD)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, idx) => (
              <tr key={idx}>
                <td>{item.title}</td>
                <td>{item.platform || "-"}</td>
                <td>{item.year || "-"}</td>
                <td>{item.category || "-"}</td>
                <td>
                  {values[idx]
                    ? `$${values[idx]} AUD`
                    : values[idx] === "N/A"
                    ? "N/A"
                    : "Getting pricing..."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
