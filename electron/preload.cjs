const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload Script for TaskFlow Pro
 *
 * Security Architecture:
 * - Runs in an isolated execution context (contextIsolation: true).
 * - nodeIntegration is disabled in the renderer.
 * - Only explicit, whitelisted channels are exposed through contextBridge.
 * - Does NOT expose raw ipcRenderer, require(), process, or Buffer to window.
 * - Hardcodes all IPC channel names to prevent renderer-controlled channel injection.
 */

// Define the exact, whitelisted API contract
const taskFlowAPI = {
  /**
   * Retrieves all tasks from persistent storage.
   * @returns {Promise<Array<Object>>} Promise resolving to the list of tasks.
   */
  listTasks: () => {
    return ipcRenderer.invoke('tasks:list');
  },

  /**
   * Dispatches a new task payload to the main process for creation and disk persistence.
   * @param {Object} taskData - { title, description, priority, dueDate }
   * @returns {Promise<Object>} Promise resolving to the created task with ID and timestamps.
   */
  addTask: (taskData) => {
    return ipcRenderer.invoke('tasks:add', taskData);
  },

  /**
   * Submits updates for an existing task.
   * @param {string} id - UUID of the task to update.
   * @param {Object} updates - Fields to modify { title, description, priority, dueDate }.
   * @returns {Promise<Object>} Promise resolving to the updated task object.
   */
  updateTask: (id, updates) => {
    return ipcRenderer.invoke('tasks:update', { id, updates });
  },

  /**
   * Toggles the completion status of a task.
   * @param {string} id - UUID of the task to toggle.
   * @returns {Promise<Object>} Promise resolving to the updated task object.
   */
  toggleTask: (id) => {
    return ipcRenderer.invoke('tasks:toggle', { id });
  },

  /**
   * Deletes a task from persistent storage.
   * @param {string} id - UUID of the task to remove.
   * @returns {Promise<{ success: boolean, id: string }>} Result object.
   */
  deleteTask: (id) => {
    return ipcRenderer.invoke('tasks:delete', { id });
  },

  /**
   * Triggers the opening of the Add Task modal dialog.
   * @returns {Promise<{ success: boolean }>}
   */
  openAddWindow: () => {
    return ipcRenderer.invoke('window:open-add');
  },

  /**
   * Subscribes to application menu trigger (Cmd/Ctrl+N) to open the Add Task modal.
   * @param {Function} callback
   * @returns {Function} Cleanup unsubscribe function
   */
  onOpenAddModal: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const subscription = () => callback();
    ipcRenderer.on('menu:open-add-task', subscription);
    return () => {
      ipcRenderer.removeListener('menu:open-add-task', subscription);
    };
  },

  /**
   * Closes the active BrowserWindow from within renderer context.
   * @returns {Promise<{ success: boolean }>}
   */
  closeWindow: () => {
    return ipcRenderer.invoke('window:close');
  },

  /**
   * Diagnostic connectivity test between renderer and main process.
   * @returns {Promise<Object>}
   */
  ping: () => {
    return ipcRenderer.invoke('app:ping');
  },

  /**
   * Displays an OS-level native desktop notification banner.
   * @param {Object} payload - { title: string, body: string }
   * @returns {Promise<{ shown: boolean, reason?: string }>}
   */
  notify: (payload) => {
    return ipcRenderer.invoke('notification:show', payload);
  },

  /**
   * Checks whether the current operating system supports desktop notifications.
   * @returns {Promise<boolean>}
   */
  isNotificationSupported: () => {
    return ipcRenderer.invoke('notification:is-supported');
  },

  /**
   * Subscribes to real-time task mutations broadcasted across windows.
   * Implements an automatic cleanup function suitable for React's useEffect return.
   *
   * @param {Function} callback - Function invoked whenever tasks are modified.
   * @returns {Function} Unsubscribe cleanup function to prevent memory leaks.
   */
  onTasksChanged: (callback) => {
    if (typeof callback !== 'function') {
      console.warn('[Preload] onTasksChanged expected a function callback.');
      return () => {};
    }

    // Wrap the callback to strip the Electron event object (prevents leaking internal event data)
    const subscription = (_event, ...args) => callback(...args);

    ipcRenderer.on('tasks:changed', subscription);

    // Return explicit unsubscribe function
    return () => {
      ipcRenderer.removeListener('tasks:changed', subscription);
    };
  },
};

// Expose the API exclusively under the named namespace `window.taskFlow`
contextBridge.exposeInMainWorld('taskFlow', taskFlowAPI);
