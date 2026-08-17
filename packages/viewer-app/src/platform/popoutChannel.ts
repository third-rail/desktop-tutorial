import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import { useViewerStore, findSeries } from '../state/store';
import type { DicomInstance, DicomSeries, DicomStudy } from '../types/dicom';

/**
 * Pop-out windows (Electron `BrowserWindow` or a browser `window.open()` tab) run in a separate
 * JS realm from the main window, so the in-memory zustand store and the DICOM file blob registry
 * aren't shared automatically. This channel lets a pop-out ask the main window for a slot's data
 * (series metadata + the raw file blobs) so it can build its own independent Cornerstone viewport.
 */

interface SlotDataResponse {
  type: 'slot-data';
  slotId: string;
  kind: string;
  study: DicomStudy;
  series: DicomSeries;
  blobs: Blob[];
}

interface SlotDataRequest {
  type: 'request-slot';
  slotId: string;
}

interface StudiesClosedMessage {
  type: 'studies-closed';
}

function getChannel() {
  return new BroadcastChannel('dicom-viewer-popout');
}

/** Called once from the main window so it can answer pop-out windows' requests for slot data. */
export function listenForPopoutRequests() {
  const channel = getChannel();
  channel.onmessage = (event: MessageEvent<SlotDataRequest>) => {
    if (event.data?.type !== 'request-slot') return;
    const { studies, slots } = useViewerStore.getState();
    const slot = slots.find((s) => s.id === event.data.slotId);
    if (!slot?.seriesInstanceUID) return;
    const found = findSeries(studies, slot.seriesInstanceUID);
    if (!found) return;

    const blobs = found.series.instances.map((instance) => {
      const index = Number(instance.imageId.split(':')[1]);
      return cornerstoneDICOMImageLoader.wadouri.fileManager.get(index) as Blob;
    });

    const response: SlotDataResponse = {
      type: 'slot-data',
      slotId: slot.id,
      kind: slot.kind,
      study: found.study,
      series: found.series,
      blobs,
    };
    channel.postMessage(response);
  };
}

/** Called from a pop-out window to fetch the slot it should render. Resolves with fresh local imageIds. */
export function requestSlotData(
  slotId: string,
  timeoutMs = 5000,
): Promise<{ kind: string; study: DicomStudy; series: DicomSeries }> {
  return new Promise((resolve, reject) => {
    const channel = getChannel();
    const timer = setTimeout(() => {
      channel.close();
      reject(new Error('Timed out waiting for viewport data from the main window.'));
    }, timeoutMs);

    channel.onmessage = (event: MessageEvent<SlotDataResponse>) => {
      if (event.data?.type !== 'slot-data' || event.data.slotId !== slotId) return;
      clearTimeout(timer);

      const instances: DicomInstance[] = event.data.series.instances.map((instance, i) => ({
        ...instance,
        imageId: cornerstoneDICOMImageLoader.wadouri.fileManager.add(event.data.blobs[i]),
      }));

      resolve({
        kind: event.data.kind,
        study: event.data.study,
        series: { ...event.data.series, instances },
      });
      channel.close();
    };

    const request: SlotDataRequest = { type: 'request-slot', slotId };
    channel.postMessage(request);
  });
}

/**
 * Called from the main window when the loaded study is closed. Pop-out windows hold their own
 * independent copy of the data (fetched once via requestSlotData) and aren't otherwise told the
 * main window moved on, so without this a pop-out would keep showing a now-closed study
 * indefinitely with no indication anything changed.
 */
export function notifyStudiesClosed() {
  const channel = getChannel();
  const message: StudiesClosedMessage = { type: 'studies-closed' };
  channel.postMessage(message);
  channel.close();
}

/** Called from a pop-out window to react when the main window closes the study. */
export function listenForStudiesClosed(callback: () => void): () => void {
  const channel = getChannel();
  channel.onmessage = (event: MessageEvent<StudiesClosedMessage>) => {
    if (event.data?.type === 'studies-closed') callback();
  };
  return () => channel.close();
}
