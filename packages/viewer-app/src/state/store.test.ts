import { describe, expect, it } from 'vitest';
import { clampPanelWidth, PANEL_MAX_WIDTH, PANEL_MIN_WIDTH } from './store';

describe('clampPanelWidth', () => {
  it('leaves widths inside the allowed range untouched', () => {
    expect(clampPanelWidth(320)).toBe(320);
  });

  it('clamps below the minimum so a panel cannot be dragged shut', () => {
    expect(clampPanelWidth(0)).toBe(PANEL_MIN_WIDTH);
    expect(clampPanelWidth(-500)).toBe(PANEL_MIN_WIDTH);
  });

  it('clamps above the maximum so a panel cannot swallow the viewports', () => {
    expect(clampPanelWidth(5000)).toBe(PANEL_MAX_WIDTH);
  });

  it('rounds sub-pixel drag positions to whole pixels', () => {
    expect(clampPanelWidth(301.6)).toBe(302);
  });
});
