const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

/**
 * TaskStore: Local flat-file JSON persistence engine for TaskFlow Pro.
 *
 * Stored in: app.getPath('userData')/tasks.json
 * - macOS: ~/Library/Application Support/taskflow-pro/tasks.json
 * - Windows: %APPDATA%/taskflow-pro/tasks.json
 * - Linux: ~/.config/taskflow-pro/tasks.json
 */

function getStorageDirectory() {
  try {
    if (app && typeof app.getPath === 'function') {
      return app.getPath('userData');
    }
  } catch (err) {
    // Fallback if accessed before app ready or in headless testing
  }
  return path.join(process.cwd(), '.taskflow_data');
}

function getTasksFilePath() {
  return path.join(getStorageDirectory(), 'tasks.json');
}

// Serial execution queue to ensure read-modify-write atomicity across all operations
let queuePromise = Promise.resolve();

function enqueue(operation) {
  const resultPromise = queuePromise.catch(() => {}).then(operation);
  queuePromise = resultPromise.catch(() => {});
  return resultPromise;
}

/**
 * Validates and sanitizes a task ID.
 * Protects against injection, oversized strings, and prototype pollution keys.
 *
 * @param {string} id
 * @returns {string} Sanitized ID
 */
function validateTaskId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('A non-empty string task ID is required.');
  }
  const trimmed = id.trim();
  if (trimmed.length > 100) {
    throw new Error('Task ID exceeds maximum length of 100 characters.');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error(`Task ID contains invalid characters.`);
  }
  if (trimmed === '__proto__' || trimmed === 'constructor' || trimmed === 'prototype') {
    throw new Error('Invalid task ID value.');
  }
  return trimmed;
}

/**
 * Validates a task payload strictly within the main process.
 * Never trust client-side validation alone.
 *
 * @param {Object} data - Input payload
 * @param {boolean} [isUpdate=false] - Whether partial updates are permitted
 * @throws {Error} If validation fails
 */
function validateTaskInput(data, isUpdate = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Task payload must be a non-null object.');
  }

  // Guard against prototype pollution keys
  if (
    Object.prototype.hasOwnProperty.call(data, '__proto__') ||
    Object.prototype.hasOwnProperty.call(data, 'constructor') ||
    Object.prototype.hasOwnProperty.call(data, 'prototype')
  ) {
    throw new Error('Malicious object properties detected.');
  }

  // Title validation
  if (!isUpdate || data.title !== undefined) {
    if (typeof data.title !== 'string') {
      throw new Error('Task title must be a string.');
    }
    // Reject non-printable control characters
    if (/[\u0000-\u001F\u007F]/.test(data.title)) {
      throw new Error('Task title contains invalid control characters.');
    }
    const trimmedTitle = data.title.trim();
    if (trimmedTitle.length === 0) {
      throw new Error('Task title cannot be empty.');
    }
    if (trimmedTitle.length > 200) {
      throw new Error('Task title exceeds maximum length of 200 characters.');
    }
  }

  // Description validation (optional)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      throw new Error('Task description must be a string.');
    }
    if (/[\u0000]/.test(data.description)) {
      throw new Error('Task description contains invalid null bytes.');
    }
    if (data.description.length > 2000) {
      throw new Error('Task description exceeds maximum length of 2000 characters.');
    }
  }

  // Priority validation (optional on creation, defaults to 'medium')
  if (data.priority !== undefined && data.priority !== null) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(data.priority)) {
      throw new Error(`Invalid priority "${data.priority}". Allowed values: low, medium, high.`);
    }
  }

  // Due Date validation (optional ISO YYYY-MM-DD or null)
  if (data.dueDate !== undefined && data.dueDate !== null && data.dueDate !== '') {
    if (typeof data.dueDate !== 'string') {
      throw new Error('Due date must be a date string.');
    }
    const trimmedDate = data.dueDate.trim();
    const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!DATE_REGEX.test(trimmedDate)) {
      throw new Error(`Invalid date format for dueDate: "${trimmedDate}". Expected YYYY-MM-DD.`);
    }
    const [year, month, day] = trimmedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    if (
      dateObj.getUTCFullYear() !== year ||
      dateObj.getUTCMonth() !== month - 1 ||
      dateObj.getUTCDate() !== day
    ) {
      throw new Error(`Invalid calendar date for dueDate: "${trimmedDate}". Date does not exist.`);
    }
    if (year < 1970 || year > 2100) {
      throw new Error(`Due date year out of supported range (1970-2100): "${trimmedDate}".`);
    }
  }
}

/**
 * Asynchronously reads tasks from tasks.json.
 * Safely handles missing files, permission errors, and corrupted JSON.
 *
 * @returns {Promise<Array<Object>>}
 */
