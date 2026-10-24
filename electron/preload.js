import electron from 'electron';

const { contextBridge, ipcRenderer } = electron;

/**
 * Preload script executing in an isolated context.
 * Exposes a selective, strictly typed bridge to the React renderer via window.electronAPI.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Test connection to the main process
  ping: () => ipcRenderer.invoke('app:ping'),
});
