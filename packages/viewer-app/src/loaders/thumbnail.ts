import { imageLoader } from '@cornerstonejs/core';

const cache = new Map<string, Promise<string>>();

/** Renders a small preview PNG data URL for the first instance of a series. */
export function getThumbnailDataUrl(imageId: string, size = 96): Promise<string> {
  const cached = cache.get(imageId);
  if (cached) return cached;

  const promise = imageLoader.loadAndCacheImage(imageId).then((image) => {
    const sourceCanvas = image.getCanvas();
    const scale = Math.min(size / sourceCanvas.width, size / sourceCanvas.height);
    const w = Math.max(1, Math.round(sourceCanvas.width * scale));
    const h = Math.max(1, Math.round(sourceCanvas.height * scale));

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = w;
    thumbCanvas.height = h;
    const ctx = thumbCanvas.getContext('2d');
    ctx?.drawImage(sourceCanvas, 0, 0, w, h);
    return thumbCanvas.toDataURL('image/png');
  });

  cache.set(imageId, promise);
  return promise;
}
