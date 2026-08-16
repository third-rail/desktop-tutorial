import { useViewerStore } from '../state/store';
import type { ViewportSlot as ViewportSlotModel } from '../state/store';
import Viewport2D from './Viewport2D';
import ViewportMPR from './ViewportMPR';
import Viewport3D from './Viewport3D';

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

  if (slot.kind === 'volume3d') {
    return (
      <Viewport3D
        slotId={slot.id}
        seriesInstanceUID={slot.seriesInstanceUID}
        active={active}
        onActivate={onActivate}
      />
    );
  }

  return (
    <ViewportMPR
      slotId={slot.id}
      seriesInstanceUID={slot.seriesInstanceUID}
      kind={slot.kind}
      active={active}
      onActivate={onActivate}
    />
  );
}
