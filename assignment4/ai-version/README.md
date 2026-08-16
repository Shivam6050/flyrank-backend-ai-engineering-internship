# AI-generated Postgres containerization draft

This is a quick AI-generated version of the container setup for the task API.

## Dockerfile

FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]

## docker-compose.yml

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:password@localhost:5432/tasks
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: tasks
