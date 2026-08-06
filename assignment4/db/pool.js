require("dotenv").config();
const { Pool } = require("pg");

// A single shared pool for the whole app. Connection details come entirely
// from the environment (DATABASE_URL) — never hardcoded here.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;