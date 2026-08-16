require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_KEY. Copy .env.example to .env and fill in your project values."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
