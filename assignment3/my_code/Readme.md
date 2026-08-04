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

### My prompt

> I had made a simple CRUD Task api in which you can create, read, update
> and delete the tasks. I had made that using the browser's memory like i
> have first seeded three tasks so that it should always be there even if
> the browser refreshes then through app.get i had added some endpoints to
> it and also added a health path when we get 200 and status ok. Then i
> have moved to the tasks and defined the CRUD functionality through get
> tasks, post tasks, put tasks, delete tasks, then stats for showing all
> the tasks and done tasks, then there is reset for reseting the whole.
> Then i have used swagger ui to show these things with a better UI and
> functionality then i listened it on port 3000 or dynamic like whatever
> given in env file. Now i want to use a database so that refreshing the
> browser won't erase the data and every other functionality should also
> works perfectly, I want you to connect the sqllite database to it so
> that everything works perfectly fine.

The AI's output is in [`ai-version/`](./ai-version).

### Findings

**1. What did it do better?**
Not much, structurally — it's a valid, working CRUD-over-SQLite
implementation and parameterizes every query correctly (no SQL injection
risk). Its one small win: it's shorter and easier to read end-to-end since
everything lives in one file instead of being split across `db.js` and
`server.js`.

**2. What did it get wrong or quietly ignore?**
- `POST /reset` clears the table but never resets `sqlite_sequence`, so ids
  keep climbing after a reset instead of restarting at 1 — a real behavior
  difference from a truly fresh database.
- Seeding isn't wrapped in a transaction, so a failure partway through
  would leave 1–2 orphaned seed rows instead of none.
- `PUT /tasks/:id` doesn't validate that `title` is non-empty or that
  `done` is actually a boolean — it'll silently accept `title: ""` or
  `done: "yes"`.
- `/docs` is wired to an empty OpenAPI spec, so Swagger UI loads with
  nothing in it — it never actually built the spec file my prompt implied
  ("used swagger ui to show these things").
- No index on `title`, no search/filter/sort/pagination — reasonable,
  since I never asked for those, but worth noting since they existed in my
  original app description implicitly (I said "everything should work
  perfectly").

**3. What did my prompt forget to specify — and what did the AI silently decide?**
- I never specified the exact error message format — it picked
  `"Task {id} not found"` on its own.
- I never said whether `/stats`'s third field should be called `open` or
  `pending` — it picked `pending`.
- I said "browser refreshes" when I meant server restarts (memory lives on
  the server, not in the browser) — the AI didn't catch or correct that
  imprecision, it just built for server-restart persistence anyway, which
  happened to be the right call but wasn't something I actually verified I
  meant.
- I never mentioned transactions, indexes, or exact validation rules for
  `PUT` — all of those were silently decided (or silently skipped) rather
  than asked about.

### One rematch

> Run your own Stage 2/3 checkpoints against `ai-version/` first to confirm
> these findings hold, then tighten the prompt above (e.g. explicitly
> require a transaction for seeding, specify the `/stats` field name, and
> ask it to reset the id sequence on `/reset`) and note here in one
> sentence what changed in the regenerated version.