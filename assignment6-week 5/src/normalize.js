const RATING_WORDS = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };

/** "£51.77" -> 51.77 */
function parsePriceGBP(priceText) {
  const digitsAndDot = (priceText || "").replace(/[^0-9.]/g, "");
  const value = parseFloat(digitsAndDot);
  return Number.isFinite(value) ? value : null;
}

/** "Three" -> 3 */
function parseRating(ratingText) {
  if (!ratingText) return null;
  return RATING_WORDS[ratingText] ?? null;
}

module.exports = { parsePriceGBP, parseRating };
