const { z } = require("zod");

// The shape of a finished, storable record. price_gbp and rating_value are
// the clean values; price_text and rating_text stay alongside them as the
// raw originals, per Stage 4 ("the raw value and the clean value live side
// by side").
const BookRecordSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string().min(1),
  price_gbp: z.number().positive(),
  availability_text: z.string().min(1),
  rating_text: z.string().nullable(),
  rating_value: z.number().int().min(1).max(5).nullable(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string().datetime(),
});

function validateRecord(record) {
  const result = BookRecordSchema.safeParse(record);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const reason = result.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { valid: false, reason };
}

module.exports = { BookRecordSchema, validateRecord };
