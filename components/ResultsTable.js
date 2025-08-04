import React, { useState } from "react";
import Modal from "./Modal";

export default function ResultsTable({ results }) {
  const [modalData, setModalData] = useState(null);

  return (
    <div>
      {results.map((group, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <h3>📸 {group.filename}</h3>
          <table border="1" cellPadding="6">
            <thead>
              <tr><th>Item</th><th>Value (AUD)</th><th>eBay Last Solds</th></tr>
            </thead>
            <tbody>
              {group.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.item}</td>
                  <td style={{ textAlign: "center" }}>{item.average || "NRS"}</td>
                  <td style={{ textAlign: "center" }}>
                    {item.ebay?.length > 0 ? (
                      <button onClick={() => setModalData(item.ebay)}>View</button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {modalData && <Modal data={modalData} onClose={() => setModalData(null)} />}
    </div>
  );
}