const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { parseCatalogue } = require("../src/parseCatalogue");
const { parseBook } = require("../src/parseBook");
const { parsePriceGBP, parseRating } = require("../src/normalize");
const { validateRecord } = require("../src/schema");

const fixture = (name) =>
  fs.readFileSync(path.join(__dirname, "..", "test-fixtures", name), "utf-8");

test("price normalization: '£51.77' -> 51.77", () => {
  assert.equal(parsePriceGBP("£51.77"), 51.77);
});

test("price normalization: unparseable price -> null", () => {
  assert.equal(parsePriceGBP("contact us for pricing"), null);
});

test("relative -> absolute URLs: catalogue links and next-page link resolve correctly", () => {
  const html = fixture("catalogue-page.html");
  const { bookLinks, nextPageUrl } = parseCatalogue(
    html,
    "https://books.toscrape.com/catalogue/page-1.html"
  );

  assert.equal(
    bookLinks[0],
    "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html"
  );
  assert.equal(nextPageUrl, "https://books.toscrape.com/catalogue/page-2.html");
});

test("missing description: stored as null, never invented", () => {
  const html = fixture("book-no-description.html");
  const raw = parseBook(
    html,
    "https://books.toscrape.com/catalogue/some-book/index.html",
    "https://books.toscrape.com/catalogue/page-1.html"
  );
  assert.equal(raw.description, null);
});

test("duplicate URLs: de-duplicating by product_url keeps one record per book", () => {
  const records = [
    { product_url: "https://example.com/a" },
    { product_url: "https://example.com/b" },
    { product_url: "https://example.com/a" }, // duplicate
  ];

  const byUrl = new Map();
  for (const r of records) byUrl.set(r.product_url, r);
  const unique = Array.from(byUrl.values());

  assert.equal(unique.length, 2);
});

test("malformed fixture: a record with no title and an unparseable price fails schema validation", () => {
  const html = fixture("book-malformed.html");
  const raw = parseBook(
    html,
    "https://books.toscrape.com/catalogue/broken-book/index.html",
    "https://books.toscrape.com/catalogue/page-1.html"
  );

  const candidate = {
    ...raw,
    price_gbp: parsePriceGBP(raw.price_text),
    rating_value: parseRating(raw.rating_text),
  };

  const { valid, reason } = validateRecord(candidate);
  assert.equal(valid, false);
  assert.ok(reason.length > 0);
});
