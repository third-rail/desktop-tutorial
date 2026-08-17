import { useEffect, useState } from 'react';
import { useViewerStore } from '../state/store';
import type { DicomSeries } from '../types/dicom';
import { getThumbnailDataUrl } from '../loaders/thumbnail';
import { popoutViewport } from '../platform/platform';
import PanelResizer from './PanelResizer';

export default function LeftPanel() {
  const studies = useViewerStore((s) => s.studies);
  const layout = useViewerStore((s) => s.layout);
  const slots = useViewerStore((s) => s.slots);
  const activeSlotId = useViewerStore((s) => s.activeSlotId);
  const assignSeriesToActiveSlot = useViewerStore((s) => s.assignSeriesToActiveSlot);
  const assignSeriesToAllSlots = useViewerStore((s) => s.assignSeriesToAllSlots);
  const width = useViewerStore((s) => s.leftPanelWidth);
  const setWidth = useViewerStore((s) => s.setLeftPanelWidth);

  // Two distinct signals: which series fills the viewport the user is currently driving, and which
  // are on screen in some other pane (common in 2×2/2×3 layouts, where several series are visible
  // at once and only one of them responds to the toolbar).
  const activeSeriesUID = slots.find((slot) => slot.id === activeSlotId)?.seriesInstanceUID;
  const displayedSeriesUIDs = new Set(
    slots.map((slot) => slot.seriesInstanceUID).filter((uid): uid is string => !!uid),
  );

  function handleSelectSeries(series: DicomSeries) {
    if (layout === 'mpr3d' && series.isVolumeCandidate) {
      assignSeriesToAllSlots(series.seriesInstanceUID);
    } else {
      assignSeriesToActiveSlot(series.seriesInstanceUID);
    }
  }

  if (studies.length === 0) {
    return (
      <div className="left-panel empty" style={{ width }}>
        <p>No studies loaded yet.</p>
        <PanelResizer side="left" width={width} onResize={setWidth} />
      </div>
    );
  }

  return (
    <div className="left-panel" style={{ width }}>
      <PanelResizer side="left" width={width} onResize={setWidth} />
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
                isActive={series.seriesInstanceUID === activeSeriesUID}
                isDisplayed={displayedSeriesUIDs.has(series.seriesInstanceUID)}
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

function SeriesThumbnail({
  series,
  isActive,
  isDisplayed,
  onSelect,
}: {
  series: DicomSeries;
  isActive: boolean;
  isDisplayed: boolean;
  onSelect: () => void;
}) {
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

  const state = isActive ? 'is-active' : isDisplayed ? 'is-displayed' : '';
  const stateTitle = isActive
    ? 'Showing in the active viewport'
    : isDisplayed
      ? 'Showing in another viewport'
      : series.seriesDescription;

  return (
    <button
      type="button"
      className={`series-thumb ${state}`}
      onClick={onSelect}
      title={stateTitle}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="series-thumb-image">
        {thumb ? <img src={thumb} alt="" /> : <div className="series-thumb-placeholder" />}
        <span className="series-modality-badge">{series.modality}</span>
        {series.isVolumeCandidate && <span className="series-volume-badge">3D</span>}
      </div>
      <div className="series-thumb-label">
        <div className="series-thumb-title">{series.seriesDescription}</div>
        <div className="series-thumb-count">
          {series.instances.length} images
          {isActive && <span className="series-state">Active</span>}
          {!isActive && isDisplayed && <span className="series-state muted-state">On screen</span>}
        </div>
      </div>
    </button>
  );
}
