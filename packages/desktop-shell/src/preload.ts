import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dicomViewer', {
  openFiles: () => ipcRenderer.invoke('dicomViewer:openFiles'),
  openFolder: () => ipcRenderer.invoke('dicomViewer:openFolder'),
  popoutViewport: (viewportId: string) => ipcRenderer.send('dicomViewer:popoutViewport', viewportId),
  onMenuOpenFiles: (callback: () => void) => ipcRenderer.on('menu:open-files', callback),
  onMenuOpenFolder: (callback: () => void) => ipcRenderer.on('menu:open-folder', callback),
  onOpenPath: (callback: (file: { name: string; data: Uint8Array }) => void) =>
    ipcRenderer.on('app:open-path', (_event, file) => callback(file)),
});
