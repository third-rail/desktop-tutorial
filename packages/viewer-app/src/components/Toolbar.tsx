import { useViewerStore } from '../state/store';
import type { LayoutPreset } from '../state/store';
import { ANNOTATION_TOOL_NAMES, setPrimaryTool, STACK_TOOL_GROUP_ID, MPR_TOOL_GROUP_ID } from '../cornerstone/toolGroups';
import type { PrimaryToolName } from '../cornerstone/toolGroups';
import { openAndLoad } from '../loaders/openAndIngest';
import { exportActiveViewportAsPdf } from '../export/pdfReport';
import { exportMeasurementsJson } from '../export/annotationExport';

const TOOL_LABELS: Record<PrimaryToolName, string> = {
  WindowLevel: 'Window/Level',
  Pan: 'Pan',
  Zoom: 'Zoom',
  Length: 'Length',
  Angle: 'Angle',
  RectangleROI: 'Rectangle ROI',
  EllipticalROI: 'Ellipse ROI',
  ArrowAnnotate: 'Arrow',
  Crosshairs: 'Crosshairs',
};

const LAYOUTS: { id: LayoutPreset; label: string }[] = [
  { id: '1x1', label: '1×1' },
  { id: '1x2', label: '1×2' },
  { id: '2x2', label: '2×2' },
  { id: '2x3', label: '2×3' },
  { id: 'mpr3d', label: 'MPR + 3D' },
];

export default function Toolbar() {
  const primaryTool = useViewerStore((s) => s.primaryTool);
  const setPrimaryToolInStore = useViewerStore((s) => s.setPrimaryTool);
  const layout = useViewerStore((s) => s.layout);
  const setLayout = useViewerStore((s) => s.setLayout);
  const toggleLeftPanel = useViewerStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useViewerStore((s) => s.toggleRightPanel);
  const activeSlotId = useViewerStore((s) => s.activeSlotId);
  const measurements = useViewerStore((s) => s.measurements);

  function handleToolSelect(tool: PrimaryToolName) {
    setPrimaryToolInStore(tool);
    setPrimaryTool(STACK_TOOL_GROUP_ID, tool);
    setPrimaryTool(MPR_TOOL_GROUP_ID, tool);
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button type="button" onClick={() => openAndLoad('files')}>
          Open Files
        </button>
        <button type="button" onClick={() => openAndLoad('folder')}>
          Open Folder / ZIP
        </button>
      </div>

      <div className="toolbar-group">
        {ANNOTATION_TOOL_NAMES.map((tool) => (
          <button
            key={tool}
            type="button"
            className={primaryTool === tool ? 'toggle-on' : ''}
            onClick={() => handleToolSelect(tool)}
          >
            {TOOL_LABELS[tool]}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <label className="layout-picker">
          Layout
          <select value={layout} onChange={(e) => setLayout(e.target.value as LayoutPreset)}>
            {LAYOUTS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar-group toolbar-group-end">
        <button
          type="button"
          disabled={!activeSlotId}
          onClick={() => activeSlotId && exportActiveViewportAsPdf(activeSlotId, measurements)}
        >
          Export PDF
        </button>
        <button type="button" disabled={measurements.length === 0} onClick={() => exportMeasurementsJson(measurements)}>
          Export Measurements
        </button>
        <button type="button" onClick={toggleLeftPanel}>
          ◧
        </button>
        <button type="button" onClick={toggleRightPanel}>
          ◨
        </button>
      </div>
    </div>
  );
}
