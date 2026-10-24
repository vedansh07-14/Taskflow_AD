import electron from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { app, BrowserWindow, ipcMain } = electron;

// In ES Modules, __filename and __dirname are not available globally.
// We reconstruct them using import.meta.url.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

/**
 * Resolves the preload script path reliably in both development and production.
 * In Vite 8 / vite-plugin-electron, the preload script is built into dist-electron/preload.mjs.
 */
function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, 'preload.mjs'),
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, '../dist-electron/preload.mjs'),
    path.join(__dirname, '../dist-electron/preload.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to preload.mjs in the same directory
  return path.join(__dirname, 'preload.mjs');
}

function createMainWindow() {
  const preloadPath = resolvePreloadPath();
  console.log(`[Main Process] Using preload script: ${preloadPath}`);

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    title: 'TaskFlow Pro (Dev Environment)',
    backgroundColor: '#0b0f19', // Matches dark theme; prevents white flash on launch
    show: false,                // Hidden until DOM content is painted
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, // Crucial security barrier
      nodeIntegration: false, // Prevents renderer access to Node.js internals
      sandbox: true,          // Chromium OS-level process sandbox
    },
  });

  // Reveal window smoothly once content has been rendered
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Environment-aware loading:
  // In development, vite-plugin-electron supplies VITE_DEV_SERVER_URL
  // In production, load the static HTML bundled in dist/index.html
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    console.log(`[Main Process] Loading from Vite dev server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('[Main Process] Failed to load Vite dev server:', err);
    });
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    console.log(`[Main Process] Loading production build from: ${prodPath}`);
    mainWindow.loadFile(prodPath).catch((err) => {
      console.error('[Main Process] Failed to load production index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Minimal IPC handshake verification channel
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

// Robust application startup and lifecycle handling
app.whenReady()
  .then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  })
  .catch((err) => {
    console.error('[Main Process] Fatal error during app startup:', err);
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