async function readTasksFromDisk() {
  const filePath = getTasksFilePath();

  try {
    const rawData = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(rawData);

    if (!Array.isArray(parsed)) {
      console.warn('[TaskStore] tasks.json does not contain an array. Resetting to [].');
      return [];
    }

    // Filter out corrupted or non-object elements
    return parsed.filter(
      (task) =>
        task &&
        typeof task === 'object' &&
        typeof task.id === 'string' &&
        typeof task.title === 'string'
    );
  } catch (err) {
    // 1. Missing file: Return empty array cleanly
    if (err.code === 'ENOENT') {
      return [];
    }

    // 2. File-system permission errors
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error('[TaskStore] Permission denied reading tasks file:', err);
      throw new Error(`Permission denied reading tasks from disk: ${err.message}`);
    }

    // 3. Syntax error in JSON: Archive corrupted file and return []
    if (err instanceof SyntaxError) {
      const backupPath = path.join(
        getStorageDirectory(),
        `tasks.corrupted-${Date.now()}.json`
      );
      console.error(`[TaskStore] Corrupted tasks.json detected. Backing up to ${backupPath}`);
      try {
        await fs.promises.rename(filePath, backupPath);
      } catch (backupErr) {
        console.error('[TaskStore] Failed to rename corrupted tasks.json:', backupErr);
      }
      return [];
    }

    // Other unexpected file errors
    console.error('[TaskStore] Unexpected read error:', err);
    throw err;
  }
}

/**
 * Asynchronously writes tasks to tasks.json using atomic temp-file rename.
 * Cleans up orphaned temp files if write or rename encounters permission or disk errors.
 *
 * @param {Array<Object>} tasks
 * @returns {Promise<void>}
 */
async function saveTasksToDisk(tasks) {
  const storageDir = getStorageDirectory();
  const filePath = getTasksFilePath();
  let tempPath = null;

  try {
    // Ensure storage directory exists with restrictive owner permissions
    await fs.promises.mkdir(storageDir, { recursive: true, mode: 0o700 });

    tempPath = path.join(
      storageDir,
      `tasks.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`
    );

    // Format with indentation for human readability and debuggability
    const serialized = JSON.stringify(tasks, null, 2);

    // 1. Write to temporary file with user-only permissions (0o600)
    await fs.promises.writeFile(tempPath, serialized, { encoding: 'utf8', mode: 0o600 });

    // 2. Atomic rename (replaces target file safely)
    await fs.promises.rename(tempPath, filePath);
    tempPath = null;
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error('[TaskStore] Permission denied writing tasks file:', err);
      throw new Error(`Permission denied writing tasks to disk: ${err.message}`);
    }
    console.error('[TaskStore] Disk write error:', err);
    throw err;
  } finally {
    // If tempPath was not set to null, write or rename failed — clean up the orphan
    if (tempPath) {
      await fs.promises.unlink(tempPath).catch(() => {});
    }
  }
}

/**
 * Public CRUD Operations
 * Each mutation is serialized through the atomic queue to avoid race conditions.
 */

async function getAllTasks() {
  return enqueue(async () => {
    return await readTasksFromDisk();
  });
}

async function addTask(input) {
  validateTaskInput(input, false);

  const now = new Date().toISOString();
  const newTask = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: (input.description || '').trim(),
    priority: input.priority || 'medium',
    status: 'todo',
    completed: false,
    dueDate: input.dueDate ? input.dueDate.trim() : null,
    createdAt: now,
    updatedAt: now,
  };

  return enqueue(async () => {
    const tasks = await readTasksFromDisk();
    // Prepend so newest tasks appear at the top
    tasks.unshift(newTask);
    await saveTasksToDisk(tasks);
    return newTask;
  });
}

async function updateTask(id, updates) {
  const safeId = validateTaskId(id);
  validateTaskInput(updates, true);

  return enqueue(async () => {
    const tasks = await readTasksFromDisk();
    const taskIndex = tasks.findIndex((t) => t.id === safeId);

    if (taskIndex === -1) {
      throw new Error(`Task with id "${safeId}" was not found.`);
    }

    const existingTask = tasks[taskIndex];

    // Merge updates non-destructively
    const updatedTask = {
      ...existingTask,
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.description !== undefined && { description: (updates.description || '').trim() }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? updates.dueDate.trim() : null }),
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    await saveTasksToDisk(tasks);

    return updatedTask;
  });
}

async function toggleTask(id) {
  const safeId = validateTaskId(id);

  return enqueue(async () => {
    const tasks = await readTasksFromDisk();
    const taskIndex = tasks.findIndex((t) => t.id === safeId);

    if (taskIndex === -1) {
      throw new Error(`Task with id "${safeId}" was not found.`);
    }

    const existing = tasks[taskIndex];
    const nextCompleted = !existing.completed;

    const toggledTask = {
      ...existing,
      completed: nextCompleted,
      status: nextCompleted ? 'completed' : 'todo',
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = toggledTask;
    await saveTasksToDisk(tasks);

    return toggledTask;
  });
}

async function deleteTask(id) {
  const safeId = validateTaskId(id);

  return enqueue(async () => {
    const tasks = await readTasksFromDisk();
    const initialLength = tasks.length;
    const filteredTasks = tasks.filter((t) => t.id !== safeId);

    if (filteredTasks.length === initialLength) {
      throw new Error(`Task with id "${safeId}" was not found.`);
    }

    await saveTasksToDisk(filteredTasks);

    return { success: true, id: safeId };
  });
}

module.exports = {
  getAllTasks,
  addTask,
  updateTask,
  toggleTask,
  deleteTask,
  validateTaskId,
  validateTaskInput,
  getTasksFilePath,
};
