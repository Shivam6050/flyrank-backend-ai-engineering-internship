const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");
const { db, seedTasks, SEED_TASKS } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Prepared statements — reused across requests, values passed as
// parameters (never string-glued) via `?` placeholders.
const stmts = {
  getById: db.prepare("SELECT * FROM tasks WHERE id = ?"),
  insert: db.prepare("INSERT INTO tasks (title, done) VALUES (?, 0)"),
  update: db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?"),
  delete: db.prepare("DELETE FROM tasks WHERE id = ?"),
  stats: db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done FROM tasks"),
  clear: db.prepare("DELETE FROM tasks"),
  resetSequence: db.prepare("DELETE FROM sqlite_sequence WHERE name = 'tasks'"),
};

// SQLite stores `done` as 0/1 — map it to a real boolean for API responses.
function rowToTask(row) {
  return { id: row.id, title: row.title, done: !!row.done };
}

// ---------------------------------------------------------------------------
// Stage 1 carryover: root + health (unchanged from A1 — no storage involved)
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Task API",
    version: "2.0",
    storage: "SQLite (tasks.db)",
    endpoints: ["/tasks", "/tasks/:id", "/stats", "/reset", "/health", "/docs"],
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Stage 1: Read — now backed by SQL SELECTs instead of array lookups
// ---------------------------------------------------------------------------
app.get("/tasks", (req, res) => {
  const { done, search, sort, limit, offset } = req.query;

  let query = "SELECT * FROM tasks WHERE 1 = 1";
  const params = [];

  if (done !== undefined) {
    query += " AND done = ?";
    params.push(done === "true" ? 1 : 0);
  }

  if (search) {
    query += " AND title LIKE ?";
    params.push(`%${search}%`);
  }

  query += sort === "title" ? " ORDER BY title" : " ORDER BY id";

  if (limit !== undefined) {
    query += " LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset) || 0);
  }

  const rows = db.prepare(query).all(...params);
  res.status(200).json(rows.map(rowToTask));
});

app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = stmts.getById.get(id);

  if (!row) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.status(200).json(rowToTask(row));
});

// ---------------------------------------------------------------------------
// Stage 2: Create — INSERT instead of push, same validation as A1
// ---------------------------------------------------------------------------
app.post("/tasks", (req, res) => {
  const { title } = req.body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required and cannot be empty" });
  }

  const result = stmts.insert.run(title.trim());
  const created = stmts.getById.get(result.lastInsertRowid);

  res.status(201).json(rowToTask(created));
});

// ---------------------------------------------------------------------------
// Stage 3: Update + Delete — UPDATE / DELETE instead of splice
// ---------------------------------------------------------------------------
app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = stmts.getById.get(id);

  if (!existing) {
    return res.status(404).json({ error: "Task not found" });
  }

  const { title, done } = req.body ?? {};

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: "Provide at least one of: title, done" });
  }

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return res.status(400).json({ error: "title must be a non-empty string" });
  }

  if (done !== undefined && typeof done !== "boolean") {
    return res.status(400).json({ error: "done must be true or false" });
  }

  const newTitle = title !== undefined ? title.trim() : existing.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : existing.done;

  stmts.update.run(newTitle, newDone, id);
  const updated = stmts.getById.get(id);

  res.status(200).json(rowToTask(updated));
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = stmts.getById.get(id);

  if (!existing) {
    return res.status(404).json({ error: "Task not found" });
  }

  stmts.delete.run(id);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Extras: stats computed in SQL, reset re-seeds via the same transaction
// used on first boot
// ---------------------------------------------------------------------------
app.get("/stats", (req, res) => {
  const { total, done } = stmts.stats.get();
  res.status(200).json({ total, done, open: total - done });
});

app.post("/reset", (req, res) => {
  stmts.clear.run();
  stmts.resetSequence.run(); // so ids restart at 1, matching a fresh tasks.db
  seedTasks(SEED_TASKS);

  const rows = db.prepare("SELECT * FROM tasks ORDER BY id").all();
  res.status(200).json({ message: "Tasks reset to seed data", tasks: rows.map(rowToTask) });
});

// ---------------------------------------------------------------------------
// Swagger UI at /docs (unchanged from A1)
// ---------------------------------------------------------------------------
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/docs`);
  console.log(`Data persisted in tasks.db`);
});

module.exports = app;