const express = require("express");
const swaggerUi = require("swagger-ui-express");
const Database = require("better-sqlite3");

const app = express();
app.use(express.json());

const db = new Database("tasks.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

const seedTasks = [
  { title: "Buy groceries", done: 0 },
  { title: "Clean the house", done: 0 },
  { title: "Finish assignment", done: 1 },
];

const existing = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();
if (existing.count === 0) {
  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  seedTasks.forEach((t) => insert.run(t.title, t.done));
}

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Task API is running",
    endpoints: ["/tasks", "/health", "/stats", "/reset", "/docs"],
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/tasks", (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks").all();
  res.status(200).json(tasks);
});

app.get("/tasks/:id", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });
  res.status(200).json(task);
});

app.post("/tasks", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const result = db.prepare("INSERT INTO tasks (title, done) VALUES (?, 0)").run(title);
  const newTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(newTask);
});

app.put("/tasks/:id", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });

  const { title, done } = req.body;
  const updatedTitle = title !== undefined ? title : task.title;
  const updatedDone = done !== undefined ? (done ? 1 : 0) : task.done;

  db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(
    updatedTitle,
    updatedDone,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.status(200).json(updated);
});

app.delete("/tasks/:id", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });

  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

app.get("/stats", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
  const done = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE done = 1").get().count;
  res.status(200).json({ total, done, pending: total - done });
});

app.post("/reset", (req, res) => {
  db.prepare("DELETE FROM tasks").run();
  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  seedTasks.forEach((t) => insert.run(t.title, t.done));
  res.status(200).json({ message: "Tasks reset" });
});

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Task API",
    version: "1.0.0",
    description: "A task management API with SQLite",
  },
  paths: {
    "/": {
      get: {
        summary: "API root",
        responses: {
          "200": {
            description: "API metadata",
          },
        },
      },
    },
    "/tasks": {
      get: {
        summary: "List all tasks",
        responses: {
          "200": {
            description: "A list of tasks",
          },
        },
      },
      post: {
        summary: "Create a new task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                },
                required: ["title"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Task created" },
        },
      },
    },
    "/tasks/{id}": {
      get: {
        summary: "Get a task by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: { "200": { description: "Task details" } },
      },
      put: {
        summary: "Update a task",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  done: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Task updated" } },
      },
      delete: {
        summary: "Delete a task",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: { "204": { description: "Task deleted" } },
      },
    },
    "/stats": {
      get: {
        summary: "Get task stats",
        responses: { "200": { description: "Statistics" } },
      },
    },
    "/reset": {
      post: {
        summary: "Reset tasks",
        responses: { "200": { description: "Tasks reset" } },
      },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}. Swagger UI available at http://localhost:${PORT}/docs`));

module.exports = app;