import { describe, expect, it } from 'vitest';
import { applyVoiWindow } from './thumbnail';

describe('applyVoiWindow', () => {
  it('maps values within the window linearly to 0-255', () => {
    const out = applyVoiWindow([0, 50, 100], {
      slope: 1,
      intercept: 0,
      windowCenter: 50,
      windowWidth: 100,
      minPixelValue: 0,
      maxPixelValue: 100,
      invert: false,
    });
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(128);
    expect(out[2]).toBe(255);
  });

  it('clamps values outside the window to 0 or 255', () => {
    const out = applyVoiWindow([-1000, 5000], {
      slope: 1,
      intercept: 0,
      windowCenter: 50,
      windowWidth: 100,
      minPixelValue: 0,
      maxPixelValue: 100,
      invert: false,
    });
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(255);
  });

  it('applies rescale slope and intercept before windowing', () => {
    // Raw stored value 0 with slope 2 / intercept -1000 (typical CT) -> Hounsfield -1000
    const out = applyVoiWindow([0, 1000], {
      slope: 2,
      intercept: -1000,
      windowCenter: 0,
      windowWidth: 2000,
      minPixelValue: 0,
      maxPixelValue: 4000,
      invert: false,
    });
    // raw HU = 0*2 - 1000 = -1000 -> window [-1000, 1000] -> normalized 0
    expect(out[0]).toBe(0);
    // raw HU = 1000*2 - 1000 = 1000 -> window upper bound -> normalized 255
    expect(out[1]).toBe(255);
  });

  it('inverts output when invert is true', () => {
    const out = applyVoiWindow([0, 100], {
      slope: 1,
      intercept: 0,
      windowCenter: 50,
      windowWidth: 100,
      invert: true,
      minPixelValue: 0,
      maxPixelValue: 100,
    });
    expect(out[0]).toBe(255);
    expect(out[1]).toBe(0);
  });

  it('falls back to min/max pixel value when no window center/width is present', () => {
    const out = applyVoiWindow([10, 20, 30], {
      slope: 1,
      intercept: 0,
      minPixelValue: 10,
      maxPixelValue: 30,
      invert: false,
    });
    expect(out[0]).toBe(0);
    expect(out[2]).toBe(255);
  });

  it('avoids divide-by-zero when window width collapses the range to zero', () => {
    const out = applyVoiWindow([5], {
      slope: 1,
      intercept: 0,
      minPixelValue: 5,
      maxPixelValue: 5,
      invert: false,
    });
    expect(Number.isFinite(out[0])).toBe(true);
  });
});
