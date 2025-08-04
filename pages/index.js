import React, { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import ResultsTable from "./components/ResultsTable";

export default function Home() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <main style={{ padding: 20 }}>
      <h1>SIBI – Should I Buy It (v4.0.0)</h1>
      <ImageUpload setResults={setResults} setLoading={setLoading} />
      {loading && <p>🔄 Analysing images…</p>}
      {results.length > 0 && <ResultsTable results={results} />}
    </main>
  );
}