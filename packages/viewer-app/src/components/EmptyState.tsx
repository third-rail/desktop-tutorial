import { useState, type DragEvent } from 'react';
import { useViewerStore } from '../state/store';
import { filesFromDropEvent } from '../platform/platform';
import { openAndLoad, loadRawFiles } from '../loaders/openAndIngest';

export default function EmptyState() {
  const [dragOver, setDragOver] = useState(false);
  const isLoading = useViewerStore((s) => s.isLoading);
  const loadError = useViewerStore((s) => s.loadError);

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = await filesFromDropEvent(e.nativeEvent);
    await loadRawFiles(files);
  }

  return (
    <div
      className={`empty-state ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <h1>DICOM Viewer</h1>
      <p>Drag and drop DICOM files, a folder, or a ZIP export from an imaging center here.</p>
      <div className="empty-state-actions">
        <button type="button" onClick={() => openAndLoad('files')}>
          Open Files
        </button>
        <button type="button" onClick={() => openAndLoad('folder')}>
          Open Folder / ZIP
        </button>
      </div>
      {isLoading && <p className="muted">Loading…</p>}
      {loadError && <p className="error">{loadError}</p>}
    </div>
  );
}
