import type { ReactNode } from 'react';
import { useViewerStore } from '../state/store';
import type { LayoutPreset } from '../state/store';
import { ANNOTATION_TOOL_NAMES, setPrimaryTool, STACK_TOOL_GROUP_ID, MPR_TOOL_GROUP_ID } from '../cornerstone/toolGroups';
import type { PrimaryToolName } from '../cornerstone/toolGroups';
import { openAndLoad } from '../loaders/openAndIngest';
import { closeAllStudies } from '../loaders/closeStudies';
import { exportActiveViewportAsPdf } from '../export/pdfReport';
import { exportMeasurementsJson } from '../export/annotationExport';
import { applyWindowPreset, WINDOW_PRESETS } from '../cornerstone/windowPresets';
import {
  IconAngle,
  IconArrow,
  IconCloseStudy,
  IconCrosshairs,
  IconEllipseRoi,
  IconExportData,
  IconExportPdf,
  IconLength,
  IconOpenFiles,
  IconOpenFolder,
  IconPan,
  IconPanelLeft,
  IconPanelRight,
  IconRectangleRoi,
  IconWindowLevel,
  IconZoom,
} from './icons';

const TOOL_LABELS: Record<PrimaryToolName, string> = {
  WindowLevel: 'Window/Level',
  Pan: 'Pan',
  Zoom: 'Zoom',
  Length: 'Length',
  Angle: 'Angle',
  RectangleROI: 'Rectangle',
  EllipticalROI: 'Ellipse',
  ArrowAnnotate: 'Arrow',
  Crosshairs: 'Crosshairs',
};

const TOOL_ICONS: Record<PrimaryToolName, () => ReactNode> = {
  WindowLevel: IconWindowLevel,
  Pan: IconPan,
  Zoom: IconZoom,
  Length: IconLength,
  Angle: IconAngle,
  RectangleROI: IconRectangleRoi,
  EllipticalROI: IconEllipseRoi,
  ArrowAnnotate: IconArrow,
  Crosshairs: IconCrosshairs,
};

const LAYOUTS: { id: LayoutPreset; label: string }[] = [
  { id: '1x1', label: '1×1' },
  { id: '1x2', label: '1×2' },
  { id: '2x2', label: '2×2' },
  { id: '2x3', label: '2×3' },
  { id: 'mpr3d', label: 'MPR + 3D' },
];

interface ToolButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

function ToolButton({ icon, label, onClick, active, disabled, title }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`tool-button ${active ? 'toggle-on' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-pressed={active}
    >
      <span className="tool-button-icon">{icon}</span>
      <span className="tool-button-label">{label}</span>
    </button>
  );
}

export default function Toolbar() {
  const primaryTool = useViewerStore((s) => s.primaryTool);
  const setPrimaryToolInStore = useViewerStore((s) => s.setPrimaryTool);
  const layout = useViewerStore((s) => s.layout);
  const setLayout = useViewerStore((s) => s.setLayout);
  const leftPanelOpen = useViewerStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useViewerStore((s) => s.rightPanelOpen);
  const toggleLeftPanel = useViewerStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useViewerStore((s) => s.toggleRightPanel);
  const activeSlotId = useViewerStore((s) => s.activeSlotId);
  const slots = useViewerStore((s) => s.slots);
  const measurements = useViewerStore((s) => s.measurements);
  const studies = useViewerStore((s) => s.studies);

  // Window/level presets only make sense on a plain 2D stack — MPR/3D viewports use volume
  // rendering properties instead, and an empty slot has no image to window.
  const activeSlotKind = slots.find((s) => s.id === activeSlotId)?.kind;
  const canApplyWindowPreset = activeSlotKind === 'stack';

  function handleToolSelect(tool: PrimaryToolName) {
    setPrimaryToolInStore(tool);
    setPrimaryTool(STACK_TOOL_GROUP_ID, tool);
    setPrimaryTool(MPR_TOOL_GROUP_ID, tool);
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group toolbar-group-file" role="group" aria-label="Study">
        <ToolButton icon={<IconOpenFiles />} label="Open Files" onClick={() => openAndLoad('files')} />
        <ToolButton icon={<IconOpenFolder />} label="Folder / ZIP" onClick={() => openAndLoad('folder')} />
        <ToolButton
          icon={<IconCloseStudy />}
          label="Close"
          onClick={closeAllStudies}
          disabled={studies.length === 0}
          title="Close the loaded study (Ctrl+W)"
        />
      </div>

      <div className="toolbar-group toolbar-group-tools" role="group" aria-label="Tools">
        {ANNOTATION_TOOL_NAMES.map((tool) => {
          const Icon = TOOL_ICONS[tool];
          return (
            <ToolButton
              key={tool}
              icon={<Icon />}
              label={TOOL_LABELS[tool]}
              active={primaryTool === tool}
              onClick={() => handleToolSelect(tool)}
            />
          );
        })}
      </div>

      <div className="toolbar-group toolbar-group-window" role="group" aria-label="Window presets">
        <label className="layout-picker">
          Window
          <select
            value=""
            disabled={!canApplyWindowPreset}
            title={canApplyWindowPreset ? 'Apply a window/level preset' : 'Select a 2D image to enable presets'}
            onChange={(e) => {
              const preset = WINDOW_PRESETS.find((p) => p.id === e.target.value);
              if (preset && activeSlotId) applyWindowPreset(activeSlotId, preset);
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              Presets…
            </option>
            {WINDOW_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar-group toolbar-group-layout" role="group" aria-label="Layout">
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

      <div className="toolbar-group toolbar-group-export toolbar-group-end" role="group" aria-label="Export">
        <ToolButton
          icon={<IconExportPdf />}
          label="PDF"
          disabled={!activeSlotId}
          onClick={() => activeSlotId && exportActiveViewportAsPdf(activeSlotId, measurements)}
          title="Export the active viewport as a PDF report"
        />
        <ToolButton
          icon={<IconExportData />}
          label="Measurements"
          disabled={measurements.length === 0}
          onClick={() => exportMeasurementsJson(measurements)}
          title="Export measurements as JSON"
        />
      </div>

      <div className="toolbar-group toolbar-group-panels" role="group" aria-label="Panels">
        <ToolButton
          icon={<IconPanelLeft />}
          label="Series"
          active={leftPanelOpen}
          onClick={toggleLeftPanel}
          title="Toggle the series panel"
        />
        <ToolButton
          icon={<IconPanelRight />}
          label="Measure"
          active={rightPanelOpen}
          onClick={toggleRightPanel}
          title="Toggle the measurements panel"
        />
      </div>
    </div>
  );
}
