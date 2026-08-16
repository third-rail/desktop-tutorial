import { useEffect, useState } from 'react';
import { useViewerStore } from '../state/store';
import type { DicomSeries } from '../types/dicom';
import { getThumbnailDataUrl } from '../loaders/thumbnail';
import { popoutViewport } from '../platform/platform';

export default function LeftPanel() {
  const studies = useViewerStore((s) => s.studies);
  const layout = useViewerStore((s) => s.layout);
  const activeSlotId = useViewerStore((s) => s.activeSlotId);
  const assignSeriesToActiveSlot = useViewerStore((s) => s.assignSeriesToActiveSlot);
  const assignSeriesToAllSlots = useViewerStore((s) => s.assignSeriesToAllSlots);

  function handleSelectSeries(series: DicomSeries) {
    if (layout === 'mpr3d' && series.isVolumeCandidate) {
      assignSeriesToAllSlots(series.seriesInstanceUID);
    } else {
      assignSeriesToActiveSlot(series.seriesInstanceUID);
    }
  }

  if (studies.length === 0) {
    return (
      <div className="left-panel empty">
        <p>No studies loaded yet.</p>
      </div>
    );
  }

  return (
    <div className="left-panel">
      {studies.map((study) => (
        <div key={study.studyInstanceUID} className="study-block">
          <div className="patient-header">
            <div className="patient-name">{study.patientName}</div>
            <div className="patient-meta">
              ID {study.patientId} · DOB {study.patientBirthDate || '—'} · {study.patientSex || '—'}
            </div>
            <div className="patient-meta">
              {study.studyDescription} · {study.studyDate || '—'}
            </div>
          </div>
          <div className="series-list">
            {study.series.map((series) => (
              <SeriesThumbnail
                key={series.seriesInstanceUID}
                series={series}
                onSelect={() => handleSelectSeries(series)}
              />
            ))}
          </div>
        </div>
      ))}
      {activeSlotId && (
        <button type="button" className="popout-active-btn" onClick={() => popoutViewport(activeSlotId)}>
          Pop out active viewport
        </button>
      )}
    </div>
  );
}

function SeriesThumbnail({ series, onSelect }: { series: DicomSeries; onSelect: () => void }) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const firstInstance = series.instances[0];
    if (firstInstance) {
      getThumbnailDataUrl(firstInstance.imageId)
        .then((url) => {
          if (!cancelled) setThumb(url);
        })
        .catch((err) => console.error('Failed to generate thumbnail', err));
    }
    return () => {
      cancelled = true;
    };
  }, [series]);

  return (
    <button type="button" className="series-thumb" onClick={onSelect} title={series.seriesDescription}>
      <div className="series-thumb-image">
        {thumb ? <img src={thumb} alt="" /> : <div className="series-thumb-placeholder" />}
        <span className="series-modality-badge">{series.modality}</span>
        {series.isVolumeCandidate && <span className="series-volume-badge">3D</span>}
      </div>
      <div className="series-thumb-label">
        <div>{series.seriesDescription}</div>
        <div className="series-thumb-count">{series.instances.length} images</div>
      </div>
    </button>
  );
}
