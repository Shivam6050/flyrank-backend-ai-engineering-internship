// Business rules live here, not in the routes or the repository. This file
// never imports pg or an array — it only calls whatever repository it's
// handed, so it works identically whether that's the in-memory one or the
// Postgres one.

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function createTaskService(repository) {
  return {
    async listTasks(query = {}) {
      const { done, search, sort, limit, offset } = query;
      return repository.getAll({
        done: done !== undefined ? done === "true" : undefined,
        search,
        sort,
        limit: limit !== undefined ? Number(limit) : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      });
    },

    async getTask(id) {
      return repository.getById(Number(id));
    },

    async createTask(body) {
      const { title } = body ?? {};

      if (!title || typeof title !== "string" || !title.trim()) {
        throw badRequest("title is required and cannot be empty");
      }

      return repository.create(title.trim());
    },

    async updateTask(id, body) {
      const existing = await repository.getById(Number(id));
      if (!existing) return null;

      const { title, done } = body ?? {};

      if (title === undefined && done === undefined) {
        throw badRequest("Provide at least one of: title, done");
      }
      if (title !== undefined && (typeof title !== "string" || !title.trim())) {
        throw badRequest("title must be a non-empty string");
      }
      if (done !== undefined && typeof done !== "boolean") {
        throw badRequest("done must be true or false");
      }

      return repository.update(Number(id), {
        title: title !== undefined ? title.trim() : undefined,
        done,
      });
    },

    async deleteTask(id) {
      return repository.remove(Number(id));
    },

    async getStats() {
      return repository.getStats();
    },

    async resetTasks() {
      return repository.reset();
    },
  };
}

module.exports = { createTaskService };