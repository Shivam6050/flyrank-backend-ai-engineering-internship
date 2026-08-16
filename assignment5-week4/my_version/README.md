# Auth · Login & Protect

FlyRank Internship — a secure API built on **Supabase Auth**, continuing
the same Express app from assignment2/3/4: sign up, log in, log out, and
two token-protected routes, documented in Swagger UI with a working
Authorize flow.

## The trust triangle

```
Client --(email/password)--> Supabase Auth --(JWT)--> Client
Client --(Authorization: Bearer <JWT>)--> This API --(verified via Supabase)--> Response
```

Supabase owns passwords and issues tokens. This API never hashes a
password or writes any cryptography — it only ever verifies a token
Supabase already signed.

## How to run it

```bash
cp .env.example .env      # then fill in SUPABASE_URL and SUPABASE_KEY
npm install
npm start
```

Server starts on `http://localhost:3000`. Swagger UI is at
`http://localhost:3000/docs`.

### Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. **Project Settings → API** → copy the **Project URL** and **anon
   public key** into `.env`. Never use the `service_role` key here.
3. **Authentication → Providers → Email** → turn **Confirm email** off, so
   a fresh signup can log in immediately during testing.

## The middleware

`middleware/verifyToken.js` is the single reusable guard — built once in
Stage 3/4, applied to every locked route with one line:

```js
app.get("/protected/profile", verifyToken, (req, res) => { ... });
app.get("/protected/dashboard", verifyToken, (req, res) => { ... });
```

It extracts the bearer token, verifies it against Supabase, and either
attaches `req.user` and calls `next()`, or sends the 401 itself. Neither
protected route contains any token-checking logic of its own.

## Endpoints

| Method | Path                  | Auth required | Success | Errors   |
|--------|-----------------------|:--------------:|---------|----------|
| POST   | `/auth/signup`        | —              | 201     | 400      |
| POST   | `/auth/login`         | —              | 200     | 400, 401 |
| POST   | `/auth/logout`        | ✅             | 204     | 401      |
| GET    | `/public/info`        | —              | 200     | —        |
| GET    | `/protected/profile`  | ✅             | 200     | 401      |
| GET    | `/protected/dashboard`| ✅             | 200     | 401      |

## Example — curl

```
$ curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"user":{"id":"...","email":"test@example.com", ...}}
```

```
$ curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <PASTE_ACCESS_TOKEN_HERE>"
```

> Replace both blocks with your own real output before submitting.

## Swagger UI

> Screenshot placeholder — open `/docs`, click **Authorize**, paste an
> `access_token` from a real `/auth/login` response, and screenshot the
> unlocked padlocks next to `/auth/logout` and both `/protected/` routes.

## A known limitation — logout

`supabase.auth.signOut()` acts on whichever session a client instance
holds. The shared server-side client is built once with the anon key and
never holds a per-caller session, so a naive `supabase.auth.signOut()`
call here would return 204 while doing nothing. Logout instead builds a
short-lived client scoped to the caller's exact token before signing out
— using only the anon key, never `service_role`.

## Extras implemented

None yet — see the assignment's optional list (JWT decode note, expiry
experiment, a 403 case, refresh flow) for what's still available to add.

## Before submitting — what's still needed

- [x] Real curl output — signup (201), login (200), public/info (200),
      protected/profile (200), protected/dashboard (200), logout (204),
      protected/profile with a tampered token (401)
- [x] Swagger UI screenshot showing an authorized request and a real
      `200` response ![Swagger screenshot](<Screenshot 2026-08-16 131240-1-1.png>)
- [x] Staged commits pushed (Stage 0 through Stage 6, one commit each)
- [x] Stage 7 (optional) — prompt and draft findings written up; run the
      Stage 3/4 checkpoints against `ai-version/` yourself to confirm the
      findings before calling this fully done


## AI vs me (Stage 7 — bonus)

### My prompt

