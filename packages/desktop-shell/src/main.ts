import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import http from 'node:http';
import { autoUpdater } from 'electron-updater';

const isDev = !!process.env.DICOM_VIEWER_DEV_URL;
const rendererDir = path.join(__dirname, '..', 'renderer');

// The renderer must NOT be loaded via a raw file:// URL (or a custom protocol scheme — tried and
// it doesn't work either): Web Workers, which Cornerstone3D's DICOM decoders depend on, silently
// fail to load their script for both file:// and custom-scheme origins in this Electron version,
// so decoding hangs forever with no error. Serving it over a real local HTTP server sidesteps the
// issue entirely, since that's a completely standard origin with no worker-loading edge cases.
let localServerBaseUrl: string | null = null;

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.wasm': 'application/wasm',
    '.map': 'application/json; charset=utf-8',
  };
  return types[ext] ?? 'application/octet-stream';
}

function startLocalServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
        const filePath = path.join(rendererDir, relativePath);
        if (!filePath.startsWith(rendererDir) || !existsSync(filePath)) {
          res.writeHead(404).end('Not found');
          return;
        }
        res.setHeader('Content-Type', contentTypeFor(filePath));
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500).end(String(err));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolve(`http://127.0.0.1:${address.port}`);
      } else {
        reject(new Error('Failed to start local renderer server'));
      }
    });
  });
}

let mainWindow: BrowserWindow | null = null;
const popoutWindows = new Map<string, BrowserWindow>();

function rendererUrl(query?: string): string {
  const q = query ? `?${query}` : '';
  if (isDev) {
    return `${process.env.DICOM_VIEWER_DEV_URL}/${q}`;
  }
  return `${localServerBaseUrl}/index.html${q}`;
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

/**
 * Checks GitHub Releases (via the `publish` config in electron-builder.yml) for a newer version.
 * Only runs against packaged installs — dev runs and unpackaged builds have no update feed and
 * electron-updater errors out immediately if asked to check.
 */
function checkForUpdates() {
  if (isDev || !app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update ready to install',
        message: `DICOM Viewer ${info.version} has been downloaded.`,
        detail: 'Restart now to install it, or it will install automatically the next time you quit.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update check failed:', err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Auto-update check failed:', err);
  });
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
    if (process.env.DICOM_VIEWER_TEST_DIR) {
      return readFilesRecursively(process.env.DICOM_VIEWER_TEST_DIR);
    }
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

app.whenReady().then(async () => {
  // Cornerstone3D's DICOM codec workers need SharedArrayBuffer, which requires the page to be
  // cross-origin isolated — Vite's dev server sends these headers itself, and the local server
  // started below sets them for the packaged app.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  if (!isDev) {
    localServerBaseUrl = await startLocalServer();
  }

  registerIpcHandlers();
  buildMenu();
  mainWindow = createWindow();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  checkForUpdates();

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
