import { volumeLoader, imageLoader, type Types } from '@cornerstonejs/core';
import { STREAMING_VOLUME_SCHEME } from './init';
import type { DicomSeries } from '../types/dicom';

const volumeCache = new Map<string, Promise<Types.IImageVolume>>();

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export function volumeIdForSeries(seriesInstanceUID: string): string {
  return `${STREAMING_VOLUME_SCHEME}:series-${seriesInstanceUID}`;
}

/** Builds (and caches) a streaming volume for a series so multiple MPR/3D viewports can share one load. */
export function getOrCreateVolumeForSeries(series: DicomSeries): Promise<Types.IImageVolume> {
  const volumeId = volumeIdForSeries(series.seriesInstanceUID);
  const cached = volumeCache.get(volumeId);
  if (cached) return cached;

  const promise = (async () => {
    const imageIds = series.instances.map((i) => i.imageId);
    // Volume construction needs each instance's position/orientation metadata synchronously
    // (to sort slices and compute spacing) before it starts streaming voxels, but the wadouri
    // loader only populates that metadata cache once an image has actually been parsed — so for
    // locally-loaded files (never individually opened yet) we have to prime every instance first.
    await withTimeout(
      Promise.all(imageIds.map((imageId) => imageLoader.loadAndCacheImage(imageId))),
      60000,
      'Decoding the volume slices timed out',
    );
    const volume = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });
    await withTimeout(
      new Promise<void>((resolve) => volume.load(() => resolve())),
      60000,
      'Loading the volume timed out',
    );
    return volume;
  })();

  promise.catch(() => volumeCache.delete(volumeId));
  volumeCache.set(volumeId, promise);
  return promise;
}

export function clearVolumeCache() {
  volumeCache.clear();
}
