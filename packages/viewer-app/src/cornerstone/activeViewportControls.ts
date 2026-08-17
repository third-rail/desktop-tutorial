/**
 * Lets non-viewport code (the global keyboard-shortcut handler) reach the viewport the user is
 * currently focused on, without every viewport component needing to know shortcuts exist.
 * Viewport2D and CineControls each register the piece they own — registrations are merged per
 * slot rather than replaced, since a cine-capable slot has both a scroll and a toggleCine
 * registrant mounted at once and neither should clobber the other on (un)mount.
 */

export interface ViewportControls {
  scroll?: (delta: number) => void;
  toggleCine?: () => void;
}

const registry = new Map<string, ViewportControls>();

export function registerViewportControls(slotId: string, partial: ViewportControls): () => void {
  const merged: ViewportControls = { ...registry.get(slotId), ...partial };
  registry.set(slotId, merged);

  return () => {
    const current = registry.get(slotId);
    if (!current) return;
    const next = { ...current };
    for (const key of Object.keys(partial) as (keyof ViewportControls)[]) {
      if (next[key] === partial[key]) delete next[key];
    }
    if (Object.keys(next).length === 0) {
      registry.delete(slotId);
    } else {
      registry.set(slotId, next);
    }
  };
}

export function getViewportControls(slotId: string): ViewportControls | undefined {
  return registry.get(slotId);
}
