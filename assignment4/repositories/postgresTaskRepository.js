const pool = require("../db/pool");

const SEED_TASKS = [
  { title: "Buy milk", done: false },
  { title: "Walk the dog", done: true },
  { title: "Finish CRUD assignment", done: false },
];

// Stage 1: create the table if missing, seed only if empty — the same
// first-run rule used for the SQLite version, now against Postgres.
// Seeding runs inside a transaction so it's all-or-nothing.
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done  BOOLEAN NOT NULL DEFAULT false
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done)`);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM tasks");

  if (rows[0].count === 0) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const t of SEED_TASKS) {
        await client.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", [t.title, t.done]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

function createPostgresTaskRepository() {
  const repository = {
    // server.js awaits this before accepting traffic, so the very first
    // request never races the table-creation/seed step.
    ready: ensureSchema(),

    async getAll({ done, search, sort, limit, offset } = {}) {
      let query = "SELECT * FROM tasks WHERE 1 = 1";
      const params = [];

      if (done !== undefined) {
        params.push(done);
        query += ` AND done = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        query += ` AND title ILIKE $${params.length}`;
      }

      query += sort === "title" ? " ORDER BY title" : " ORDER BY id";

      if (limit !== undefined) {
        params.push(limit);
        query += ` LIMIT $${params.length}`;
        params.push(offset || 0);
        query += ` OFFSET $${params.length}`;
      }

      const { rows } = await pool.query(query, params);
      return rows;
    },

    async getById(id) {
      const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
      return rows[0] || null;
    },

    async create(title) {
      const { rows } = await pool.query(
        "INSERT INTO tasks (title, done) VALUES ($1, false) RETURNING *",
        [title]
      );
      return rows[0];
    },

    async update(id, { title, done }) {
      const existing = await repository.getById(id);
      if (!existing) return null;

      const newTitle = title !== undefined ? title : existing.title;
      const newDone = done !== undefined ? done : existing.done;

      const { rows } = await pool.query(
        "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
        [newTitle, newDone, id]
      );
      return rows[0];
    },

    async remove(id) {
      const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
      return rowCount > 0;
    },

    async getStats() {
      const { rows } = await pool.query(
        "SELECT COUNT(*)::int AS total, COALESCE(SUM(done::int), 0)::int AS done FROM tasks"
      );
      const { total, done } = rows[0];
      return { total, done, open: total - done };
    },

    async reset() {
      await pool.query("DELETE FROM tasks");
      await pool.query("ALTER SEQUENCE tasks_id_seq RESTART WITH 1");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const t of SEED_TASKS) {
          await client.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", [t.title, t.done]);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      const { rows } = await pool.query("SELECT * FROM tasks ORDER BY id");
      return rows;
    },
  };

  return repository;
}

module.exports = { createPostgresTaskRepository, ensureSchema, SEED_TASKS };