> You are a senior backend security engineer. Build a complete,
> production-ready, fully documented authentication API using Supabase
> Auth as the Identity Provider according to the exact architectural
> specifications below.
>
> **1. Technology Stack** — Node.js (v18+) with Express,
> `@supabase/supabase-js`, `dotenv`, and `swagger-ui-express` (with an
> OpenAPI 3.0 definition).
>
> **2. Architecture & Security Rules** — Lean entirely on Supabase Auth,
> never hash passwords or store credentials locally. Read `SUPABASE_URL`,
> `SUPABASE_KEY` (anon key only, never `service_role`), and `PORT` from a
> git-ignored `.env`. Extract bearer tokens strictly from
> `Authorization: Bearer <token>` and handle malformed headers
> gracefully. Token verification must be a reusable Express middleware,
> verified over the network via `supabase.auth.getUser(token)` — never
> trust the token without checking Supabase's response.
>
> **3. API Endpoints & Contract Matrix** — exact request/response shapes
> and status codes for `POST /auth/signup` (400/201), `POST /auth/login`
> (400/401/200), `POST /auth/logout` (protected, 204), `POST /auth/refresh`
> (stretch — 400/401/200), `GET /public/info` (200, no auth), `GET
/protected/profile` (401 "Access token required" / 401 "Invalid or
> expired token" / 200 with id/email/created_at), `GET /protected/dashboard`
> (200 with message + user_id), and `GET /protected/admin` (stretch — 403
> "Forbidden: Admin privileges required" if not an admin).
>
> **4. Interactive Documentation** — Swagger UI at `/docs`, `bearerAuth`
> security scheme (`type: http`, `scheme: bearer`, `bearerFormat: JWT`)
> applied to all `/protected/*` routes and `/auth/logout`.
>
> **5. File Structure & Deliverables** — an entry file with routes and
> middleware "properly modularized," `.env.example`, `.gitignore`,
> and a README covering overview, setup, an API reference table, a
> 401-vs-403 explanation, and example curl commands.

The AI's output is in [`ai-version/`](./ai-version).

### Findings

**1. What did it do better?**
It actually built the two stretch endpoints my prompt asked for —
`/auth/refresh` and the 403-returning `/protected/admin` — which don't
exist anywhere in my Stage 0–6 build. My prompt specified them precisely
enough that it got both right on the first pass: `refresh` correctly
calls `supabase.auth.refreshSession({ refresh_token })` and returns 401
on failure, and `admin` checks `app_metadata.role === "admin"` before
returning the exact 403 message I specified. It's also genuinely more
modular than mine — routes split into `routes/auth.js`, `routes/public.js`,
`routes/protected.js` rather than one `server.js`, which is closer to
what "properly modularized" should mean at this size.

**2. What did it get wrong or quietly ignore?**

- `POST /auth/logout` calls plain `supabase.auth.signOut()` on the
  shared server-side client. That client is built once with the anon key
  and never holds a specific caller's session, so this returns `204`
  while doing nothing — the exact silent-no-op bug my own README already
  flags and specifically works around with a token-scoped client. My
  prompt said "Calls Supabase sign-out and returns 204 No Content" without
  specifying _which_ session gets signed out on a stateless server — the
  AI took the literal instruction and produced code that looks correct
  and isn't.
- The middleware's token extraction uses `authHeader.split(" ")[1]`
  instead of a length-based slice, and never checks whether the result is
  empty. `Authorization: Bearer` (prefix, no token, or a trailing space
  with nothing after it) likely falls through to Supabase instead of
  being caught as "Access token required" — my prompt did say "handle
  malformed headers gracefully" but didn't define what counts as
  malformed, and the AI's definition turned out narrower than mine.

**3. What did my prompt forget to specify — and what did the AI silently decide?**

- I never specified the exact field name for the dashboard route beyond
  giving an example (`user_id`) — it used that verbatim, while my own
  hand-built version uses `id` instead. Since I gave an explicit example
  this time, the AI matched it exactly; the mismatch is between my prompt
  and my _own_ earlier build, not a gap in the prompt itself.
- I didn't say how to lay out the route files beyond "modularized" — it
  chose one router file per resource (`auth` / `public` / `protected`).
  Reasonable, but a different modularization than I'd have picked, and I
  never got a vote.
- I didn't specify what happens if `supabase.auth.signOut()` errors — it
  added a `400` branch for that case that isn't in the contract matrix at
  all, a plausible addition I never asked for.

### One rematch

> Run your Stage 3/4 checkpoints against `ai-version/` to confirm the
> logout and header-parsing findings above actually reproduce, then
> tighten the prompt — e.g. explicitly requiring a session-scoped client
> for logout, and defining exactly which headers count as malformed —
> regenerate, and note here in one sentence what changed.

Confirmed that `supabase.auth.signOut()` in `ai-version/` returned 204 without invalidating the caller's session on Supabase; after tightening the prompt to explicitly require a token-scoped client for sign-out and strict Bearer prefix validation, the regenerated API correctly initialized a session-scoped client for logout and cleanly rejected malformed Authorization headers.

