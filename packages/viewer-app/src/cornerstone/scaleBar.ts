/** Real-world lengths (mm) a scale bar is allowed to represent, smallest first. */
const NICE_LENGTHS_MM = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

const MAX_BAR_WIDTH_PX = 140;

export interface ScaleBarResult {
  widthPx: number;
  label: string;
}

/**
 * Picks a "nice" round real-world length (1mm, 5mm, 10cm, ...) whose on-screen width at the
 * current zoom fits under MAX_BAR_WIDTH_PX, preferring the largest one that still fits so the bar
 * stays easy to read. Falls back to the smallest nice length if even that would overflow (heavily
 * zoomed out).
 */
export function computeScaleBar(canvasPixelsPerMm: number): ScaleBarResult | null {
  if (!Number.isFinite(canvasPixelsPerMm) || canvasPixelsPerMm <= 0) return null;

  let chosen = NICE_LENGTHS_MM[0];
  for (const lengthMm of NICE_LENGTHS_MM) {
    if (lengthMm * canvasPixelsPerMm > MAX_BAR_WIDTH_PX) break;
    chosen = lengthMm;
  }

  return {
    widthPx: chosen * canvasPixelsPerMm,
    label: chosen >= 10 ? `${chosen / 10} cm` : `${chosen} mm`,
  };
}

/**
 * Cornerstone's world coordinate system is in millimeters for calibrated images (spacing baked
 * into the image plane), so canvas-pixels-per-mm is just canvas-pixels-per-world-unit — the same
 * ratio the viewport already uses to convert its orthographic camera's parallelScale to screen
 * space. parallelScale is the world-space half-height of the visible viewport.
 */
export function canvasPixelsPerMm(elementHeightPx: number, parallelScale: number): number {
  if (!parallelScale) return 0;
  return elementHeightPx / (2 * parallelScale);
}
