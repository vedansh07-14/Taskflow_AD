const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { registerIpcHandlers } = require('./ipcHandlers.cjs');

// Configure OS-level application identification for notifications
app.name = 'TaskFlow Pro';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.taskflow.pro');
}

// Enforce single instance lock to prevent duplicate window & process creation
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main Process] Another instance is already running. Quitting duplicate instance.');
  app.quit();
}

// Single primary window reference
let mainWindow = null;

const isMac = process.platform === 'darwin';

/**
 * Resolves the preload script path reliably across development and production.
 */
function resolvePreloadPath() {
  const packagedPreload = path.join(__dirname, 'preload.cjs');
  if (app.isPackaged && fs.existsSync(packagedPreload)) {
    return packagedPreload;
  }

  const candidates = [
    packagedPreload,
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

  return packagedPreload;
}

/**
 * Creates the primary Dashboard window.
 */
function createMainWindow() {
  const preloadPath = resolvePreloadPath();
  console.log(`[Main Process] Creating Dashboard window with preload: ${preloadPath}`);

  const iconCandidates = [
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, 'build/icon.png'),
  ];
  const appIcon = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'TaskFlow Pro',
    ...(appIcon ? { icon: appIcon } : {}),
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

  // Environment-aware check: never attempt dev server loading when packaged
  const isDev = !app.isPackaged && Boolean(process.env.VITE_DEV_SERVER_URL);

  // Security: Prevent unexpected window navigation (e.g. user drags link or script redirects)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (isDev) {
      if (!navigationUrl.startsWith(process.env.VITE_DEV_SERVER_URL)) {
        console.warn('[Security] Blocked unauthorized window navigation to:', navigationUrl);
        event.preventDefault();
      }
    } else if (!navigationUrl.startsWith('file://')) {
      console.warn('[Security] Blocked unauthorized window navigation to:', navigationUrl);
      event.preventDefault();
    }
  });

  // Security: Prevent opening unmanaged child windows (window.open, <a target="_blank">)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn('[Security] Denied attempt to open external window for URL:', url);
    return { action: 'deny' };
  });

  if (isDev) {
    console.log(`[Main Process] Loading Dashboard from Vite dev server: ${process.env.VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL).catch((err) => {
      console.error('[Main Process] Failed to load Vite dev server:', err);
    });
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    console.log(`[Main Process] Loading Dashboard from production bundle: ${prodPath}`);
    mainWindow.loadFile(prodPath).catch((err) => {
      console.error('[Main Process] Failed to load production index.html:', err);
    });
  }

  // Handle window close & cleanup
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Builds the native desktop application menu with standard shortcuts.
 */
function buildApplicationMenu() {
  const template = [
    // 1. macOS Application Menu
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
              {
                label: `Quit ${app.name}`,
                accelerator: 'Command+Q',
                role: 'quit',
              },
            ],
          },
        ]
      : []),

    // 2. File Menu with Add Task and Quit actions
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Task...',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Signal main dashboard window to open the in-dashboard modal
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:open-add-task');
              mainWindow.focus();
            }
          },
        },
        { type: 'separator' },
        {
          label: isMac ? 'Close Window' : 'Exit',
          accelerator: isMac ? 'Command+W' : 'Alt+F4',
          role: isMac ? 'close' : 'quit',
        },
        ...(!isMac
          ? [
              {
                label: `Quit ${app.name}`,
                accelerator: 'Ctrl+Q',
                role: 'quit',
              },
            ]
          : []),
      ],
    },

    // 3. Edit Menu
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

    // 4. View Menu with Reload, Toggle Developer Tools, and Fullscreen
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          role: 'reload',
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          role: 'forceReload',
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          role: 'toggleDevTools',
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: isMac ? 'Ctrl+Command+F' : 'F11',
          role: 'togglefullscreen',
        },
      ],
    },

    // 5. Window Menu
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
// REGISTER MODULAR IPC HANDLERS
// -------------------------------------------------------------
registerIpcHandlers({
  onOpenAddModal: () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('menu:open-add-task');
      mainWindow.focus();
    }
  },
});

// -------------------------------------------------------------
// APPLICATION LIFECYCLE MANAGEMENT
// -------------------------------------------------------------

if (gotTheLock) {
  // Focus existing window when user attempts to launch a second instance
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

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
}
