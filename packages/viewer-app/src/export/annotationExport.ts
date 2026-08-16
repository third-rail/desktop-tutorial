import type { Measurement } from '../types/dicom';

/**
 * Exports measurements as a structured JSON sidecar (DICOM-SR-inspired field names: tool, value,
 * unit, referenced series). This is not a DICOM SR IOD — it's a portable, human- and
 * machine-readable report intended for local recordkeeping or import into other tooling.
 */
export function exportMeasurementsJson(measurements: Measurement[]) {
  const payload = {
    generatedAt: new Date().toISOString(),
    measurements: measurements.map((m) => ({
      tool: m.toolName,
      label: m.label,
      value: m.value,
      unit: m.unit,
      referencedSeriesInstanceUID: m.seriesInstanceUID,
      annotationUID: m.annotationUID,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `measurements_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
