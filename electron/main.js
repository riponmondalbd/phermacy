const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const backendPath = path.join(__dirname, '../backend/src/server.js');
  // In development, we use nodemon or just node
  // In production, we'll need to handle paths differently
  backendProcess = spawn('node', [backendPath], {
    cwd: path.join(__dirname, '../backend'),
    env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "PharmaCare - Pharmacy Management System",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    backgroundColor: '#0f1117'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) backendProcess.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle IPC communications here
ipcMain.handle('get-app-version', () => app.getVersion());
