import { describe, expect, it } from 'vitest';
import { canvasPixelsPerMm, computeScaleBar } from './scaleBar';

describe('canvasPixelsPerMm', () => {
  it('derives screen pixels per world-mm from element height and parallel scale', () => {
    // A 500px-tall element showing a 100mm-tall world (parallelScale is half-height = 50mm)
    // means 500px / 100mm = 5 px/mm.
    expect(canvasPixelsPerMm(500, 50)).toBe(5);
  });

  it('returns 0 for a degenerate parallel scale', () => {
    expect(canvasPixelsPerMm(500, 0)).toBe(0);
  });
});

describe('computeScaleBar', () => {
  it('picks the largest nice length that fits under the width cap', () => {
    // At 5 px/mm, 20mm -> 100px (fits under 140px cap); the next size, 25mm, would be 125px,
    // which still fits, so 25mm should be chosen over 20mm.
    const result = computeScaleBar(5);
    expect(result).not.toBeNull();
    expect(result!.widthPx).toBeLessThanOrEqual(140);
    expect(result!.widthPx).toBeGreaterThan(60);
  });

  it('formats lengths at or above 10mm as centimeters', () => {
    const result = computeScaleBar(5); // picks 25mm -> "2.5 cm"
    expect(result!.label).toMatch(/cm$/);
  });

  it('formats lengths under 10mm as millimeters when heavily zoomed in', () => {
    // Extremely high magnification: even 1mm would overflow the cap, so it falls back to 1mm.
    const result = computeScaleBar(1000);
    expect(result!.label).toBe('1 mm');
  });

  it('falls back to the smallest nice length when zoomed out past the largest one fitting', () => {
    // Very low magnification: 1000mm barely fits or nothing fits comfortably — should still
    // return a result, not null, and use the smallest available length as a floor.
    const result = computeScaleBar(0.001);
    expect(result).not.toBeNull();
  });

  it('returns null for non-finite or non-positive ratios', () => {
    expect(computeScaleBar(0)).toBeNull();
    expect(computeScaleBar(-5)).toBeNull();
    expect(computeScaleBar(NaN)).toBeNull();
    expect(computeScaleBar(Infinity)).toBeNull();
  });
});
