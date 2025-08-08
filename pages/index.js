
export default function Home() {
  return (
    <div>
      <header>
        <img src="/thumbnail_image (1).png" alt="SIBI Logo" />
        <h1>Should I Buy It (SIBI)</h1>
      </header>
      <main>
        <section>
          <h2>Lot Overview</h2>
          <p>Summary of the lot will appear here.</p>
        </section>
        <section>
          <h2>Top 3 Items</h2>
          <ul>
            <li>Item 1 - $Value</li>
            <li>Item 2 - $Value</li>
            <li>Item 3 - $Value</li>
          </ul>
        </section>
        <section>
          <h2>All Items</h2>
          <table>
            <thead>
              <tr><th>Item</th><th>Platform</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Example Item</td><td>Wii</td><td>$10</td></tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
