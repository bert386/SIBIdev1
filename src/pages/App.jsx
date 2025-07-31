import React from 'react';
import ImageUploader from '../components/ImageUploader';

export default function App() {
  return (
    <div className="app-container">
      <header>
        <h1>SIBI</h1>
        <p>Should I Buy It</p>
      </header>
      <ImageUploader />
    </div>
  );
}
