# Auth API

A production-ready authentication API built with Express and Supabase Auth.

## Prerequisites

- Node.js v18+
- A Supabase project (free tier)

## Setup

```bash
npm install
cp .env.example .env
# fill in SUPABASE_URL and SUPABASE_KEY
node index.js
```

Server runs on `http://localhost:3000`. Swagger docs at `/docs`.

## API Reference

| Method | Path                 | Auth Required | Status Codes       |
|--------|----------------------|:--------------:|---------------------|
| POST   | /auth/signup         | No             | 201, 400             |
| POST   | /auth/login          | No             | 200, 400, 401        |
| POST   | /auth/logout         | Yes            | 204, 401             |
| POST   | /auth/refresh        | No             | 200, 400, 401        |
| GET    | /public/info         | No             | 200                   |
| GET    | /protected/profile   | Yes            | 200, 401              |
| GET    | /protected/dashboard | Yes            | 200, 401              |
| GET    | /protected/admin     | Yes            | 200, 401, 403         |

## 401 vs 403

**401 Unauthorized** means the server doesn't know who you are — no
token, a malformed token, or a token that failed verification. **403
Forbidden** means the server knows exactly who you are, and your account
doesn't have permission for this action. `/protected/admin` returns 403
for a logged-in user who isn't an admin.

## Example curl commands

**Sign up:**
```bash
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Log in:**
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Access a protected route:**
```bash
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <access_token>"
```
