import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const isDev = !!process.env.DICOM_VIEWER_DEV_URL;
const rendererIndexPath = path.join(__dirname, '..', 'renderer', 'index.html');

let mainWindow: BrowserWindow | null = null;
const popoutWindows = new Map<string, BrowserWindow>();

function rendererUrl(query?: string): string {
  const q = query ? `?${query}` : '';
  if (isDev) {
    return `${process.env.DICOM_VIEWER_DEV_URL}/${q}`;
  }
  const url = new URL(`file://${rendererIndexPath}`);
  if (query) url.search = query;
  return url.toString();
}

function createWindow(query?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    backgroundColor: '#05070a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadURL(rendererUrl(query));
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  return win;
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Files…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-files'),
        },
        {
          label: 'Open Folder / ZIP…',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow?.webContents.send('menu:open-folder'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function readFilesRecursively(dir: string, baseDir = dir): Promise<{ name: string; data: Uint8Array }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: { name: string; data: Uint8Array }[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await readFilesRecursively(full, baseDir)));
    } else if (entry.isFile()) {
      const data = await fs.readFile(full);
      results.push({ name: path.relative(baseDir, full), data: new Uint8Array(data) });
    }
  }
  return results;
}

function registerIpcHandlers() {
  ipcMain.handle('dicomViewer:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'DICOM / ZIP', extensions: ['dcm', 'zip', '*'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    const files: { name: string; data: Uint8Array }[] = [];
    for (const filePath of result.filePaths) {
      const data = await fs.readFile(filePath);
      files.push({ name: path.basename(filePath), data: new Uint8Array(data) });
    }
    return files;
  });

  ipcMain.handle('dicomViewer:openFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled) return [];
    return readFilesRecursively(result.filePaths[0]);
  });

  ipcMain.on('dicomViewer:popoutViewport', (_event, slotId: string) => {
    if (popoutWindows.has(slotId)) {
      popoutWindows.get(slotId)?.focus();
      return;
    }
    const win = createWindow(`popout=${encodeURIComponent(slotId)}`);
    win.setTitle(`DICOM Viewer — Viewport (${slotId})`);
    popoutWindows.set(slotId, win);
    win.on('closed', () => popoutWindows.delete(slotId));
  });
}

app.whenReady().then(() => {
  // Cornerstone3D's DICOM codec workers need SharedArrayBuffer, which requires the page to be
  // cross-origin isolated — Vite's dev server sends these headers itself, but the packaged app's
  // file:// load needs them set here instead.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  registerIpcHandlers();
  buildMenu();
  mainWindow = createWindow();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Basic .dcm file-association support: the OS launches the app with the file path as an argv
// entry on Windows/Linux; forward it to the renderer once the window is ready to receive it.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
const launchFileArg = process.argv.find((arg) => existsSync(arg) && /\.dcm$/i.test(arg));
if (launchFileArg) {
  app.whenReady().then(() => {
    mainWindow?.webContents.once('did-finish-load', async () => {
      const data = await fs.readFile(launchFileArg);
      mainWindow?.webContents.send('app:open-path', {
        name: path.basename(launchFileArg),
        data: new Uint8Array(data),
      });
    });
  });
}
