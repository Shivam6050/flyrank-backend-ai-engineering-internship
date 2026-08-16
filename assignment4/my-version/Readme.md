# Task API — CRUD To-Do List (now containerized, on Postgres)

FlyRank Internship Backend Track — third storage swap in the same project:
in-memory (assignment2) → SQLite (assignment3) → **PostgreSQL in Docker
(this one)**. Same endpoints, same request/response shapes — only the
storage layer changed, again.

## What this is

A CRUD to-do API that runs against a real PostgreSQL database, containerized
with Docker so the whole stack — app and database — starts with a single
`docker compose up`.

## Architecture: proving the swap is real

Storage access is isolated behind a **repository interface** — both
repositories below expose the exact same methods (`getAll`, `getById`,
`create`, `update`, `remove`, `getStats`, `reset`):

- `repositories/inMemoryTaskRepository.js` — the original A1 array-based
  store, refactored to the same shape.
- `repositories/postgresTaskRepository.js` — parameterized SQL against
  Postgres.

`services/taskService.js` holds all the validation and business rules
(missing-title checks, the 400/404 logic) and only ever talks to whichever
repository it's given — it has no idea whether that's an array or a
database. `server.js` picks the repository once, at startup, based on the
`STORAGE` env var:

```js
const repository = useMemory
  ? createInMemoryTaskRepository()
  : createPostgresTaskRepository();
```

No route was rewritten to make this swap — the same GET/POST/PUT/DELETE
handlers from assignment2 and assignment3 are unchanged here. That's the
whole point of the assignment: switching storage really does touch only
one layer.

## How to run it

**With Docker (recommended — this is the one-command path):**

```bash
cp .env.example .env
docker compose up --build -d
```

This builds the app image, starts Postgres with a persistent volume, waits
for Postgres to report healthy, then starts the app. `GET /tasks` at
`http://localhost:3000/tasks` returns the seeded tasks. Swagger UI is at
`http://localhost:3000/docs`.

**Without Docker (in-memory fallback, no database needed):**

```bash
npm install
STORAGE=memory npm start
```

## Environment variables

See `.env.example` (committed) — copy it to `.env` (git-ignored, never
committed) and adjust if needed.

| Variable       | Purpose                                              |
|----------------|-------------------------------------------------------|
| `DATABASE_URL` | Postgres connection string                            |
| `PORT`         | Port the app listens on (defaults to 3000)             |
| `STORAGE`      | Set to `memory` to bypass Postgres entirely (optional) |

## Endpoints

Identical across all three storage versions — clients can't tell which one
they're talking to.

| Method | Path          | Description                                                        | Success | Errors   |
|--------|---------------|---------------------------------------------------------------------|---------|----------|
| GET    | `/`           | API description                                                     | 200     | —        |
| GET    | `/health`     | Health check — pings the database with `SELECT 1`                   | 200     | 503      |
| GET    | `/tasks`      | List tasks (`?done=`, `?search=`, `?sort=title`, `?limit=`, `?offset=`) | 200 | —     |
| GET    | `/tasks/:id`  | Get one task                                                         | 200     | 404      |
| POST   | `/tasks`      | Create a task (`{ "title": "..." }`)                                 | 201     | 400      |
| PUT    | `/tasks/:id`  | Update a task (`title` and/or `done`)                                | 200     | 400, 404 |
| DELETE | `/tasks/:id`  | Delete a task                                                        | 204     | 404      |
| GET    | `/stats`      | `{ total, done, open }` (`COUNT`/`SUM` in SQL)                       | 200     | —        |
| POST   | `/reset`      | Clear the table and re-seed the 3 example tasks                      | 200     | —        |

## Example — curl

```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Persistence test"}'
```

Observed response:

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Persistence test","done":false}
```

## Persistence proof

I created a task named `Persistence test`, then restarted the stack with `docker compose down` and `docker compose up -d`.

Before restart:

```json
[{"id":1,"title":"Buy milk","done":false},{"id":2,"title":"Walk the dog","done":true},{"id":3,"title":"Finish CRUD assignment","done":false},{"id":4,"title":"Persistence test","done":false}]
```

After restart, the task was still present in `GET /tasks`, showing that the data survived the container recreation because the database lives in the Docker volume `taskdata`, not inside the container filesystem.

## Database proof

Verified directly in Postgres:

```bash
docker compose exec -T db psql -U postgres -d tasks -c '\dt' -c 'SELECT id, title, done FROM tasks ORDER BY id;'
```

Observed output:

```text
List of relations
 Schema | Name  | Type  |  Owner
--------+-------+-------+----------
 public | tasks | table | postgres

 id |         title          | done
----+------------------------+------
  1 | Buy milk               | f
  2 | Walk the dog           | t
  3 | Finish CRUD assignment | f
  4 | Persistence test       | f
(4 rows)
```

## Extras implemented

- Search: `GET /tasks?search=milk` (`ILIKE`)
- Filter by status: `GET /tasks?done=true`
- Sort alphabetically: `GET /tasks?sort=title`
- Pagination: `GET /tasks?limit=2&offset=2`
- Real statistics: `GET /stats` via `COUNT`/`SUM`
- An index on `done`, supporting the filter extra
- `GET /health` pings the database, not just the process — gates on
  `SELECT 1`, the way a load balancer or deploy pipeline would
- `docker-compose.yml` waits for Postgres's own healthcheck
  (`pg_isready`) before starting the app, via `depends_on.condition:
  service_healthy`
- Seeding wrapped in a transaction, same as the SQLite version

## Proof the API didn't change

The same curl commands and Swagger flows from assignment2 (in-memory) and
assignment3 (SQLite) work unmodified here — same paths, same request
bodies, same status codes. Three completely different storage engines,
one unchanged API on top.

## The mortality experiment, database edition

If the `taskdata` volume is removed, the database is recreated from an empty state on the next startup, so the previously stored rows disappear. The volume is what preserves the PostgreSQL data files across container removal and recreation; the container itself is only a process wrapper around that persistent storage.

## AI vs me (Stage 6 — bonus)

I wrote this prompt and saved the AI output under `ai-version/`:

```text
Create a Docker Compose setup for a Node.js CRUD API that uses PostgreSQL.
Make the API container connect to the database container, expose port 3000,
and use environment variables for the database connection. Keep the solution simple and production-friendly.
```

### Files created in `ai-version/`

- `ai-version/docker-compose.yml`
- `ai-version/Dockerfile`
- `ai-version/postgresTaskRepository.js`
- `ai-version/README.md`

### What the AI did better

- It produced a basic multi-container setup with an app and a database service.
- It used a PostgreSQL image and a database environment block.

### What the AI got wrong or ignored

- It used `localhost` in the database URL instead of the Docker Compose service name `db`.
- It did not add a healthcheck for Postgres.
- It did not define a persistent volume for Postgres data.
- It used a hardcoded password instead of a safer, explicit setup.
- It did not wait for the database to be ready before the app started.

### What my prompt forgot to specify

My prompt did not explicitly require:

- a healthcheck on Postgres,
- `depends_on.condition: service_healthy`,
- a named Docker volume for persistence,
- the correct Compose service hostname (`db`),
- a retry/wait strategy in the app startup logic.

Because of that, the AI silently chose a simpler but less reliable setup.

### Comparison to the real implementation

Compared with the actual files in this folder, the real solution is stronger because it:

- uses a healthcheck and waits for Postgres to become healthy,
- uses the correct `db` hostname for container-to-container networking,
- persists database data with a Docker volume,
- and handles the startup race between the API and the database more robustly.