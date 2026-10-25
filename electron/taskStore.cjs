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
 * Validates a task payload strictly within the main process.
 * Never trust client-side validation alone.
 *
 * @param {Object} data - Input payload
 * @param {boolean} [isUpdate=false] - Whether partial updates are permitted
 * @throws {Error} If validation fails
 */
function validateTaskInput(data, isUpdate = false) {
  if (!data || typeof data !== 'object') {
    throw new Error('Task payload must be a non-null object.');
  }

  // Title validation
  if (!isUpdate || data.title !== undefined) {
    if (typeof data.title !== 'string') {
      throw new Error('Task title must be a string.');
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
    if (data.description.length > 2000) {
      throw new Error('Task description exceeds maximum length of 2000 characters.');
    }
  }

  // Priority validation
  if (!isUpdate || data.priority !== undefined) {
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
    const parsed = new Date(data.dueDate + 'T00:00:00');
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date format for dueDate: "${data.dueDate}". Expected YYYY-MM-DD.`);
    }
  }
}

/**
 * Asynchronously reads tasks from tasks.json.
 * Safely handles missing files and corrupted JSON.
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

    return parsed;
  } catch (err) {
    // 1. Missing file: Return empty array cleanly
    if (err.code === 'ENOENT') {
      return [];
    }

    // 2. Syntax error in JSON: Archive corrupted file and return []
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
 *
 * @param {Array<Object>} tasks
 * @returns {Promise<void>}
 */
async function saveTasksToDisk(tasks) {
  const storageDir = getStorageDirectory();
  const filePath = getTasksFilePath();
  const tempPath = path.join(storageDir, `tasks.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`);

  // Ensure storage directory exists
  await fs.promises.mkdir(storageDir, { recursive: true });

  // Format with indentation for readability
  const serialized = JSON.stringify(tasks, null, 2);

  // 1. Write to temporary file
  await fs.promises.writeFile(tempPath, serialized, 'utf8');

  // 2. Atomic rename (replaces target file safely)
  await fs.promises.rename(tempPath, filePath);
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
    dueDate: input.dueDate || null,
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
  if (!id || typeof id !== 'string') {
    throw new Error('A valid string task ID is required for updating.');
  }

  validateTaskInput(updates, true);

  return enqueue(async () => {
    const tasks = await readTasksFromDisk();
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      throw new Error(`Task with id "${id}" was not found.`);
    }

    const existingTask = tasks[taskIndex];

    // Merge updates non-destructively
    const updatedTask = {
      ...existingTask,
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.description !== undefined && { description: (updates.description || '').trim() }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate || null }),
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    await saveTasksToDisk(tasks);

    return updatedTask;
  });
}

async function toggleTask(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('A valid string task ID is required for toggling.');
  }

  return enqueue(async () => {
    const tasks = await readTasksFromDisk();
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      throw new Error(`Task with id "${id}" was not found.`);
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
  if (!id || typeof id !== 'string') {
    throw new Error('A valid string task ID is required for deletion.');
  }

  return enqueue(async () => {
    const tasks = await readTasksFromDisk();
    const initialLength = tasks.length;
    const filteredTasks = tasks.filter((t) => t.id !== id);

    if (filteredTasks.length === initialLength) {
      throw new Error(`Task with id "${id}" was not found.`);
    }

    await saveTasksToDisk(filteredTasks);

    return { success: true, id };
  });
}

module.exports = {
  getAllTasks,
  addTask,
  updateTask,
  toggleTask,
  deleteTask,
  getTasksFilePath,
};
