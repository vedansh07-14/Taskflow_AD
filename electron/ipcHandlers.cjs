const { ipcMain, BrowserWindow } = require('electron');
const taskStore = require('./taskStore.cjs');
const notifications = require('./notifications.cjs');

/**
 * Broadcasts a change event to every open BrowserWindow.
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
 */
function registerIpcHandlers(options = {}) {
  const { onOpenAddModal } = options;

  // -----------------------------------------------------------
  // 1. TASK CRUD HANDLERS
  // -----------------------------------------------------------

  // List all tasks
  ipcMain.handle('tasks:list', async () => {
    try {
      return await taskStore.getAllTasks();
    } catch (err) {
      console.error('[IPC Handler] Error in tasks:list:', err);
      throw new Error(`Failed to load tasks: ${err.message}`);
    }
  });

  // Create a new task
  ipcMain.handle('tasks:add', async (_event, taskData) => {
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
  ipcMain.handle('tasks:update', async (_event, { id, updates }) => {
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
  ipcMain.handle('tasks:toggle', async (_event, { id }) => {
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
  ipcMain.handle('tasks:delete', async (_event, { id }) => {
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
  ipcMain.handle('window:open-add', () => {
    if (typeof onOpenAddModal === 'function') {
      onOpenAddModal();
    }
    return { success: true };
  });

  // Legacy channel alias
  ipcMain.handle('window:open-add-task', () => {
    if (typeof onOpenAddModal === 'function') {
      onOpenAddModal();
    }
    return { success: true };
  });

  // Close sender window
  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    return { success: true };
  });

  // Native Desktop Notification with input validation & type restrictions
  ipcMain.handle('notification:show', async (_event, payload) => {
    try {
      return notifications.showNotification(payload);
    } catch (err) {
      console.error('[IPC Handler] Error showing notification:', err);
      return { shown: false, reason: err.message };
    }
  });

  // System Diagnostics Ping
  ipcMain.handle('app:ping', async () => {
    return {
      status: 'connected',
      message: 'IPC channel between React renderer and Electron main process is active.',
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
};
