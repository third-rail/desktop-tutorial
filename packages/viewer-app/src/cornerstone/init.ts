import * as core from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

export const STREAMING_VOLUME_SCHEME = 'cornerstoneStreamingImageVolume';

let initialized = false;
let initPromise: Promise<void> | null = null;

/** One-time bootstrap of the Cornerstone3D rendering engine, tool manager, and DICOM file loader. */
export function ensureCornerstoneInitialized(): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    core.init();
    cornerstoneTools.init();
    cornerstoneDICOMImageLoader.init({
      maxWebWorkers: Math.min(4, navigator.hardwareConcurrency || 2),
    });

    core.volumeLoader.registerVolumeLoader(
      STREAMING_VOLUME_SCHEME,
      core.cornerstoneStreamingImageVolumeLoader as unknown as Types.VolumeLoaderFn,
    );
    core.volumeLoader.registerUnknownVolumeLoader(
      core.cornerstoneStreamingImageVolumeLoader as unknown as Types.VolumeLoaderFn,
    );

    const {
      PanTool,
      ZoomTool,
      WindowLevelTool,
      StackScrollTool,
      LengthTool,
      AngleTool,
      RectangleROITool,
      EllipticalROITool,
      ArrowAnnotateTool,
      CrosshairsTool,
      TrackballRotateTool,
      VolumeRotateTool,
      VolumeCroppingTool,
      MagnifyTool,
      addTool,
    } = cornerstoneTools;

    for (const Tool of [
      PanTool,
      ZoomTool,
      WindowLevelTool,
      StackScrollTool,
      LengthTool,
      AngleTool,
      RectangleROITool,
      EllipticalROITool,
      ArrowAnnotateTool,
      CrosshairsTool,
      TrackballRotateTool,
      VolumeRotateTool,
      VolumeCroppingTool,
      MagnifyTool,
    ]) {
      addTool(Tool);
    }

    initialized = true;
  })();

  return initPromise;
}

export const RENDERING_ENGINE_ID = 'dicom-viewer-engine';
