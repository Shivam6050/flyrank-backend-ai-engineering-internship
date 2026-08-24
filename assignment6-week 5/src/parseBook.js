const cheerio = require("cheerio");

/**
 * Extracts the eight raw fields from one book detail page. Selectors are
 * scoped to div.product_main (the product area) rather than the whole
 * document, per Stage 3's warning about "the first thing that looks like
 * a price."
 */
function parseBook(html, bookUrl, sourcePage) {
  const $ = cheerio.load(html);
  const main = $("div.product_main");

  const title = main.find("h1").text().trim();
  const price_text = main.find("p.price_color").first().text().trim();
  const availability_text = main
    .find("p.instock.availability")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const ratingClasses = main.find("p.star-rating").attr("class") || "";
  const rating_text = ratingClasses.split(" ").find((c) => c !== "star-rating") || null;

  // Some books have no description paragraph at all — store null, never
  // invent text that wasn't on the page.
  const descriptionEl = $("#product_description").next("p");
  const description = descriptionEl.length ? descriptionEl.text().trim() : null;

  return {
    title,
    product_url: bookUrl,
    price_text,
    availability_text,
    rating_text,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString(),
  };
}

module.exports = { parseBook };
