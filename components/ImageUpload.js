import React, { useState } from "react";

export default function ImageUpload({ setResults, setLoading }) {
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files) {
    const form = new FormData();
    for (let file of files) {
      form.append("images", file);
    }
    setLoading(true);

    const aiRes = await fetch("/api/analyse-image", { method: "POST", body: form });
    const { results } = await aiRes.json();

    const enriched = await Promise.all(results.map(async (r) => {
      if (r.error) return { ...r, error: true };
      const lines = r.raw.split("\n").filter(Boolean);
      const items = lines.map(line => line.replace(/^\d+\.\s*/, "").trim());
      const pricedItems = await Promise.all(items.map(async (item) => {
        const ebayRes = await fetch(`/api/fetch-ebay?query=${encodeURIComponent(item)}`);
        const { items: solds, average } = await ebayRes.json();

        let str = null;
        try {
          const activeRes = await fetch(`/api/fetch-ebay?query=${encodeURIComponent(item)}&active=1`);
          const { items: activeItems } = await activeRes.json();
          const activeCount = activeItems?.length || 0;
          const soldCount = solds?.length || 0;
          if (activeCount + soldCount > 0) {
            str = soldCount / (soldCount + activeCount);
          }
        } catch (_) {}

        return { item, average: average?.toFixed(2), ebay: solds, str };
      }));

      return { filename: r.filename, items: pricedItems };
    }));

    setResults(enriched);
    setLoading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDrag(e) {
    e.preventDefault();
    setDragOver(e.type === "dragenter" || e.type === "dragover");
  }

  return (
    <div
      onDrop={handleDrop}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      style={{
        padding: "20px",
        border: dragOver ? "2px dashed #222" : "2px dashed #aaa",
        marginBottom: "20px",
        textAlign: "center",
        background: dragOver ? "#eef" : "#fafafa",
        borderRadius: "10px"
      }}
    >
      <p>Drag & drop images here, or click to upload:</p>
      <input type="file" multiple accept="image/*" onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}