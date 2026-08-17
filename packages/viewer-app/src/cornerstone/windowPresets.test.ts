import { describe, expect, it } from 'vitest';
import { WINDOW_PRESETS } from './windowPresets';

// applyWindowPreset() itself talks directly to a live Cornerstone rendering engine and viewport,
// so it's exercised by the Playwright browser check rather than a unit test here; what's worth
// covering in isolation is that the preset table itself is well-formed.
describe('WINDOW_PRESETS', () => {
  it('has a unique id for every preset', () => {
    const ids = WINDOW_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every preset a positive window width', () => {
    for (const preset of WINDOW_PRESETS) {
      expect(preset.windowWidth).toBeGreaterThan(0);
    }
  });

  it('includes the standard soft tissue, lung, bone, and brain presets', () => {
    const labels = WINDOW_PRESETS.map((p) => p.label);
    expect(labels).toEqual(expect.arrayContaining(['Soft Tissue', 'Lung', 'Bone', 'Brain']));
  });
});
