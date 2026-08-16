import { useEffect, useRef, useState } from 'react';
import { Enums, setVolumesForViewports, type Types } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { ensureCornerstoneInitialized } from '../cornerstone/init';
import { getOrCreateRenderingEngine } from '../cornerstone/renderingEngine';
import { getOrCreateVolumeForSeries, volumeIdForSeries } from '../cornerstone/volumes';
import { MPR_TOOL_GROUP_ID } from '../cornerstone/toolGroups';
import { useViewerStore, findSeries } from '../state/store';
import type { ViewportKind } from '../state/store';

interface Props {
  slotId: string;
  seriesInstanceUID: string;
  kind: Extract<ViewportKind, 'mpr-axial' | 'mpr-sagittal' | 'mpr-coronal'>;
  active: boolean;
  onActivate: () => void;
}

const ORIENTATION_BY_KIND: Record<Props['kind'], Enums.OrientationAxis> = {
  'mpr-axial': Enums.OrientationAxis.AXIAL,
  'mpr-sagittal': Enums.OrientationAxis.SAGITTAL,
  'mpr-coronal': Enums.OrientationAxis.CORONAL,
};

const LABEL_BY_KIND: Record<Props['kind'], string> = {
  'mpr-axial': 'AXIAL',
  'mpr-sagittal': 'SAGITTAL',
  'mpr-coronal': 'CORONAL',
};

export default function ViewportMPR({ slotId, seriesInstanceUID, kind, active, onActivate }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const viewportId = `viewport-${slotId}`;
  const studies = useViewerStore((s) => s.studies);
  const found = findSeries(studies, seriesInstanceUID);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sliceInfo, setSliceInfo] = useState({ index: 0, count: 0 });

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
            type: Enums.ViewportType.ORTHOGRAPHIC,
            element,
            defaultOptions: { orientation: ORIENTATION_BY_KIND[kind], background: [0, 0, 0] },
          });
        }

        const volume = await getOrCreateVolumeForSeries(found.series);
        if (cancelled) return;

        const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(MPR_TOOL_GROUP_ID);
        if (toolGroup && !toolGroup.getViewportIds().includes(viewportId)) {
          toolGroup.addViewport(viewportId, renderingEngine.id);
        }

        await setVolumesForViewports(renderingEngine, [{ volumeId: volumeIdForSeries(found.series.seriesInstanceUID) }], [
          viewportId,
        ]);
        renderingEngine.renderViewport(viewportId);

        const viewport = renderingEngine.getViewport(viewportId) as Types.IVolumeViewport;
        const updateSlice = () => {
          setSliceInfo({
            index: viewport.getCurrentImageIdIndex() + 1,
            count: volume.numFrames ?? volume.dimensions?.[2] ?? 0,
          });
        };
        updateSlice();
        element.addEventListener(Enums.Events.VOLUME_NEW_IMAGE, updateSlice);
        element.addEventListener(Enums.Events.CAMERA_MODIFIED, updateSlice);

        setStatus('ready');

        return () => {
          element.removeEventListener(Enums.Events.VOLUME_NEW_IMAGE, updateSlice);
          element.removeEventListener(Enums.Events.CAMERA_MODIFIED, updateSlice);
        };
      } catch (err) {
        console.error('Failed to set up MPR viewport', err);
        if (!cancelled) setStatus('error');
      }
    }

    let cleanup: (() => void) | undefined;
    setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
      const renderingEngine = getOrCreateRenderingEngine();
      if (renderingEngine.getViewport(viewportId)) {
        renderingEngine.disableElement(viewportId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesInstanceUID, viewportId, kind]);

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
          <div>{LABEL_BY_KIND[kind]}</div>
          {sliceInfo.count > 0 && (
            <div>
              {sliceInfo.index}/{sliceInfo.count}
            </div>
          )}
        </div>
      </div>
      {status === 'loading' && <div className="viewport-status">Building volume…</div>}
      {status === 'error' && <div className="viewport-status error">Could not build MPR volume</div>}
    </div>
  );
}
