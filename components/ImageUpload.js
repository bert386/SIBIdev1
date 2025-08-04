import React from "react";

export default function ImageUpload({ setResults, setLoading }) {
  async function handleUpload(e) {
    const form = new FormData();
    for (let file of e.target.files) {
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
        const { items, average } = await ebayRes.json();
        return { item, average: average?.toFixed(2), ebay: items };
      }));
      return { filename: r.filename, items: pricedItems };
    }));

    setResults(enriched);
    setLoading(false);
  }

  return (
    <div>
      <input type="file" multiple accept="image/*" onChange={handleUpload} />
    </div>
  );
}