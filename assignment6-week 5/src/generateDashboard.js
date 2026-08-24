/**
 * Generates a clean HTML dashboard showing record counts, price ranges,
 * failed pages, cache hit stats, and freshness timestamp.
 */
function generateDashboardHtml(records, report) {
  const prices = records.map((r) => r.price_gbp).filter((p) => typeof p === "number");
  const minPrice = prices.length ? Math.min(...prices).toFixed(2) : "0.00";
  const maxPrice = prices.length ? Math.max(...prices).toFixed(2) : "0.00";
  const avgPrice = prices.length
    ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
    : "0.00";

  const rowsHtml = records
    .map(
      (r) => `
      <tr>
        <td><strong>${escapeHtml(r.title)}</strong></td>
        <td>£${r.price_gbp ? r.price_gbp.toFixed(2) : "N/A"}</td>
        <td>${r.rating_value ? "★".repeat(r.rating_value) : "N/A"} (${r.rating_text || "N/A"})</td>
        <td>${escapeHtml(r.availability_text)}</td>
        <td><a href="${r.product_url}" target="_blank">View Book</a></td>
      </tr>
    `
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Polite Scraper Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }
    h1 { margin-top: 0; color: #38bdf8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
    .card { background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155; }
    .card h3 { margin: 0 0 10px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase; }
    .card .value { font-size: 28px; font-weight: bold; color: #f8fafc; }
    .card .sub { font-size: 12px; color: #64748b; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #0f172a; color: #94a3b8; font-size: 13px; }
    tr:hover { background: #334155; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Polite Scraper — Observability Dashboard</h1>
  <div class="grid">
    <div class="card">
      <h3>Total Valid Records</h3>
      <div class="value">${report.valid_records}</div>
      <div class="sub">Target: 60 records</div>
    </div>
    <div class="card">
      <h3>Price Range (GBP)</h3>
      <div class="value">£${minPrice} - £${maxPrice}</div>
      <div class="sub">Average: £${avgPrice}</div>
    </div>
    <div class="card">
      <h3>Cache Hits</h3>
      <div class="value">${report.cache_hits} / ${report.detail_pages_attempted}</div>
      <div class="sub">${report.duration_ms}ms total duration</div>
    </div>
    <div class="card">
      <h3>Failed Pages</h3>
      <div class="value">${report.failed_pages}</div>
      <div class="sub">Failure survival active</div>
    </div>
  </div>

  <h2>Extracted Book Inventory</h2>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Price</th>
        <th>Rating</th>
        <th>Availability</th>
        <th>Link</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { generateDashboardHtml };
