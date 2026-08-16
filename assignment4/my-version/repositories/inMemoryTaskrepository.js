// The A1 storage layer, refactored behind the same interface the Postgres
// repository implements: getAll, getById, create, update, remove,
// getStats, reset. Nothing above this file (routes, service) can tell
// which repository it's talking to.

const SEED_TASKS = [
  { title: "Buy milk", done: false },
  { title: "Walk the dog", done: true },
  { title: "Finish CRUD assignment", done: false },
];

function createInMemoryTaskRepository() {
  let tasks = SEED_TASKS.map((t, i) => ({ id: i + 1, ...t }));
  let nextId = tasks.length + 1;

  return {
    ready: Promise.resolve(), // nothing to wait for — kept for interface parity

    async getAll({ done, search, sort, limit, offset } = {}) {
      let result = tasks;

      if (done !== undefined) {
        result = result.filter((t) => t.done === done);
      }
      if (search) {
        const needle = search.toLowerCase();
        result = result.filter((t) => t.title.toLowerCase().includes(needle));
      }

      result = [...result].sort((a, b) =>
        sort === "title" ? a.title.localeCompare(b.title) : a.id - b.id
      );

      if (limit !== undefined) {
        const off = offset || 0;
        result = result.slice(off, off + limit);
      }

      return result;
    },

    async getById(id) {
      return tasks.find((t) => t.id === id) || null;
    },

    async create(title) {
      const task = { id: nextId++, title, done: false };
      tasks.push(task);
      return task;
    },

    async update(id, { title, done }) {
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;
      if (title !== undefined) task.title = title;
      if (done !== undefined) task.done = done;
      return task;
    },

    async remove(id) {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      tasks.splice(index, 1);
      return true;
    },

    async getStats() {
      const total = tasks.length;
      const done = tasks.filter((t) => t.done).length;
      return { total, done, open: total - done };
    },

    async reset() {
      tasks = SEED_TASKS.map((t, i) => ({ id: i + 1, ...t }));
      nextId = tasks.length + 1;
      return tasks;
    },
  };
}

module.exports = { createInMemoryTaskRepository, SEED_TASKS };