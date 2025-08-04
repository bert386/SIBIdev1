import React, { useState } from "react";
import Modal from "./Modal";

export default function ResultsTable({ results }) {
  const [modalData, setModalData] = useState(null);
  const [showFiltered, setShowFiltered] = useState(false);

  const allItems = results.flatMap(g => g.items.map(i => ({ ...i, group: g.filename })));
  const top3 = allItems.filter(i => i.average).sort((a, b) => b.average - a.average).slice(0, 3);
  const totalValue = allItems.reduce((sum, i) => sum + (parseFloat(i.average) || 0), 0);
  const avgSTR = allItems.reduce((sum, i) => sum + (i.str || 0), 0) / allItems.length;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ margin: "20px 0" }}>
        <strong>Total Value:</strong> ${totalValue.toFixed(2)} | 
        <strong> STR Avg:</strong> {Math.round(avgSTR * 100)}% | 
        <strong> Top 3:</strong> {top3.map(i => i.item).join(", ")}
      </div>
      <label>
        <input
          type="checkbox"
          checked={showFiltered}
          onChange={e => setShowFiltered(e.target.checked)}
        />{" "}
        Show only items with STR ≥ 50%
      </label>
      {results.map((group, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <h3>📸 {group.filename}</h3>
          <table className="result-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Value (AUD)</th>
                <th>STR</th>
                <th>eBay Last Solds</th>
              </tr>
            </thead>
            <tbody>
              {group.items.filter(item => !showFiltered || item.str >= 0.5).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.item}</td>
                  <td style={{ textAlign: "center" }}>{item.average || "NRS"}</td>
                  <td style={{ textAlign: "center" }}>
                    {typeof item.str === 'number' ? `${Math.round(item.str * 100)}%` : "—"}
                  </td>
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