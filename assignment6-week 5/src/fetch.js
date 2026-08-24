const fs = require("fs/promises");
const path = require("path");

const USER_AGENT =
  "FlyRankInternshipA9/1.0 (+https://github.com/Shivam6050/flyrank-backend-ai-engineering-internship)";
const TIMEOUT_MS = 10_000;
const DELAY_MS = 500;
const CACHE_DIR = path.join(__dirname, "..", "cache");

function cacheKeyFor(url) {
  return url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_") + ".html";
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readCache(url) {
  try {
    return await fs.readFile(path.join(CACHE_DIR, cacheKeyFor(url)), "utf-8");
  } catch {
    return null;
  }
}

async function writeCache(url, html) {
  await fs.writeFile(path.join(CACHE_DIR, cacheKeyFor(url)), html, "utf-8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptFetch(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a URL politely, or return a cached copy if one already exists.
 *
 * - Cached reads are instant and never touch the network or the delay.
 * - Real requests always send an honest user-agent, always time out, and
 *   are always followed by a delay — win or lose.
 * - A network error or a 5xx gets exactly one retry after a short pause.
 *   A 404 or 403 is never retried — asking again won't change either.
 *
 * @returns {Promise<{html: string, status: number, fromCache: boolean}>}
 */
async function politeFetch(url) {
  await ensureCacheDir();

  const cached = await readCache(url);
  if (cached !== null) {
    console.log(`CACHE HIT ${url} (${cached.length} bytes)`);
    return { html: cached, status: 200, fromCache: true };
  }

  let res;
  try {
    res = await attemptFetch(url);
  } catch (err) {
    // Network error or timeout — one retry, per Stage 5's rule.
    await sleep(1000);
    try {
      res = await attemptFetch(url);
    } catch (err2) {
      const e = new Error(`Network error fetching ${url}: ${err2.message}`);
      e.code = "NETWORK_ERROR";
      throw e;
    }
  }

  if (res.status >= 500 && res.status < 600) {
    await sleep(1000);
    res = await attemptFetch(url);
  }

  // Politeness delay after every real request, success or failure.
  await sleep(DELAY_MS);

  if (res.status !== 200) {
    const e = new Error(`Fetch failed for ${url}: HTTP ${res.status}`);
    e.code = "HTTP_ERROR";
    e.status = res.status;
    throw e;
  }

  const html = await res.text();
  await writeCache(url, html);
  console.log(`FETCH ${url} -> ${res.status} (${html.length} bytes)`);
  return { html, status: res.status, fromCache: false };
}

module.exports = { politeFetch, USER_AGENT };
