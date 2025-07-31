import React, { useState } from 'react';

export default function ImageUploader() {
  const [images, setImages] = useState([]);

  function handleUpload(event) {
    const files = Array.from(event.target.files);
    setImages(files);
  }

  return (
    <div className="uploader">
      <input type="file" accept="image/*" multiple onChange={handleUpload} />
      <div className="preview">
        {images.map((img, idx) => (
          <p key={idx}>{img.name}</p>
        ))}
      </div>
    </div>
  );
}
