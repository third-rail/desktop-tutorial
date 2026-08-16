import { eventTarget } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import type { Annotation } from '@cornerstonejs/tools/types';
import { useViewerStore } from '../state/store';
import type { Measurement } from '../types/dicom';

let listening = false;

// Only these tools produce user-created measurements; Crosshairs (and similar navigation aids)
// create their own internal annotations to track state, which shouldn't clutter the panel.
const MEASUREMENT_TOOL_NAMES = new Set([
  'Length',
  'Angle',
  'CobbAngle',
  'RectangleROI',
  'EllipticalROI',
  'ArrowAnnotate',
]);

function describeAnnotation(annotation: Annotation): { label: string; value: string; unit: string } {
  const toolName = annotation.metadata?.toolName ?? 'Annotation';
  const statsByTarget = annotation.data?.cachedStats as Record<string, Record<string, unknown>> | undefined;
  const firstStats = statsByTarget ? Object.values(statsByTarget)[0] : undefined;

  if (firstStats) {
    if (typeof firstStats.length === 'number') {
      return { label: 'Length', value: firstStats.length.toFixed(2), unit: String(firstStats.unit ?? 'mm') };
    }
    if (typeof firstStats.area === 'number') {
      return { label: 'Area', value: firstStats.area.toFixed(2), unit: String(firstStats.areaUnit ?? 'mm²') };
    }
  }

  const data = annotation.data as Record<string, unknown> | undefined;
  if (typeof data?.text === 'string') {
    return { label: 'Note', value: data.text, unit: '' };
  }
  if (toolName === 'Angle' || toolName === 'CobbAngle') {
    return { label: 'Angle', value: '—', unit: 'deg' };
  }

  return { label: toolName, value: '—', unit: '' };
}

function toMeasurement(annotation: Annotation): Measurement | null {
  if (!annotation.annotationUID) return null;
  if (!MEASUREMENT_TOOL_NAMES.has(annotation.metadata?.toolName ?? '')) return null;
  const { label, value, unit } = describeAnnotation(annotation);
  return {
    annotationUID: annotation.annotationUID,
    toolName: annotation.metadata?.toolName ?? 'Annotation',
    seriesInstanceUID: (annotation.metadata as { seriesInstanceUID?: string })?.seriesInstanceUID ?? '',
    label,
    value,
    unit,
  };
}

function refreshMeasurements() {
  const all = cornerstoneTools.annotation.state.getAllAnnotations();
  const measurements = all.map(toMeasurement).filter((m): m is Measurement => m !== null);
  useViewerStore.getState().setMeasurements(measurements);
}

/** Keeps the app's measurements panel in sync with Cornerstone3D's global annotation state. */
export function ensureMeasurementsSync() {
  if (listening) return;
  listening = true;
  const { Events } = cornerstoneTools.Enums;
  for (const evt of [Events.ANNOTATION_ADDED, Events.ANNOTATION_MODIFIED, Events.ANNOTATION_REMOVED]) {
    eventTarget.addEventListener(evt, refreshMeasurements);
  }
}
