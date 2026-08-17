import { describe, expect, it, vi } from 'vitest';
import { getViewportControls, registerViewportControls } from './activeViewportControls';

describe('registerViewportControls', () => {
  it('registers and retrieves controls for a slot', () => {
    const scroll = vi.fn();
    const unregister = registerViewportControls('slot-a', { scroll });
    expect(getViewportControls('slot-a')?.scroll).toBe(scroll);
    unregister();
  });

  it('merges registrations for the same slot instead of clobbering them', () => {
    const scroll = vi.fn();
    const toggleCine = vi.fn();
    const unregisterScroll = registerViewportControls('slot-b', { scroll });
    const unregisterCine = registerViewportControls('slot-b', { toggleCine });

    expect(getViewportControls('slot-b')).toEqual({ scroll, toggleCine });

    unregisterCine();
    expect(getViewportControls('slot-b')).toEqual({ scroll });

    unregisterScroll();
    expect(getViewportControls('slot-b')).toBeUndefined();
  });

  it('does not remove a newer registration when an older one unregisters', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unregisterFirst = registerViewportControls('slot-c', { scroll: first });
    registerViewportControls('slot-c', { scroll: second });

    // The slot's scroll was reassigned before the first registrant cleaned up.
    unregisterFirst();
    expect(getViewportControls('slot-c')?.scroll).toBe(second);
  });

  it('returns undefined for a slot nothing has registered', () => {
    expect(getViewportControls('never-registered')).toBeUndefined();
  });
});
