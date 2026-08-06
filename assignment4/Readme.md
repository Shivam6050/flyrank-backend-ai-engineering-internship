# Assignment 4 - Task API

A CRUD API for a to-do list backed by PostgreSQL and packaged for Docker.

## Requirements

- Node.js 20+
- Docker and Docker Compose (recommended for PostgreSQL)
- PostgreSQL (when running without Docker)

## Setup

1. Copy the environment sample:

   ```bash
   cp .env.example .env
   ```

2. If running locally, update `.env` as needed. Example values are already set for:

   - `DATABASE_URL`
   - `PORT`
   - `STORAGE`

3. Install dependencies:

   ```bash
   npm install
   ```

## Run locally with PostgreSQL

1. Start a local PostgreSQL instance and confirm it is reachable at the `DATABASE_URL` in `.env`.

2. Start the server:

   ```bash
   npm start
   ```

3. Open the API docs at:

   ```
   http://localhost:3000/docs
   ```

## Run locally without PostgreSQL

1. Start the server using the in-memory fallback:

   ```bash
   npm run start:memory
   ```

2. Open the API docs at:

   ```
   http://localhost:3000/docs
   ```

## Run with Docker Compose

1. Ensure Docker Desktop or Docker CLI is installed and available on your path.

2. Build and start the services:

   ```bash
   npm run docker:start
   ```

3. Stop the services:

   ```bash
   npm run docker:stop
   ```

4. The API will be available at:

   ```
   http://localhost:3000
   ```

5. The Postgres database is available at port `5432` on the host.

> If Docker is not installed on your system, use the local fallback instead:
>
> ```bash
> npm run start:memory
> ```

## Notes

- In Docker Compose, the API container connects to the database service using `postgres://postgres:dev@db:5432/tasks`.
- When running locally, keep `DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks` in `.env` or adjust as needed.
- Set `STORAGE=memory` in `.env` to run without Postgres.
- The app creates the `tasks` table automatically on startup if it does not exist.
