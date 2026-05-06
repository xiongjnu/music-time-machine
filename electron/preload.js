const { contextBridge } = require('electron');

// Minimal preload — renderer communicates purely via HTTP fetch to localhost
// contextIsolation is on, nodeIntegration is off
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
});
