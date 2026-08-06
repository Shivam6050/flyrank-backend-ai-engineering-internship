require("dotenv").config();
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");
const { createInMemoryTaskRepository } = require("./repositories/inMemoryTaskRepository");
const { createPostgresTaskRepository } = require("./repositories/postgresTaskRepository");
const { createTaskService } = require("./services/taskService");
const pool = require("./db/pool");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// The one place storage is chosen. Set STORAGE=memory to fall back to the
// A1 in-memory repository for comparison — every route below is identical
// either way, because both repositories implement the same interface.
const useMemory = process.env.STORAGE === "memory";
const repository = useMemory
  ? createInMemoryTaskRepository()
  : createPostgresTaskRepository();

const taskService = createTaskService(repository);

app.get("/", (req, res) => {
  res.status(200).json({
    name: "Task API",
    version: "3.0",
    storage: useMemory ? "in-memory" : "PostgreSQL (Docker)",
    endpoints: ["/tasks", "/tasks/:id", "/stats", "/reset", "/health", "/docs"],
  });
});

// Extra: a real health check that also pings the database, not just the
// process — real deploys gate on exactly this.
app.get("/health", async (req, res) => {
  if (useMemory) {
    return res.status(200).json({ status: "ok", db: "n/a" });
  }
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "ok" });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

app.get("/tasks", async (req, res, next) => {
  try {
    res.status(200).json(await taskService.listTasks(req.query));
  } catch (err) {
    next(err);
  }
});

app.get("/tasks/:id", async (req, res, next) => {
  try {
    const task = await taskService.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});

app.post("/tasks", async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

app.put("/tasks/:id", async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});

app.delete("/tasks/:id", async (req, res, next) => {
  try {
    const deleted = await taskService.deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get("/stats", async (req, res, next) => {
  try {
    res.status(200).json(await taskService.getStats());
  } catch (err) {
    next(err);
  }
});

app.post("/reset", async (req, res, next) => {
  try {
    const tasks = await taskService.resetTasks();
    res.status(200).json({ message: "Tasks reset to seed data", tasks });
  } catch (err) {
    next(err);
  }
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Central error handler — the service layer throws { status, message }
// errors (e.g. 400 validation failures); this is the only place that
// becomes a response.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

async function start() {
  // Wait for table creation + seed before accepting any requests, so the
  // very first hit can never race the schema setup.
  await repository.ready;

  app.listen(PORT, () => {
    console.log(`Task API listening on http://localhost:${PORT}`);
    console.log(`Storage: ${useMemory ? "in-memory" : "PostgreSQL"}`);
    console.log(`Swagger UI at http://localhost:${PORT}/docs`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

module.exports = app;