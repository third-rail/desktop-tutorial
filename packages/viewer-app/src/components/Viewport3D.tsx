import { useEffect, useRef, useState } from 'react';
import { Enums, setVolumesForViewports, type Types } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import type { VolumeCroppingTool } from '@cornerstonejs/tools';
import { ensureCornerstoneInitialized } from '../cornerstone/init';
import { getOrCreateRenderingEngine } from '../cornerstone/renderingEngine';
import { getOrCreateVolumeForSeries, volumeIdForSeries } from '../cornerstone/volumes';
import { VOLUME3D_TOOL_GROUP_ID } from '../cornerstone/toolGroups';
import { useViewerStore, findSeries } from '../state/store';

export const VOLUME_3D_PRESETS = [
  { id: 'CT-Bone', label: 'Bone' },
  { id: 'CT-Soft-Tissue', label: 'Soft Tissue' },
  { id: 'CT-Lung', label: 'Lung' },
  { id: 'MR-Angio', label: 'Angio' },
  { id: 'CT-MIP', label: 'MIP' },
] as const;

interface Props {
  slotId: string;
  seriesInstanceUID: string;
  active: boolean;
  onActivate: () => void;
}

export default function Viewport3D({ slotId, seriesInstanceUID, active, onActivate }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const viewportId = `viewport-${slotId}`;
  const studies = useViewerStore((s) => s.studies);
  const found = findSeries(studies, seriesInstanceUID);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [preset, setPreset] = useState<string>('CT-Bone');
  const [slicerOn, setSlicerOn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!found) return;
      setStatus('loading');
      await ensureCornerstoneInitialized();
      if (cancelled || !elementRef.current) return;

      try {
        const renderingEngine = getOrCreateRenderingEngine();
        const element = elementRef.current;
        if (!renderingEngine.getViewport(viewportId)) {
          renderingEngine.enableElement({
            viewportId,
            type: Enums.ViewportType.VOLUME_3D,
            element,
            defaultOptions: { background: [0, 0, 0] },
          });
        }

        const volumeId = volumeIdForSeries(found.series.seriesInstanceUID);
        await getOrCreateVolumeForSeries(found.series);
        if (cancelled) return;

        const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(VOLUME3D_TOOL_GROUP_ID);
        if (toolGroup && !toolGroup.getViewportIds().includes(viewportId)) {
          toolGroup.addViewport(viewportId, renderingEngine.id);
        }

        await setVolumesForViewports(renderingEngine, [{ volumeId }], [viewportId]);
        const viewport = renderingEngine.getViewport(viewportId) as Types.IVolumeViewport;
        viewport.setProperties({ preset });
        renderingEngine.renderViewport(viewportId);

        setStatus('ready');
      } catch (err) {
        console.error('Failed to set up 3D volume viewport', err);
        if (!cancelled) setStatus('error');
      }
    }

    setup();

    return () => {
      cancelled = true;
      const renderingEngine = getOrCreateRenderingEngine();
      if (renderingEngine.getViewport(viewportId)) {
        renderingEngine.disableElement(viewportId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesInstanceUID, viewportId]);

  useEffect(() => {
    if (status !== 'ready') return;
    const renderingEngine = getOrCreateRenderingEngine();
    const viewport = renderingEngine.getViewport(viewportId) as Types.IVolumeViewport | undefined;
    viewport?.setProperties({ preset });
    renderingEngine.renderViewport(viewportId);
  }, [preset, status, viewportId]);

  useEffect(() => {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(VOLUME3D_TOOL_GROUP_ID);
    if (!toolGroup || status !== 'ready') return;
    if (!toolGroup.hasTool('VolumeCropping')) {
      toolGroup.addTool('VolumeCropping');
    }
    // VolumeCroppingTool.onSetToolActive() unconditionally resets its own showHandles/
    // showClippingPlanes config back to false every time it's activated -- despite those
    // defaulting to true -- so the crop handles and clip effect stay invisible unless we turn
    // them back on ourselves right after activating.
    const tool = toolGroup.getToolInstance('VolumeCropping') as VolumeCroppingTool | undefined;
    if (slicerOn) {
      // TrackballRotate is bound to the primary button by default and was activated first (at
      // tool-group creation) -- Cornerstone3D's mouse dispatcher picks the *first*-registered
      // active tool per binding as the one that handles the drag, so leaving TrackballRotate
      // active here means every drag orbits the camera instead of ever reaching
      // VolumeCropping's own handle-drag logic, no matter how precisely you grab a handle.
      toolGroup.setToolPassive('TrackballRotate');
      toolGroup.setToolActive('VolumeCropping', {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      });
      tool?.setClippingPlanesVisible(true);
      tool?.setHandlesVisible(true);
    } else {
      tool?.setClippingPlanesVisible(false);
      tool?.setHandlesVisible(false);
      toolGroup.setToolDisabled('VolumeCropping');
      toolGroup.setToolActive('TrackballRotate', {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      });
    }
    getOrCreateRenderingEngine().renderViewport(viewportId);
  }, [slicerOn, status, viewportId]);

  if (!found) {
    return <div className="viewport-pane" onClick={onActivate} />;
  }

  return (
    <div className={`viewport-pane ${active ? 'active' : ''}`} onClick={onActivate}>
      <div ref={elementRef} className="viewport-canvas-host" />
      <div className="viewport-overlay">
        <div className="overlay-corner top-left">
          <div>{found.study.patientName}</div>
          <div>
            {found.series.modality} · {found.series.seriesDescription}
          </div>
        </div>
        <div className="overlay-corner top-right">
          <div>3D VOLUME</div>
        </div>
      </div>
      <div className="viewport-3d-controls" onClick={(e) => e.stopPropagation()}>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Render preset">
          {VOLUME_3D_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={slicerOn ? 'toggle-on' : ''}
          onClick={() => setSlicerOn((v) => !v)}
        >
          Slicer
        </button>
      </div>
      {status === 'loading' && <div className="viewport-status">Building volume…</div>}
      {status === 'error' && <div className="viewport-status error">Could not render volume</div>}
    </div>
  );
}
