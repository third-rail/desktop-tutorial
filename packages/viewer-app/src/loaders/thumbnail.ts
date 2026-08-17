import { imageLoader } from '@cornerstonejs/core';

const cache = new Map<string, Promise<string>>();

export interface VoiWindowParams {
  slope: number;
  intercept: number;
  windowCenter?: number;
  windowWidth?: number;
  minPixelValue: number;
  maxPixelValue: number;
  invert: boolean;
}

/**
 * Applies rescale slope/intercept and VOI windowing to raw pixel data, returning 0-255 grayscale
 * bytes. Falls back to the image's min/max pixel value when no window center/width is present.
 */
export function applyVoiWindow(pixelData: ArrayLike<number>, params: VoiWindowParams): Uint8ClampedArray {
  const { slope, intercept, windowCenter, windowWidth, minPixelValue, maxPixelValue, invert } = params;
  const hasWindow = typeof windowCenter === 'number' && typeof windowWidth === 'number' && windowWidth > 0;
  const lower = hasWindow ? windowCenter - windowWidth / 2 : minPixelValue;
  const upper = hasWindow ? windowCenter + windowWidth / 2 : maxPixelValue;
  const range = Math.max(1, upper - lower);

  const out = new Uint8ClampedArray(pixelData.length);
  for (let i = 0; i < pixelData.length; i++) {
    const raw = pixelData[i] * slope + intercept;
    let normalized = Math.round(((raw - lower) / range) * 255);
    normalized = Math.max(0, Math.min(255, normalized));
    if (invert) normalized = 255 - normalized;
    out[i] = normalized;
  }
  return out;
}

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
      const normalized = applyVoiWindow(pixelData, {
        slope: image.slope,
        intercept: image.intercept,
        windowCenter,
        windowWidth,
        minPixelValue: image.minPixelValue,
        maxPixelValue: image.maxPixelValue,
        invert: image.invert,
      });

      for (let i = 0; i < normalized.length; i++) {
        const offset = i * 4;
        imageData.data[offset] = normalized[i];
        imageData.data[offset + 1] = normalized[i];
        imageData.data[offset + 2] = normalized[i];
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
