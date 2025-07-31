import React, { useState } from 'react';

export default function ImageUploader() {
  const [images, setImages] = useState([]);
  const [identifiedItems, setIdentifiedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleScan = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    images.forEach((file) => formData.append('images', file));

    try {
      const res = await fetch('/api/analyse-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      const cleaned = data.result
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      console.log("🔎 Cleaned OpenAI result:", cleaned);

      const parsed = JSON.parse(cleaned);
      console.log("✅ Parsed items:", parsed);

      setIdentifiedItems(parsed);
    } catch (err) {
      setError('Failed to analyse image');
      console.error("❌ Error parsing OpenAI result:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload Image(s)</h2>
      <input type="file" accept="image/*" multiple onChange={handleUpload} />
      {images.length > 0 && (
        <div>
          <button onClick={handleScan}>Scan</button>
        </div>
      )}

      {loading && <p>Scanning image, please wait...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {identifiedItems.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Format</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            {identifiedItems.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>{item.format}</td>
                <td>{item.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
