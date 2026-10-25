const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const taskStore = require('../electron/taskStore.cjs');

describe('TaskStore Engine: Validation, Persistence, and Concurrency', () => {
  const filePath = taskStore.getTasksFilePath();
  const storageDir = path.dirname(filePath);

  beforeEach(async () => {
    // Ensure clean directory
    await fs.promises.mkdir(storageDir, { recursive: true });
    await fs.promises.writeFile(filePath, '[]', 'utf8');
  });

  afterEach(async () => {
    // Clean up directory
    try {
      const files = await fs.promises.readdir(storageDir);
      for (const file of files) {
        await fs.promises.unlink(path.join(storageDir, file)).catch(() => {});
      }
    } catch (e) {}
  });

  it('TC-AUTO-01: Creates task with default priority and timestamps', async () => {
    const task = await taskStore.addTask({ title: 'Build Testing Plan' });
    assert.ok(task.id, 'Task ID should be defined');
    assert.strictEqual(task.title, 'Build Testing Plan');
    assert.strictEqual(task.priority, 'medium');
    assert.strictEqual(task.completed, false);
    assert.strictEqual(task.status, 'todo');
    assert.ok(task.createdAt, 'createdAt timestamp should exist');
  });

  it('TC-AUTO-02: Rejects empty or whitespace-only task titles', async () => {
    await assert.rejects(async () => taskStore.addTask({ title: '' }), /cannot be empty/);
    await assert.rejects(async () => taskStore.addTask({ title: '    ' }), /cannot be empty/);
  });

  it('TC-AUTO-03: Rejects invalid calendar due dates and date rollovers', async () => {
    await assert.rejects(async () => taskStore.addTask({ title: 'Task', dueDate: '2026-02-31' }), /Invalid calendar date/);
    await assert.rejects(async () => taskStore.addTask({ title: 'Task', dueDate: 'invalid-date' }), /Invalid date format/);
    await assert.rejects(async () => taskStore.addTask({ title: 'Task', dueDate: '1850-01-01' }), /out of supported range/);
  });

  it('TC-AUTO-04: Rejects malformed task IDs and prototype pollution', async () => {
    await assert.rejects(async () => taskStore.updateTask('', { title: 'New' }), /A non-empty string task ID/);
    await assert.rejects(async () => taskStore.updateTask('../../../bad-id', { title: 'New' }), /contains invalid characters/);
    await assert.rejects(async () => taskStore.deleteTask('__proto__'), /Invalid task ID/);
  });

  it('TC-AUTO-05: Handles rapid concurrent mutations atomically without losing records', async () => {
    const COUNT = 10;
    const promises = [];
    for (let i = 0; i < COUNT; i++) {
      promises.push(taskStore.addTask({ title: `Concurrent Task ${i}`, priority: 'high' }));
    }
    const created = await Promise.all(promises);
    assert.strictEqual(created.length, COUNT);

    const all = await taskStore.getAllTasks();
    assert.strictEqual(all.length, COUNT);
  });

  it('TC-AUTO-06: Recovers cleanly from malformed corrupted tasks.json', async () => {
    await fs.promises.writeFile(filePath, '{{MALFORMED_SYNTAX_JSON:::', 'utf8');
    const tasks = await taskStore.getAllTasks();
    assert.deepStrictEqual(tasks, []);
  });
});
