const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Window references
let mainWindow = null;
let addTaskWindow = null;

const isMac = process.platform === 'darwin';

/**
 * Resolves the preload script path reliably across development and production.
 */
function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, 'preload.mjs'),
    path.join(__dirname, '../dist-electron/preload.cjs'),
    path.join(__dirname, '../dist-electron/preload.js'),
    path.join(__dirname, '../dist-electron/preload.mjs'),
    path.join(__dirname, '../electron/preload.cjs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(__dirname, 'preload.cjs');
}

/**
 * Creates the primary Dashboard window.
 */
function createMainWindow() {
  const preloadPath = resolvePreloadPath();
  console.log(`[Main Process] Creating Dashboard window with preload: ${preloadPath}`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'TaskFlow Pro',
    backgroundColor: '#0b0f19', // Matches dark design theme; eliminates white flash
    show: false,                // Graceful visual display: hidden until DOM paints
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, // Secure JavaScript execution boundary
      nodeIntegration: false, // Forbids renderer access to Node.js APIs
      sandbox: true,          // Chromium OS-level process sandbox
    },
  });

  // Reveal window smoothly once content has finished initial render
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Environment-aware URL / file resolution
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    console.log(`[Main Process] Loading Dashboard from Vite dev server: ${devServerUrl}#/dashboard`);
    mainWindow.loadURL(`${devServerUrl}#/dashboard`).catch((err) => {
      console.error('[Main Process] Failed to load Vite dev server:', err);
    });
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    console.log(`[Main Process] Loading Dashboard from production bundle: ${prodPath}`);
    mainWindow.loadFile(prodPath, { hash: 'dashboard' }).catch((err) => {
      console.error('[Main Process] Failed to load production index.html:', err);
    });
  }

  // Handle window close & cleanup
  mainWindow.on('closed', () => {
    mainWindow = null;
    // If the main window closes, close any detached child windows
    if (addTaskWindow && !addTaskWindow.isDestroyed()) {
      addTaskWindow.close();
    }
  });
}

/**
 * Creates the dedicated Add Task window.
 * Enforces a single instance (focuses existing if already open).
 */
function createAddTaskWindow() {
  // Prevent duplicate windows: if already open, bring to front and focus
  if (addTaskWindow && !addTaskWindow.isDestroyed()) {
    console.log('[Main Process] Add Task window already open — focusing existing window.');
    if (addTaskWindow.isMinimized()) addTaskWindow.restore();
    addTaskWindow.focus();
    return;
  }

  const preloadPath = resolvePreloadPath();
  console.log(`[Main Process] Creating Add Task window with preload: ${preloadPath}`);

  addTaskWindow = new BrowserWindow({
    width: 520,
    height: 640,
    minWidth: 460,
    minHeight: 560,
    title: 'Add New Task - TaskFlow Pro',
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : null,
    modal: false,               // Floating auxiliary window, not modal blocking
    backgroundColor: '#0b0f19',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  addTaskWindow.once('ready-to-show', () => {
    addTaskWindow.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    addTaskWindow.loadURL(`${devServerUrl}#/add-task`).catch((err) => {
      console.error('[Main Process] Failed to load Add Task dev URL:', err);
    });
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    addTaskWindow.loadFile(prodPath, { hash: 'add-task' }).catch((err) => {
      console.error('[Main Process] Failed to load Add Task prod file:', err);
    });
  }

  addTaskWindow.on('closed', () => {
    addTaskWindow = null;
  });
}

/**
 * Builds the native desktop application menu with standard shortcuts.
 */
function buildApplicationMenu() {
  const template = [
    // macOS App Name Menu
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Task...',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createAddTaskWindow();
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// -------------------------------------------------------------
// IPC CHANNELS (Preload API Matching Contract)
// -------------------------------------------------------------

// Window management: Open Add Task window
ipcMain.handle('window:open-add', () => {
  createAddTaskWindow();
  return { success: true };
});

// Legacy channel alias for backwards compatibility
ipcMain.handle('window:open-add-task', () => {
  createAddTaskWindow();
  return { success: true };
});

// Window management: Close sender window
ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
  return { success: true };
});

// Diagnostics ping
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

// Temporary placeholder handlers matching window.taskFlow API contract
// Full JSON file persistence will be connected in Phase 8
ipcMain.handle('tasks:list', async () => {
  return [];
});

ipcMain.handle('tasks:add', async (_event, taskData) => {
  console.log('[Main Process] Received task payload for creation:', taskData);
  return {
    id: `temp-${Date.now()}`,
    ...taskData,
    status: 'todo',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
});

ipcMain.handle('tasks:update', async (_event, { id, updates }) => {
  console.log(`[Main Process] Received task update for ${id}:`, updates);
  return { id, ...updates, updatedAt: new Date().toISOString() };
});

ipcMain.handle('tasks:toggle', async (_event, { id }) => {
  console.log(`[Main Process] Received task toggle for ${id}`);
  return { id, toggled: true, updatedAt: new Date().toISOString() };
});

ipcMain.handle('tasks:delete', async (_event, { id }) => {
  console.log(`[Main Process] Received task delete for ${id}`);
  return { success: true, id };
});

ipcMain.handle('notification:show', async (_event, { title, body }) => {
  console.log(`[Main Process] Native Notification: ${title} - ${body}`);
  return { shown: true };
});

// -------------------------------------------------------------
// APPLICATION LIFECYCLE MANAGEMENT
// -------------------------------------------------------------

app.whenReady()
  .then(() => {
    buildApplicationMenu();
    createMainWindow();

    // macOS re-activation from dock
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  })
  .catch((err) => {
    console.error('[Main Process] Fatal startup error:', err);
  });

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
