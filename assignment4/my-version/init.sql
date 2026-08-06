-- Reference schema. The app creates this automatically on startup
-- (see repositories/postgresTaskRepository.js) — this file exists so you
-- can also inspect or run it by hand via psql if useful.

CREATE TABLE IF NOT EXISTS tasks (
    id    SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    done  BOOLEAN NOT NULL DEFAULT false
);

-- Supports the ?done= filter extra.
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);