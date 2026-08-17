import { useEffect, useState } from 'react';
import { requestSlotData, listenForStudiesClosed } from '../platform/popoutChannel';
import { useViewerStore } from '../state/store';
import type { ViewportKind } from '../state/store';
import Viewport2D from './Viewport2D';
import ViewportMPR from './ViewportMPR';
import Viewport3D from './Viewport3D';

const AUTO_CLOSE_DELAY_MS = 2500;

export default function PopoutView({ slotId }: { slotId: string }) {
  const addStudies = useViewerStore((s) => s.addStudies);
  const [resolved, setResolved] = useState<{ kind: ViewportKind; seriesInstanceUID: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studyClosed, setStudyClosed] = useState(false);

  useEffect(() => {
    requestSlotData(slotId)
      .then(({ kind, study, series }) => {
        // `series` carries imageIds requestSlotData just remapped into this window's own DICOM
        // file cache; `study` (as received) still has every series pointing at the main window's
        // original imageIds, which don't exist here. Storing `study` as-is would make lookups by
        // seriesInstanceUID resolve those stale ids instead of the ones actually cached locally —
        // it only appeared to work when a single series was loaded and the index ranges happened
        // to coincide. Splice the remapped series back in before this window ever stores the study.
        const localStudy = {
          ...study,
          series: study.series.map((s) => (s.seriesInstanceUID === series.seriesInstanceUID ? series : s)),
        };
        addStudies([localStudy]);
        setResolved({ kind: kind as ViewportKind, seriesInstanceUID: series.seriesInstanceUID });
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  useEffect(() => {
    return listenForStudiesClosed(() => {
      setStudyClosed(true);
      setTimeout(() => window.close(), AUTO_CLOSE_DELAY_MS);
    });
  }, []);

  if (studyClosed) {
    return <div className="popout-message">Study was closed in the main window. This window will close shortly…</div>;
  }
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
