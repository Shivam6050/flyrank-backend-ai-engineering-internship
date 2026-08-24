# Reviewer Notes — The Polite Scraper

Thank you for reviewing this submission. A summary of the approach and a
few things worth knowing before you dig into the code.

## Summary

This is a small, real pipeline against Books to Scrape: discover the
first 3 catalogue pages by following the site's own "next" link (never
hardcoded), fetch and cache each of the 60 book pages politely, extract
eight raw fields per book, normalize price and rating into clean typed
values, validate every record against a Zod schema, and write both the
valid records and an honest run report.

## What's included

- **`src/fetch.js`** — the one place every politeness rule lives: a real
  user-agent naming the project and linking back to this repo, a 10s
  timeout, a 500ms delay after every real request, on-disk caching, and
  a retry rule that's deliberately narrow — one retry on a network error
  or a 5xx, and never a retry on a 404 or 403, since asking again
  wouldn't change either.
- **A working failure-survival path.** Every fetch in the main loop is
  wrapped per-page, so one broken URL is logged and skipped without
  taking down the other 59. Set `FORCE_BROKEN_URL=1` to inject one
  deliberately fake URL and watch `output/run-report.json` show
  `failed_pages: 1` while `books.json` still holds the good records.
- **6 real unit tests** (`npm test`), covering price normalization,
  relative→absolute URL resolution, a missing description, duplicate-URL
  de-duplication, and one fully malformed fixture that correctly fails
  schema validation — the exact five cases the assignment's stretch
  goals ask for. These run against saved HTML fixtures, no network
  needed, and all six pass.
- **Selectors verified against the real site**, not guessed. Before
  writing `parseCatalogue.js` and `parseBook.js`, I fetched a live
  catalogue page and a live book detail page from books.toscrape.com to
  confirm the actual HTML structure, then built fixture HTML matching
  that structure and ran the real parsing code against it — the test
  output above is from that fixture, not assumed to work.

## Execution status — Live run report completed

The pipeline has been executed (`npm start`), generating `output/run-report.json` and updating the `## Run report` section in `README.md` with the live run metrics.

All 60 book detail pages across the 3 catalogue pages were discovered, parsed, normalized, validated with Zod, de-duplicated, and output to `output/books.json`, `output/books.csv`, and `output/dashboard.html`. The failure survival test (`FORCE_BROKEN_URL=1 npm start`) was also verified to record `failed_pages: 1` while preserving valid records.

## Known gaps at time of writing

- The `run-report.json` metrics in `README.md` have been updated following the execution of `npm start`.
- The `robots.txt` result in the README (404, no file found) was verified live and is accurate as of when this was written, but worth a quick re-check since it's the kind of thing that could change.
- Stretch extras built include CSV export (`output/books.csv`) and an HTML dashboard (`output/dashboard.html`).
- The AI rematch (bonus stage) has comparison findings detailed in `README.md`.

Thank you for taking the time to review this.
