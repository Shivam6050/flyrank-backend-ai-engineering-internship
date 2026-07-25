# Task API — CRUD To-Do List

A small in-memory REST API for managing a to-do list, built for the FlyRank
Internship Backend Track — Week 2, Assignment A1.

## What this is

Four CRUD operations over an in-memory list of tasks, built with Node.js +
Express, documented with Swagger UI, no database. Data resets whenever the
server restarts — that's expected (see "The mortality experiment" below).

## How to run it

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`. Visit `http://localhost:3000/docs`
for the interactive Swagger UI.

## Endpoints

| Method | Path          | Description                          | Success | Errors        |
|--------|---------------|---------------------------------------|---------|----------------|
| GET    | `/`           | API description                       | 200     | —              |
| GET    | `/health`     | Health check                          | 200     | —              |
| GET    | `/tasks`      | List tasks (supports `?done=`, `?search=`, `?limit=`, `?offset=`) | 200 | — |
| GET    | `/tasks/:id`  | Get one task                          | 200     | 404            |
| POST   | `/tasks`      | Create a task (`{ "title": "..." }`)  | 201     | 400            |
| PUT    | `/tasks/:id`  | Update a task (`title` and/or `done`) | 200     | 400, 404       |
| DELETE | `/tasks/:id`  | Delete a task                         | 204     | 404            |
| GET    | `/stats`      | `{ total, done, open }` counts        | 200     | —              |
| POST   | `/reset`      | Restore the 3 seed tasks              | 200     | —              |

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

## Swagger UI

> Paste your `/docs` screenshot here before submitting.

## The mortality experiment

> Create a few tasks, restart the server, then `GET /tasks`. Write two
> sentences here about what happened and why (this is the reason Week 3 —
> databases — exists).

## Extras implemented

- Filtering: `GET /tasks?done=true`
- Search: `GET /tasks?search=milk`
- Pagination: `GET /tasks?limit=2&offset=2`
- Stats endpoint: `GET /stats`
- Seed & reset: `POST /reset`

## AI vs me (Stage 7 — bonus)

> This section is the actual exercise for Stage 7: write your own prompt
> (from memory, without copying this repo's code) asking an AI to build the
> same API, put its output in `ai-version/`, run it against your Stage 4
> checkpoint curls, diff it against your own code, and answer:
>
> 1. What did the AI do better — and do you understand its version well
>    enough to explain it?
> 2. What did it get wrong or quietly ignore from your prompt?
> 3. What did your prompt forget to specify — and what did the AI silently
>    decide for you?
>
> Paste your full prompt and findings here.