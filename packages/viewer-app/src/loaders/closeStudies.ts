import { cache, getRenderingEngine } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import { RENDERING_ENGINE_ID } from '../cornerstone/init';
import { clearVolumeCache } from '../cornerstone/volumes';
import { clearThumbnailCache } from './thumbnail';
import { useViewerStore } from '../state/store';
import { notifyStudiesClosed } from '../platform/popoutChannel';

/**
 * Unloads the current dataset so another can be opened without restarting the app.
 *
 * Order matters here. The rendering engine is destroyed first so no viewport is left rendering
 * against pixel data we're about to free. Every cache then has to be cleared together, because
 * the DICOM loader's file manager hands out imageIds by array index (`dicomfile:0`, `dicomfile:1`,
 * ...) and purging it restarts that count at zero — so any image left in Cornerstone's cache under
 * an old imageId would be silently served for a completely different file in the next study.
 */
export function closeAllStudies() {
  // Pop-out windows hold their own independent copy of the data and otherwise have no way to
  // learn the main window moved on — tell them before tearing anything down here.
  notifyStudiesClosed();

  getRenderingEngine(RENDERING_ENGINE_ID)?.destroy();

  cornerstoneTools.annotation.state.removeAllAnnotations();

  clearVolumeCache();
  clearThumbnailCache();
  cache.purgeCache();

  cornerstoneDICOMImageLoader.wadouri.fileManager.purge();
  cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.purge();

  useViewerStore.getState().resetStudies();
}

/**
 * Entry point every UI trigger (toolbar button, File menu, Ctrl+W) should call instead of
 * closeAllStudies() directly. Confirms first only when there's something a user could actually
 * lose: unexported measurements. The loaded images themselves aren't worth a prompt over — they're
 * just a re-open of the same files — but a measurement with no export has no other copy anywhere.
 *
 * `confirm` is injectable (defaulting to the real window.confirm) purely so this gating logic is
 * unit-testable without a DOM environment; callers never need to pass it.
 */
export function confirmAndCloseStudies(confirm: (message: string) => boolean = (message) => window.confirm(message)) {
  const { studies, measurements } = useViewerStore.getState();
  if (studies.length === 0) return;

  if (measurements.length > 0) {
    const noun = measurements.length === 1 ? 'measurement' : 'measurements';
    const verb = measurements.length === 1 ? "hasn't" : "haven't";
    const confirmed = confirm(
      `Close the loaded study? You have ${measurements.length} ${noun} that ${verb} been exported and will be lost.`,
    );
    if (!confirmed) return;
  }

  closeAllStudies();
}
