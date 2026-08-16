import { useViewerStore } from '../state/store';
import { openFilesFromDisk, openFolderFromDisk } from '../platform/platform';
import { ingestLocalFiles } from './localFiles';

/** Parses raw file bytes into studies and merges them into the app store, with loading/error state. */
export async function loadRawFiles(raw: { name: string; data: Uint8Array }[]) {
  if (raw.length === 0) return;
  const { setLoading, setLoadError, addStudies } = useViewerStore.getState();
  try {
    setLoadError(null);
    setLoading(true);
    const studies = await ingestLocalFiles(raw);
    if (studies.length === 0) {
      setLoadError('No readable DICOM files were found in the selection.');
      return;
    }
    addStudies(studies);
  } catch (err) {
    console.error(err);
    setLoadError('Failed to load the selected files.');
  } finally {
    setLoading(false);
  }
}

/** Opens the native/browser file or folder picker and ingests whatever was selected. */
export async function openAndLoad(kind: 'files' | 'folder') {
  const raw = kind === 'files' ? await openFilesFromDisk() : await openFolderFromDisk();
  await loadRawFiles(raw);
}
