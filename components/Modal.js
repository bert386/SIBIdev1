import React from "react";

export default function Modal({ data, onClose }) {
  return (
    <div style={{ position: "fixed", top: 50, left: "10%", width: "80%", background: "#fff", border: "1px solid #000", padding: 20, zIndex: 1000 }}>
      <h3>🛒 Last 10 eBay Sold Listings</h3>
      <ul>
        {data.map((item, idx) => (
          <li key={idx}>
            <a href={item.link} target="_blank" rel="noreferrer">{item.title}</a> – ${item.price}
          </li>
        ))}
      </ul>
      <button onClick={onClose}>Close</button>
    </div>
  );
}