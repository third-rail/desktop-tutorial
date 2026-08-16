import * as cornerstoneTools from '@cornerstonejs/tools';
import { useViewerStore } from '../state/store';
import { getOrCreateRenderingEngine } from '../cornerstone/renderingEngine';

export default function RightPanel() {
  const measurements = useViewerStore((s) => s.measurements);

  function removeMeasurement(annotationUID: string) {
    cornerstoneTools.annotation.state.removeAnnotation(annotationUID);
    getOrCreateRenderingEngine().render();
  }

  return (
    <div className="right-panel">
      <h3>Measurements</h3>
      {measurements.length === 0 && <p className="muted">No measurements yet. Use a tool from the toolbar.</p>}
      <ul className="measurements-list">
        {measurements.map((m) => (
          <li key={m.annotationUID}>
            <div>
              <strong>{m.toolName}</strong>
              <span>
                {m.label}: {m.value} {m.unit}
              </span>
            </div>
            <button type="button" onClick={() => removeMeasurement(m.annotationUID)} aria-label="Remove">
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
