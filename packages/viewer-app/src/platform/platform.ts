/** Thin abstraction so the UI doesn't need to know whether it's running inside Electron or a plain browser tab. */

export interface ElectronBridge {
  openFiles(): Promise<{ name: string; data: Uint8Array }[]>;
  openFolder(): Promise<{ name: string; relativePath: string; data: Uint8Array }[]>;
  popoutViewport(viewportId: string): void;
  onMenuOpenFiles(callback: () => void): void;
  onMenuOpenFolder(callback: () => void): void;
  onMenuCloseStudy(callback: () => void): void;
  onOpenPath(callback: (file: { name: string; data: Uint8Array }) => void): void;
}

declare global {
  interface Window {
    dicomViewer?: ElectronBridge;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.dicomViewer;
}

/** Opens a native "choose files" dialog (Electron) or a browser file picker, returning raw file bytes. */
export async function openFilesFromDisk(): Promise<{ name: string; data: Uint8Array }[]> {
  if (isElectron()) {
    return window.dicomViewer!.openFiles();
  }
  return openViaBrowserInput(false);
}

/** Opens a native "choose folder" dialog (Electron) or a browser folder picker. */
export async function openFolderFromDisk(): Promise<{ name: string; data: Uint8Array }[]> {
  if (isElectron()) {
    return window.dicomViewer!.openFolder();
  }
  return openViaBrowserInput(true);
}

function openViaBrowserInput(directory: boolean): Promise<{ name: string; data: Uint8Array }[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (directory) {
      input.webkitdirectory = true;
    }
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const files = Array.from(input.files ?? []);
      const results = await Promise.all(
        files.map(async (file) => ({
          name: file.webkitRelativePath || file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      document.body.removeChild(input);
      resolve(results);
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** Pops a viewport out into its own OS-level window, for multi-monitor reading. */
export function popoutViewport(viewportId: string) {
  if (isElectron()) {
    window.dicomViewer!.popoutViewport(viewportId);
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('popout', viewportId);
  window.open(
    url.toString(),
    `viewport-${viewportId}`,
    'width=900,height=800,menubar=no,toolbar=no,location=no,status=no',
  );
}

/** Reads File objects dropped onto the page (browser) into raw bytes, preserving folder structure. */
export async function filesFromDropEvent(event: DragEvent): Promise<{ name: string; data: Uint8Array }[]> {
  const files: File[] = [];
  const items = event.dataTransfer?.items;
  if (items && items.length && 'webkitGetAsEntry' in items[0]) {
    const entries = Array.from(items)
      .map((item) => (item as DataTransferItem).webkitGetAsEntry?.())
      .filter((e): e is FileSystemEntry => !!e);
    for (const entry of entries) {
      await collectEntry(entry, files);
    }
  } else if (event.dataTransfer?.files) {
    files.push(...Array.from(event.dataTransfer.files));
  }
  return Promise.all(
    files.map(async (file) => ({
      name: (file as File & { relativePath?: string }).relativePath || file.webkitRelativePath || file.name,
      data: new Uint8Array(await file.arrayBuffer()),
    })),
  );
}

function collectEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file((file) => {
        Object.defineProperty(file, 'relativePath', { value: entry.fullPath.replace(/^\//, '') });
        out.push(file);
        resolve();
      });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const readAll = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve();
            return;
          }
          await Promise.all(entries.map((e) => collectEntry(e, out)));
          readAll();
        });
      };
      readAll();
    } else {
      resolve();
    }
  });
}
