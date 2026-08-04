const Database = require("better-sqlite3");

// Opening a file that doesn't exist yet creates it — this line is what
// creates tasks.db the very first time the app runs.
const db = new Database("tasks.db");
db.pragma("journal_mode = WAL");

// ---------------------------------------------------------------------------
// Stage 0: schema — created only if it doesn't already exist, so restarting
// the app never wipes or redefines the table.
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

// Stretch: an index on title, since the search/sort extras filter and order
// by it. Speeds up WHERE title LIKE ? and ORDER BY title as the table grows.
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title)`);

const insertTask = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");

const SEED_TASKS = [
  { title: "Buy milk", done: 0 },
  { title: "Walk the dog", done: 1 },
  { title: "Finish CRUD assignment", done: 0 },
];

// Stretch: wrapped in a transaction so seeding is all-or-nothing — if the
// second or third insert failed partway through, the whole batch rolls back
// instead of leaving the table with 1 or 2 orphaned seed rows.
const seedTasks = db.transaction((tasksToInsert) => {
  for (const t of tasksToInsert) {
    insertTask.run(t.title, t.done);
  }
});

function seedIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();
  if (count === 0) {
    seedTasks(SEED_TASKS);
  }
}

// Stage 0: seed exactly once — only when the table is empty. This is what
// stops the examples multiplying on every restart.
seedIfEmpty();

module.exports = { db, seedTasks, SEED_TASKS, seedIfEmpty };