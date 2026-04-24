const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  // Add more bridges as needed for desktop integration (printer, barcode, etc)
});
