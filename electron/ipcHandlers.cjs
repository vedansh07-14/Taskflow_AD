const { ipcMain, BrowserWindow } = require('electron');
const taskStore = require('./taskStore.cjs');
const notifications = require('./notifications.cjs');

/**
 * Validates the origin and identity of an IPC invocation sender.
 * Enforces security by rejecting calls from untrusted frames or destroyed windows.
 *
 * @param {Electron.IpcMainInvokeEvent} event
 * @returns {boolean} True if sender is authorized
 */
function validateIpcSender(event) {
  if (!event || !event.sender) {
    return false;
  }

  // Guard if running outside Electron runtime or before BrowserWindow is ready
  if (!BrowserWindow || typeof BrowserWindow.fromWebContents !== 'function') {
    return false;
  }

  // 1. Ensure sender belongs to an active, valid BrowserWindow instance
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (!senderWindow || senderWindow.isDestroyed()) {
    return false;
  }

  // 2. Validate sender frame origin against expected local dev server or production index.html
  const url = event.sender.getURL();
  if (process.env.VITE_DEV_SERVER_URL) {
    if (!url.startsWith(process.env.VITE_DEV_SERVER_URL)) {
      console.warn('[IPC Security] Rejected call from unexpected dev origin:', url);
      return false;
    }
  } else if (!url.startsWith('file://')) {
    console.warn('[IPC Security] Rejected call from non-file production origin:', url);
    return false;
  }

  return true;
}

/**
 * Broadcasts a task change event to all active BrowserWindow instances.
 */
function broadcastTasksChanged(action, taskId) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('tasks:changed', { action, taskId, timestamp: Date.now() });
    }
  }
}

/**
 * Registers all secure IPC handlers for TaskFlow Pro.
 *
 * @param {Object} [options]
 * @param {() => void} [options.onOpenAddModal] - Callback to trigger in-dashboard Add Task modal
 */
function registerIpcHandlers(options = {}) {
  const { onOpenAddModal } = options;

  // -----------------------------------------------------------
  // 1. TASK CRUD HANDLERS (Validated & Secured)
  // -----------------------------------------------------------

  // List all tasks
  ipcMain.handle('tasks:list', async (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    try {
      return await taskStore.getAllTasks();
    } catch (err) {
      console.error('[IPC Handler] Error in tasks:list:', err);
      throw new Error(`Failed to load tasks: ${err.message}`);
    }
  });

  // Create a new task
  ipcMain.handle('tasks:add', async (event, taskData) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    try {
      const createdTask = await taskStore.addTask(taskData);
      broadcastTasksChanged('add', createdTask.id);
      return createdTask;
    } catch (err) {
      console.error('[IPC Handler] Error in tasks:add:', err);
      throw new Error(`Failed to create task: ${err.message}`);
    }
  });

  // Update an existing task
  ipcMain.handle('tasks:update', async (event, { id, updates }) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    try {
      const updatedTask = await taskStore.updateTask(id, updates);
      broadcastTasksChanged('update', id);
      return updatedTask;
    } catch (err) {
      console.error('[IPC Handler] Error in tasks:update:', err);
      throw new Error(`Failed to update task: ${err.message}`);
    }
  });

  // Toggle task completion
  ipcMain.handle('tasks:toggle', async (event, { id }) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    try {
      const toggledTask = await taskStore.toggleTask(id);
      broadcastTasksChanged('toggle', id);
      return toggledTask;
    } catch (err) {
      console.error('[IPC Handler] Error in tasks:toggle:', err);
      throw new Error(`Failed to toggle task: ${err.message}`);
    }
  });

  // Delete a task
  ipcMain.handle('tasks:delete', async (event, { id }) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    try {
      const result = await taskStore.deleteTask(id);
      broadcastTasksChanged('delete', id);
      return result;
    } catch (err) {
      console.error('[IPC Handler] Error in tasks:delete:', err);
      throw new Error(`Failed to delete task: ${err.message}`);
    }
  });

  // -----------------------------------------------------------
  // 2. WINDOW ORCHESTRATION & NOTIFICATIONS
  // -----------------------------------------------------------

  // Open Add Task Modal (signals main window to open the in-dashboard modal)
  ipcMain.handle('window:open-add', (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    if (typeof onOpenAddModal === 'function') {
      onOpenAddModal();
    }
    return { success: true };
  });

  // Legacy channel alias
  ipcMain.handle('window:open-add-task', (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    if (typeof onOpenAddModal === 'function') {
      onOpenAddModal();
    }
    return { success: true };
  });

  // Close sender window
  ipcMain.handle('window:close', (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    return { success: true };
  });

  // Native Desktop Notification with input validation & sender verification
  ipcMain.handle('notification:show', async (event, payload) => {
    if (!validateIpcSender(event)) {
      console.warn('[IPC Security] Unauthorized notification attempt rejected.');
      return { shown: false, reason: 'unauthorized_sender' };
    }
    try {
      return notifications.showNotification(payload);
    } catch (err) {
      console.error('[IPC Handler] Error showing notification:', err);
      return { shown: false, reason: err.message };
    }
  });

  // Check if native notifications are supported on current platform
  ipcMain.handle('notification:is-supported', (event) => {
    if (!validateIpcSender(event)) return false;
    return notifications.isNotificationSupported();
  });

  // System Diagnostics Ping
  ipcMain.handle('app:ping', async (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return {
      status: 'connected',
      message: 'IPC channel between React renderer and Electron main process is active and secure.',
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      platform: process.platform,
    };
  });
}

module.exports = {
  registerIpcHandlers,
  broadcastTasksChanged,
  validateIpcSender,
};
