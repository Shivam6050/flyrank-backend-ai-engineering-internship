/**
 * Converts array of validated book records into CSV format.
 * Flattens nulls to empty strings and escapes double quotes/newlines.
 */
function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function recordsToCsv(records) {
  const headers = [
    "title",
    "product_url",
    "price_text",
    "price_gbp",
    "availability_text",
    "rating_text",
    "rating_value",
    "description",
    "source_page",
    "fetched_at",
  ];

  const rows = [headers.join(",")];

  for (const record of records) {
    const row = headers.map((header) => escapeCsvCell(record[header]));
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

module.exports = { recordsToCsv };
