import React, { useState } from 'react';

function App() {
  const [results, setResults] = useState([]);
  const [image, setImage] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('image', image);

    const res = await fetch('/api/analyse-image', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    setResults(data.items || []);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SIBI v1.3.2</h1>
      <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
      <button onClick={handleUpload}>Analyse</button>

      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
}

export default App;