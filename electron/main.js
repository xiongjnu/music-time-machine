const { app, BrowserWindow } = require('electron');
const path = require('path');

const PORT = process.env.PORT || 3000;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Music Time Machine',
    icon: path.join(__dirname, '..', 'client', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(() => {
  // Start Express server (runs in main process)
  require('../server/index.js');

  // Give server time to start, then open window
  const checkServer = setInterval(() => {
    const http = require('http');
    http.get(`http://localhost:${PORT}/api/meta/eras`, (res) => {
      clearInterval(checkServer);
      createWindow();
    }).on('error', () => { /* still starting */ });
  }, 500);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
