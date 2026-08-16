import { useEffect, useState } from 'react';
import { requestSlotData } from '../platform/popoutChannel';
import { useViewerStore } from '../state/store';
import type { ViewportKind } from '../state/store';
import Viewport2D from './Viewport2D';
import ViewportMPR from './ViewportMPR';
import Viewport3D from './Viewport3D';

export default function PopoutView({ slotId }: { slotId: string }) {
  const addStudies = useViewerStore((s) => s.addStudies);
  const [resolved, setResolved] = useState<{ kind: ViewportKind; seriesInstanceUID: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestSlotData(slotId)
      .then(({ kind, study, series }) => {
        addStudies([study]);
        setResolved({ kind: kind as ViewportKind, seriesInstanceUID: series.seriesInstanceUID });
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  if (error) {
    return <div className="popout-message">{error}</div>;
  }
  if (!resolved) {
    return <div className="popout-message">Loading viewport…</div>;
  }

  const noop = () => undefined;
  const commonProps = { slotId: 'popout', seriesInstanceUID: resolved.seriesInstanceUID, active: true, onActivate: noop };

  return (
    <div className="popout-root">
      {resolved.kind === 'volume3d' && <Viewport3D {...commonProps} />}
      {resolved.kind === 'stack' && <Viewport2D {...commonProps} />}
      {(resolved.kind === 'mpr-axial' || resolved.kind === 'mpr-sagittal' || resolved.kind === 'mpr-coronal') && (
        <ViewportMPR {...commonProps} kind={resolved.kind} />
      )}
    </div>
  );
}
