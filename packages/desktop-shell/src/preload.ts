import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dicomViewer', {
  openFiles: () => ipcRenderer.invoke('dicomViewer:openFiles'),
  openFolder: () => ipcRenderer.invoke('dicomViewer:openFolder'),
  popoutViewport: (viewportId: string) => ipcRenderer.send('dicomViewer:popoutViewport', viewportId),
  onMenuOpenFiles: (callback: () => void) => ipcRenderer.on('menu:open-files', callback),
  onMenuOpenFolder: (callback: () => void) => ipcRenderer.on('menu:open-folder', callback),
  onMenuCloseStudy: (callback: () => void) => ipcRenderer.on('menu:close-study', callback),
  onOpenPath: (callback: (file: { name: string; data: Uint8Array }) => void) =>
    ipcRenderer.on('app:open-path', (_event, file) => callback(file)),
  onOpenFiles: (callback: (files: { name: string; data: Uint8Array }[]) => void) =>
    ipcRenderer.on('app:open-files', (_event, files) => callback(files)),
});
