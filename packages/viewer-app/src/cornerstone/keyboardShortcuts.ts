import { useViewerStore, findSeries } from '../state/store';
import { getViewportControls } from './activeViewportControls';

/**
 * Global reading-room shortcuts, scoped to the active viewport slot:
 *   Page Up / Page Down  — step through the active viewport's slices
 *   Left / Right arrow   — switch the active viewport to the previous/next series in its study
 *   Space                — play/pause cine on the active viewport, if it's a multiframe series
 *
 * Scroll and cine only wire up for the plain 2D stack viewport (the primary reading case) — MPR
 * panes navigate slices via the crosshairs tool instead, which is a different interaction model
 * this pass doesn't touch.
 */

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest('.panel-resizer')) return true;
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
}

function switchSeries(direction: 1 | -1) {
  const { studies, slots, activeSlotId, assignSeriesToSlot } = useViewerStore.getState();
  if (!activeSlotId) return;
  const slot = slots.find((s) => s.id === activeSlotId);
  if (!slot?.seriesInstanceUID) return;

  const found = findSeries(studies, slot.seriesInstanceUID);
  if (!found) return;

  const seriesList = found.study.series;
  const currentIndex = seriesList.findIndex((s) => s.seriesInstanceUID === slot.seriesInstanceUID);
  if (currentIndex === -1 || seriesList.length < 2) return;

  const nextIndex = (currentIndex + direction + seriesList.length) % seriesList.length;
  assignSeriesToSlot(activeSlotId, seriesList[nextIndex].seriesInstanceUID);
}

function handleKeyDown(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) return;

  const { activeSlotId } = useViewerStore.getState();
  if (!activeSlotId) return;

  if (event.key === 'PageUp' || event.key === 'PageDown') {
    const controls = getViewportControls(activeSlotId);
    if (!controls?.scroll) return;
    event.preventDefault();
    controls.scroll(event.key === 'PageUp' ? -1 : 1);
    return;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    switchSeries(event.key === 'ArrowLeft' ? -1 : 1);
    return;
  }

  if (event.key === ' ') {
    const controls = getViewportControls(activeSlotId);
    if (!controls?.toggleCine) return;
    event.preventDefault();
    controls.toggleCine();
  }
}

let installed = false;

/** Installs the shortcut listener once for the app's lifetime. Idempotent. */
export function installKeyboardShortcuts() {
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', handleKeyDown);
}
