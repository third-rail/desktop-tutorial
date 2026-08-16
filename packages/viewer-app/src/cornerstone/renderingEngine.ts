import { RenderingEngine, getRenderingEngine } from '@cornerstonejs/core';
import { RENDERING_ENGINE_ID } from './init';

export function getOrCreateRenderingEngine(): RenderingEngine {
  return getRenderingEngine(RENDERING_ENGINE_ID) ?? new RenderingEngine(RENDERING_ENGINE_ID);
}
