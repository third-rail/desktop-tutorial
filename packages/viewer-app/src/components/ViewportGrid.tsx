import { useViewerStore } from '../state/store';
import ViewportSlot from './ViewportSlot';

const GRID_CLASS: Record<string, string> = {
  '1x1': 'grid-1x1',
  '1x2': 'grid-1x2',
  '2x2': 'grid-2x2',
  '2x3': 'grid-2x3',
  mpr3d: 'grid-2x2',
};

export default function ViewportGrid() {
  const layout = useViewerStore((s) => s.layout);
  const slots = useViewerStore((s) => s.slots);

  return (
    <div className={`viewport-grid ${GRID_CLASS[layout]}`}>
      {slots.map((slot) => (
        <ViewportSlot key={slot.id} slot={slot} />
      ))}
    </div>
  );
}
