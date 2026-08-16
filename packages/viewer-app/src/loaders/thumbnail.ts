import { imageLoader } from '@cornerstonejs/core';

const cache = new Map<string, Promise<string>>();

/** Renders a small preview PNG data URL for the first instance of a series. */
export function getThumbnailDataUrl(imageId: string, size = 96): Promise<string> {
  const cached = cache.get(imageId);
  if (cached) return cached;

  const promise = imageLoader.loadAndCacheImage(imageId).then((image) => {
    const scale = Math.min(size / image.columns, size / image.rows);
    const w = Math.max(1, Math.round(image.columns * scale));
    const h = Math.max(1, Math.round(image.rows * scale));

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.columns;
    sourceCanvas.height = image.rows;
    const sourceCtx = sourceCanvas.getContext('2d')!;

    if (image.color && image.getCanvas) {
      sourceCtx.drawImage(image.getCanvas(), 0, 0);
    } else {
      // The dicom-image-loader only implements getCanvas() for color images; grayscale images
      // (the vast majority of DICOM — CT, MR, CR/DX...) need manual VOI-windowed rendering.
      const pixelData = image.getPixelData();
      const imageData = sourceCtx.createImageData(image.columns, image.rows);
      const windowCenter = Array.isArray(image.windowCenter) ? image.windowCenter[0] : image.windowCenter;
      const windowWidth = Array.isArray(image.windowWidth) ? image.windowWidth[0] : image.windowWidth;
      const hasWindow = typeof windowCenter === 'number' && typeof windowWidth === 'number' && windowWidth > 0;
      const lower = hasWindow ? windowCenter - windowWidth / 2 : image.minPixelValue;
      const upper = hasWindow ? windowCenter + windowWidth / 2 : image.maxPixelValue;
      const range = Math.max(1, upper - lower);
      const invert = image.invert;

      for (let i = 0; i < pixelData.length; i++) {
        const raw = pixelData[i] * image.slope + image.intercept;
        let normalized = Math.round(((raw - lower) / range) * 255);
        normalized = Math.max(0, Math.min(255, normalized));
        if (invert) normalized = 255 - normalized;
        const offset = i * 4;
        imageData.data[offset] = normalized;
        imageData.data[offset + 1] = normalized;
        imageData.data[offset + 2] = normalized;
        imageData.data[offset + 3] = 255;
      }
      sourceCtx.putImageData(imageData, 0, 0);
    }

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = w;
    thumbCanvas.height = h;
    thumbCanvas.getContext('2d')?.drawImage(sourceCanvas, 0, 0, w, h);
    return thumbCanvas.toDataURL('image/png');
  });

  cache.set(imageId, promise);
  return promise;
}
