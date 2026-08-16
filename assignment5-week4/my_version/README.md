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

## AI vs me (Stage 7 — bonus)

> Write your own prompt from memory (framework, Supabase integration, the
> five routes, status codes, middleware-based token verification, Swagger
> bearer setup) and generate a comparison in `ai-version/`. Specifically
> worth checking against this build:
>
> 1. Did it parse the `Bearer ` prefix correctly, or would
>    `Authorization: <token>` (no prefix) slip through or crash it?
> 2. Did it safely reject an invalid token, or trust `getUser` without
>    checking the error?
> 3. Did it handle logout correctly, or silently no-op like the naive
>    `supabase.auth.signOut()` call would?
> 4. What did your prompt forget to specify — and what did the AI
>    silently decide?
>
> Paste your full prompt and findings here.
