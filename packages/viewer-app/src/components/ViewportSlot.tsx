import { lazy, Suspense } from 'react';
import { useViewerStore } from '../state/store';
import type { ViewportSlot as ViewportSlotModel } from '../state/store';
import Viewport2D from './Viewport2D';

// MPR and 3D volume rendering pull in Cornerstone3D's volume-rendering machinery, which the
// far-more-common plain-2D reading path never touches. Deferring them keeps that machinery out of
// the bundle every user downloads and parses on launch, fetching it only once someone actually
// picks an MPR+3D layout.
const ViewportMPR = lazy(() => import('./ViewportMPR'));
const Viewport3D = lazy(() => import('./Viewport3D'));

interface Props {
  slot: ViewportSlotModel;
}

export default function ViewportSlot({ slot }: Props) {
  const activeSlotId = useViewerStore((s) => s.activeSlotId);
  const setActiveSlot = useViewerStore((s) => s.setActiveSlot);
  const active = activeSlotId === slot.id;
  const onActivate = () => setActiveSlot(slot.id);

  if (!slot.seriesInstanceUID || slot.kind === 'empty') {
    return (
      <div className={`viewport-pane empty ${active ? 'active' : ''}`} onClick={onActivate}>
        <span>Select a series from the left panel to load it here</span>
      </div>
    );
  }

  if (slot.kind === 'stack') {
    return (
      <Viewport2D
        slotId={slot.id}
        seriesInstanceUID={slot.seriesInstanceUID}
        active={active}
        onActivate={onActivate}
      />
    );
  }

  const fallback = (
    <div className="viewport-pane">
      <div className="viewport-status">Loading 3D renderer…</div>
    </div>
  );

  if (slot.kind === 'volume3d') {
    return (
      <Suspense fallback={fallback}>
        <Viewport3D
          slotId={slot.id}
          seriesInstanceUID={slot.seriesInstanceUID}
          active={active}
          onActivate={onActivate}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <ViewportMPR
        slotId={slot.id}
        seriesInstanceUID={slot.seriesInstanceUID}
        kind={slot.kind}
        active={active}
        onActivate={onActivate}
      />
    </Suspense>
  );
}
