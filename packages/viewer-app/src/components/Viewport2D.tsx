import { useEffect, useRef, useState } from 'react';
import { Enums, type Types } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { ensureCornerstoneInitialized } from '../cornerstone/init';
import { getOrCreateRenderingEngine } from '../cornerstone/renderingEngine';
import { STACK_TOOL_GROUP_ID } from '../cornerstone/toolGroups';
import { registerViewportControls } from '../cornerstone/activeViewportControls';
import { useViewerStore, findSeries } from '../state/store';
import type { DicomSeries, DicomStudy } from '../types/dicom';
import CineControls from './CineControls';

interface Props {
  slotId: string;
  seriesInstanceUID: string;
  active: boolean;
  onActivate: () => void;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export default function Viewport2D({ slotId, seriesInstanceUID, active, onActivate }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const viewportId = `viewport-${slotId}`;
  const studies = useViewerStore((s) => s.studies);
  const found = findSeries(studies, seriesInstanceUID);
  const [overlay, setOverlay] = useState({ index: 0, count: 0, wc: 0, ww: 0, zoom: 100 });
  const [isCinePlaying, setCinePlaying] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let baseParallelScale: number | null = null;

    async function setup() {
      setStatus('loading');
      await ensureCornerstoneInitialized();
      if (cancelled || !elementRef.current || !found) return;

      try {
        const renderingEngine = getOrCreateRenderingEngine();
        const element = elementRef.current;
        if (!renderingEngine.getViewport(viewportId)) {
          renderingEngine.enableElement({
            viewportId,
            type: Enums.ViewportType.STACK,
            element,
            defaultOptions: { background: [0, 0, 0] },
          });
        }

        const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport;
        const imageIds = found.series.instances.map((i) => i.imageId);
        await withTimeout(viewport.setStack(imageIds, 0), 30000, 'Decoding the first image timed out');
        if (cancelled) return;
        viewport.render();

        const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(STACK_TOOL_GROUP_ID);
        if (toolGroup && !toolGroup.getViewportIds().includes(viewportId)) {
          toolGroup.addViewport(viewportId, renderingEngine.id);
        }

        const camera = viewport.getCamera();
        baseParallelScale = camera.parallelScale ?? 1;

        cleanupFns.push(registerViewportControls(slotId, { scroll: (delta) => viewport.scroll(delta) }));

        updateOverlay(viewport);
        setStatus('ready');

        function updateOverlay(vp: Types.IStackViewport) {
          const props = vp.getProperties();
          const cam = vp.getCamera();
          const zoom = baseParallelScale ? Math.round((baseParallelScale / (cam.parallelScale ?? baseParallelScale)) * 100) : 100;
          const upper = props.voiRange?.upper ?? 0;
          const lower = props.voiRange?.lower ?? 0;
          setOverlay({
            index: vp.getCurrentImageIdIndex() + 1,
            count: imageIds.length,
            wc: Math.round((upper + lower) / 2),
            ww: Math.round(upper - lower),
            zoom,
          });
        }

        const onImageChanged = () => updateOverlay(viewport);
        element.addEventListener(Enums.Events.STACK_NEW_IMAGE, onImageChanged);
        element.addEventListener(Enums.Events.VOI_MODIFIED, onImageChanged);
        element.addEventListener(Enums.Events.CAMERA_MODIFIED, onImageChanged);

        cleanupFns.push(() => {
          element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, onImageChanged);
          element.removeEventListener(Enums.Events.VOI_MODIFIED, onImageChanged);
          element.removeEventListener(Enums.Events.CAMERA_MODIFIED, onImageChanged);
        });
      } catch (err) {
        console.error('Failed to set up stack viewport', err);
        if (!cancelled) setStatus('error');
      }
    }

    const cleanupFns: (() => void)[] = [];
    setup();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      const renderingEngine = getOrCreateRenderingEngine();
      if (renderingEngine.getViewport(viewportId)) {
        renderingEngine.disableElement(viewportId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesInstanceUID, viewportId]);

  if (!found) {
    return <div className="viewport-pane" onClick={onActivate} />;
  }

  return (
    <div className={`viewport-pane ${active ? 'active' : ''}`} onClick={onActivate}>
      <div ref={elementRef} className="viewport-canvas-host" />
      <ViewportOverlay study={found.study} series={found.series} overlay={overlay} />
      {status === 'loading' && <div className="viewport-status">Loading image…</div>}
      {status === 'error' && <div className="viewport-status error">Could not decode this image</div>}
      {found.series.isMultiframeCine && (
        <CineControls
          slotId={slotId}
          viewportId={viewportId}
          numberOfFrames={overlay.count}
          isPlaying={isCinePlaying}
          onPlayingChange={setCinePlaying}
        />
      )}
    </div>
  );
}

function ViewportOverlay({
  study,
  series,
  overlay,
}: {
  study: DicomStudy;
  series: DicomSeries;
  overlay: { index: number; count: number; wc: number; ww: number; zoom: number };
}) {
  return (
    <div className="viewport-overlay">
      <div className="overlay-corner top-left">
        <div>{study.patientName}</div>
        <div>{study.patientId}</div>
        <div>
          {series.modality} · {series.seriesDescription}
        </div>
      </div>
      <div className="overlay-corner top-right">
        <div>{study.studyDate}</div>
        <div>Ser {series.seriesNumber}</div>
        <div>
          Img {overlay.index}/{overlay.count}
        </div>
      </div>
      <div className="overlay-corner bottom-left">
        <div>
          WL {overlay.wc} / {overlay.ww}
        </div>
        <div>Zoom {overlay.zoom}%</div>
      </div>
    </div>
  );
}
