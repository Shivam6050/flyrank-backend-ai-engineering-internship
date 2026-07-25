const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// Stage 2: in-memory "database" — a plain array, pre-filled with 3 tasks.
// Data lives only in memory: it resets every time the server restarts.
// ---------------------------------------------------------------------------
const SEED_TASKS = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Walk the dog", done: true },
  { id: 3, title: "Finish CRUD assignment", done: false },
];

let tasks = SEED_TASKS.map((t) => ({ ...t }));
let nextId = tasks.length + 1;

// ---------------------------------------------------------------------------
// Stage 1: root + health
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks", "/tasks/:id", "/stats", "/reset", "/health", "/docs"],
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Stage 2: Read — list + single task
// Stretch extras included here: ?done=, ?search=, ?limit=&offset=
// ---------------------------------------------------------------------------
app.get("/tasks", (req, res) => {
  let result = tasks;

  const { done, search, limit, offset } = req.query;

  if (done !== undefined) {
    const wantDone = done === "true";
    result = result.filter((t) => t.done === wantDone);
  }

  if (search) {
    const needle = String(search).toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(needle));
  }

  if (limit !== undefined || offset !== undefined) {
    const off = Number(offset) || 0;
    const lim = limit !== undefined ? Number(limit) : result.length;
    result = result.slice(off, off + lim);
  }

  res.status(200).json(result);
});

app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.status(200).json(task);
});

// ---------------------------------------------------------------------------
// Stage 3: Create
// ---------------------------------------------------------------------------
app.post("/tasks", (req, res) => {
  const { title } = req.body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required and cannot be empty" });
  }

  const newTask = { id: nextId++, title: title.trim(), done: false };
  tasks.push(newTask);

  res.status(201).json(newTask);
});

// ---------------------------------------------------------------------------
// Stage 4: Update + Delete
// ---------------------------------------------------------------------------
app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body ?? {};

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: "Provide at least one of: title, done" });
  }

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title must be a non-empty string" });
    }
    task.title = title.trim();
  }

  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "done must be true or false" });
    }
    task.done = done;
  }

  res.status(200).json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  tasks.splice(index, 1);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Extras: stats + reset
// ---------------------------------------------------------------------------
app.get("/stats", (req, res) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  res.status(200).json({ total, done, open: total - done });
});

app.post("/reset", (req, res) => {
  tasks = SEED_TASKS.map((t) => ({ ...t }));
  nextId = tasks.length + 1;
  res.status(200).json({ message: "Tasks reset to seed data", tasks });
});

// ---------------------------------------------------------------------------
// Stage 5: Swagger UI at /docs
// ---------------------------------------------------------------------------
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// ---------------------------------------------------------------------------
// 404 fallback for anything else
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/docs`);
});

module.exports = app;