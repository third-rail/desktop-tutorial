import type { Types } from '@cornerstonejs/core';
import { getOrCreateRenderingEngine } from './renderingEngine';

export interface WindowPreset {
  id: string;
  label: string;
  windowCenter: number;
  windowWidth: number;
}

/** Standard clinical CT window values. A reasonable one-click starting point on any modality. */
export const WINDOW_PRESETS: WindowPreset[] = [
  { id: 'soft-tissue', label: 'Soft Tissue', windowCenter: 40, windowWidth: 400 },
  { id: 'lung', label: 'Lung', windowCenter: -600, windowWidth: 1500 },
  { id: 'bone', label: 'Bone', windowCenter: 400, windowWidth: 1800 },
  { id: 'brain', label: 'Brain', windowCenter: 40, windowWidth: 80 },
];

/** Applies a window/level preset to a slot's stack viewport, if it has one. */
export function applyWindowPreset(slotId: string, preset: WindowPreset) {
  const viewportId = `viewport-${slotId}`;
  const renderingEngine = getOrCreateRenderingEngine();
  const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport | undefined;
  if (!viewport || typeof viewport.setProperties !== 'function') return;

  const lower = preset.windowCenter - preset.windowWidth / 2;
  const upper = preset.windowCenter + preset.windowWidth / 2;
  viewport.setProperties({ voiRange: { lower, upper } });
  viewport.render();
}
