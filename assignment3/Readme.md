# Task API — CRUD To-Do List (now backed by SQLite)

FlyRank Internship Backend Track — Week 3, Assignment A2. This is a direct
continuation of [Week 2's in-memory API](../assignment2) — same endpoints,
same request/response shapes, only the storage layer changed.

## Why SQLite

SQLite is a single file on disk with no separate server to install or run —
`tasks.db` is created automatically the first time the app starts. That's
enough for this stage of the project: no setup, no credentials, and (unlike
Week 2) data now survives a restart. A real multi-user production system
would likely graduate to something like Postgres, but the client-facing API
doesn't change either way — that's the whole point of separating the API
from its storage layer.

## How to run it

```bash
npm install
npm start
```

The server starts on `http://localhost:3000` and creates `tasks.db` in the
project folder the first time it runs, seeded with 3 example tasks.
Swagger UI is at `http://localhost:3000/docs`.

`tasks.db` is git-ignored, so every fresh clone starts from a clean,
auto-seeded database.

## Endpoints

Identical to Week 2 — clients cannot tell the storage changed.

| Method | Path          | Description                                                        | Success | Errors   |
|--------|---------------|---------------------------------------------------------------------|---------|----------|
| GET    | `/`           | API description                                                     | 200     | —        |
| GET    | `/health`     | Health check                                                         | 200     | —        |
| GET    | `/tasks`      | List tasks (`?done=`, `?search=`, `?sort=title`, `?limit=`, `?offset=`) | 200 | —     |
| GET    | `/tasks/:id`  | Get one task                                                         | 200     | 404      |
| POST   | `/tasks`      | Create a task (`{ "title": "..." }`)                                 | 201     | 400      |
| PUT    | `/tasks/:id`  | Update a task (`title` and/or `done`)                                | 200     | 400, 404 |
| DELETE | `/tasks/:id`  | Delete a task                                                        | 204     | 404      |
| GET    | `/stats`      | `{ total, done, open }` (computed with `COUNT`/`SUM` in SQL)         | 200     | —        |
| POST   | `/reset`      | Clear the table and re-seed the 3 example tasks                      | 200     | —        |

## Example — curl

```
$ curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'

HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Buy milk","done":false}
```

> Replace this block with your own real `curl -i` output before submitting.

## Persistence proof

> Create a task, stop the server, start it again, `GET /tasks` — paste the
> before/after here, or describe what you saw and why it's different from
> Week 2.

## Stage 4 — SQL by hand (DB Browser)

Example query run directly in DB Browser for SQLite:

```sql
SELECT * FROM tasks WHERE done = 1;
```

> Replace with the query you actually ran and one sentence on what it
> returned. Also paste your DB Browser screenshot below.

> Screenshot placeholder — paste your DB Browser screenshot here.

## Extras implemented

- Search: `GET /tasks?search=milk` (`WHERE title LIKE ?`)
- Filter by status: `GET /tasks?done=true` (`WHERE done = ?`)
- Sort alphabetically: `GET /tasks?sort=title` (`ORDER BY title`)
- Pagination: `GET /tasks?limit=2&offset=2`
- Real statistics: `GET /stats` computed with `COUNT`/`SUM` in SQL
- Index on `title` (`CREATE INDEX idx_tasks_title`), since search and sort
  both filter/order by it
- Seeding wrapped in a SQLite transaction (`db.transaction(...)` in `db.js`)
  so the 3 seed inserts are all-or-nothing

## Proof the API didn't change

The Week 2 curl commands and Swagger "Try it out" flow work unmodified
against this version — same paths, same request bodies, same status codes.
Identical tests passing against a completely different storage layer is the
proof that storage really is just an implementation detail behind the API.

## AI vs me (Stage 6 — bonus)

> This is the actual exercise for Stage 6: write your own prompt (from
> memory, without copying this repo or the assignment doc) asking an AI to
> migrate an in-memory CRUD API to SQLite. Put its output in `ai-version/`,
> run your Stage 2/3 checkpoints against it, diff it against `db.js` /
> `server.js`, and answer:
>
> 1. What did it do better — and can you explain it (transactions, schema,
>    parameter binding)?
> 2. What did it get wrong or quietly ignore (seeds that multiply,
>    string-glued SQL, a changed status code)?
> 3. What did your prompt forget to specify — and what did the AI silently
>    decide for you?
>
> Paste your full prompt and findings here.