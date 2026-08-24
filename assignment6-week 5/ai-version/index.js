/**
 * AI Rematch — Alternative Scraper Implementation (Quarantined in ai-version/)
 * Built from prompt instructions: 3 catalogue pages, 60 books, polite delay,
 * Zod validation, caching, error resilience.
 */
const fs = require("fs/promises");
const path = require("path");
const cheerio = require("cheerio");
const { z } = require("zod");

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const CACHE_DIR = path.join(__dirname, "cache");
const OUTPUT_DIR = path.join(__dirname, "output");
const USER_AGENT = "FlyRankInternshipA9-AI/1.0 (+https://github.com/Shivam6050/flyrank-backend-ai-engineering-internship)";

const Schema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string(),
  price_gbp: z.number().positive(),
  availability_text: z.string(),
  rating_text: z.string().nullable(),
  rating_value: z.number().min(1).max(5).nullable(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string(),
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const key = url.replace(/[^a-zA-Z0-9]/g, "_") + ".html";
  const cachePath = path.join(CACHE_DIR, key);

  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    return { html: cached, fromCache: true };
  } catch {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    await fs.writeFile(cachePath, html, "utf-8");
    await sleep(500);
    return { html, fromCache: false };
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const startTime = Date.now();
  let currentUrl = START_URL;
  const bookUrls = [];

  for (let i = 0; i < 3 && currentUrl; i++) {
    const { html } = await fetchPage(currentUrl);
    const $ = cheerio.load(html);
    $("article.product_pod h3 a").each((_, el) => {
      bookUrls.push({
        url: new URL($(el).attr("href"), currentUrl).toString(),
        source: currentUrl,
      });
    });
    const next = $("li.next a").attr("href");
    currentUrl = next ? new URL(next, currentUrl).toString() : null;
  }

  const valid = [];
  const ratingMap = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };

  for (const { url, source } of bookUrls) {
    try {
      const { html } = await fetchPage(url);
      const $ = cheerio.load(html);
      const mainEl = $("div.product_main");
      const title = mainEl.find("h1").text().trim();
      const price_text = mainEl.find(".price_color").text().trim();
      const price_gbp = parseFloat(price_text.replace(/[^0-9.]/g, ""));
      const availability_text = mainEl.find(".availability").text().trim().replace(/\s+/g, " ");
      const ratingClass = mainEl.find(".star-rating").attr("class") || "";
      const rating_text = ratingClass.split(" ").find((c) => c !== "star-rating") || null;
      const rating_value = rating_text ? ratingMap[rating_text] || null : null;
      const desc = $("#product_description").next("p").text().trim() || null;

      const record = {
        title,
        product_url: url,
        price_text,
        price_gbp,
        availability_text,
        rating_text,
        rating_value,
        description: desc,
        source_page: source,
        fetched_at: new Date().toISOString(),
      };

      if (Schema.safeParse(record).success) {
        valid.push(record);
      }
    } catch (e) {
      console.warn("Failed book:", url, e.message);
    }
  }

  await fs.writeFile(path.join(OUTPUT_DIR, "books.json"), JSON.stringify(valid, null, 2));
  console.log(`[AI-Version] Scraping complete in ${Date.now() - startTime}ms. Valid books: ${valid.length}`);
}

main().catch(console.error);
