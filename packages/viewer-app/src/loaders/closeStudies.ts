import { cache, getRenderingEngine } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import { RENDERING_ENGINE_ID } from '../cornerstone/init';
import { clearVolumeCache } from '../cornerstone/volumes';
import { clearThumbnailCache } from './thumbnail';
import { useViewerStore } from '../state/store';

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
  getRenderingEngine(RENDERING_ENGINE_ID)?.destroy();

  cornerstoneTools.annotation.state.removeAllAnnotations();

  clearVolumeCache();
  clearThumbnailCache();
  cache.purgeCache();

  cornerstoneDICOMImageLoader.wadouri.fileManager.purge();
  cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.purge();

  useViewerStore.getState().resetStudies();
}
