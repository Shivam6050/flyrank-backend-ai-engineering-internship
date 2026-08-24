const fs = require("fs/promises");
const path = require("path");

const { politeFetch } = require("./fetch");
const { parseCatalogue } = require("./parseCatalogue");
const { parseBook } = require("./parseBook");
const { parsePriceGBP, parseRating } = require("./normalize");
const { validateRecord } = require("./schema");
const { recordsToCsv } = require("./exportCsv");
const { generateDashboardHtml } = require("./generateDashboard");

const CATALOGUE_START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const MAX_CATALOGUE_PAGES = 3;
const OUTPUT_DIR = path.join(__dirname, "..", "output");

// One deliberately fake book URL for the Stage 5 failure-survival
// checkpoint. Never used unless FORCE_BROKEN_URL=1 is set — this is a
// made-up path on the real site, so it fails fast with a real 404 rather
// than hammering anything that exists.
const FAKE_BOOK_URL = "https://books.toscrape.com/catalogue/this-book-does-not-exist_9999/index.html";

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

/** Follows the catalogue's own "next" link — never hardcodes page URLs. */
async function discoverCataloguePages() {
  const pages = [];
  let url = CATALOGUE_START_URL;

  while (url && pages.length < MAX_CATALOGUE_PAGES) {
    const { html } = await politeFetch(url);
    const { bookLinks, nextPageUrl } = parseCatalogue(html, url);
    pages.push({ url, bookLinks });
    url = pages.length < MAX_CATALOGUE_PAGES ? nextPageUrl : null;
  }

  return pages;
}

async function main() {
  await ensureOutputDir();

  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  console.log("Discovering catalogue pages...");
  const cataloguePages = await discoverCataloguePages();

  // De-duplicate before ever fetching a detail page.
  const seen = new Set();
  const linksToFetch = [];
  for (const page of cataloguePages) {
    for (const link of page.bookLinks) {
      if (!seen.has(link)) {
        seen.add(link);
        linksToFetch.push({ url: link, sourcePage: page.url });
      }
    }
  }

  console.log(
    `catalogue_pages=${cataloguePages.length} discovered=${linksToFetch.length} unique_urls=${linksToFetch.length}`
  );

  if (process.env.FORCE_BROKEN_URL === "1") {
    linksToFetch.push({ url: FAKE_BOOK_URL, sourcePage: cataloguePages[0]?.url ?? CATALOGUE_START_URL });
    console.log("FORCE_BROKEN_URL=1 — injected one fake book URL for the failure-survival checkpoint.");
  }

  console.log("Fetching book detail pages...");
  const rawRecords = [];
  let detailPagesFetched = 0;
  let cacheHits = 0;
  let failedPages = 0;

  for (const { url, sourcePage } of linksToFetch) {
    try {
      const { html, fromCache } = await politeFetch(url);
      detailPagesFetched += 1;
      if (fromCache) cacheHits += 1;
      rawRecords.push(parseBook(html, url, sourcePage));
    } catch (err) {
      failedPages += 1;
      console.log(`SKIP ${url} -> ${err.code || "ERROR"}: ${err.message}`);
    }
  }

  console.log(`detail_pages=${rawRecords.length}`);
  if (rawRecords[0]) {
    console.log("Sample raw record:\n" + JSON.stringify(rawRecords[0], null, 2));
  }

  console.log("Normalizing and validating...");
  const validRecords = [];
  const invalidRecords = [];

  for (const raw of rawRecords) {
    const candidate = {
      ...raw,
      price_gbp: parsePriceGBP(raw.price_text),
      rating_value: parseRating(raw.rating_text),
    };

    const { valid, data, reason } = validateRecord(candidate);
    if (valid) {
      validRecords.push(data);
    } else {
      invalidRecords.push({ record: candidate, reason });
    }
  }

  // product_url is each record's canonical identity — de-duplicate on it
  // so a rerun (or an overlapping page) never produces 120 records.
  const byUrl = new Map();
  for (const record of validRecords) {
    byUrl.set(record.product_url, record);
  }
  const uniqueValidRecords = Array.from(byUrl.values());

  await fs.writeFile(
    path.join(OUTPUT_DIR, "books.json"),
    JSON.stringify(uniqueValidRecords, null, 2)
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, "errors.json"),
    JSON.stringify(invalidRecords, null, 2)
  );

  const csvContent = recordsToCsv(uniqueValidRecords);
  await fs.writeFile(path.join(OUTPUT_DIR, "books.csv"), csvContent, "utf-8");

  const report = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    catalogue_pages_fetched: cataloguePages.length,
    detail_pages_attempted: linksToFetch.length,
    detail_pages_fetched: detailPagesFetched,
    cache_hits: cacheHits,
    valid_records: uniqueValidRecords.length,
    invalid_records: invalidRecords.length,
    failed_pages: failedPages,
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, "run-report.json"),
    JSON.stringify(report, null, 2)
  );

  const dashboardHtml = generateDashboardHtml(uniqueValidRecords, report);
  await fs.writeFile(path.join(OUTPUT_DIR, "dashboard.html"), dashboardHtml, "utf-8");

  console.log("\nRun report:\n" + JSON.stringify(report, null, 2));
  console.log(`\nDone. ${uniqueValidRecords.length} valid records written to output/books.json, output/books.csv, and output/dashboard.html`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
