const cheerio = require("cheerio");

/**
 * Extracts every book link and the "next page" link from one catalogue page.
 * Links in the HTML are relative (e.g. "a-light-in-the-attic_1000/index.html")
 * — every one is resolved against pageUrl with the URL constructor, never by
 * gluing strings together.
 */
function parseCatalogue(html, pageUrl) {
  const $ = cheerio.load(html);

  const bookLinks = $("article.product_pod h3 a")
    .map((_, el) => new URL($(el).attr("href"), pageUrl).toString())
    .get();

  const nextHref = $("li.next a").attr("href");
  const nextPageUrl = nextHref ? new URL(nextHref, pageUrl).toString() : null;

  return { bookLinks, nextPageUrl };
}

module.exports = { parseCatalogue };
