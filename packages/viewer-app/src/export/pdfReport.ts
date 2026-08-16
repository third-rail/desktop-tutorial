import { jsPDF } from 'jspdf';
import { getOrCreateRenderingEngine } from '../cornerstone/renderingEngine';
import { useViewerStore, findSeries } from '../state/store';
import type { Measurement } from '../types/dicom';

/** Builds a one-page PDF report: a snapshot of the active viewport plus a table of measurements. */
export function exportActiveViewportAsPdf(activeSlotId: string, measurements: Measurement[]) {
  const { slots, studies } = useViewerStore.getState();
  const slot = slots.find((s) => s.id === activeSlotId);
  if (!slot?.seriesInstanceUID) return;

  const found = findSeries(studies, slot.seriesInstanceUID);
  if (!found) return;

  const renderingEngine = getOrCreateRenderingEngine();
  const viewport = renderingEngine.getViewport(`viewport-${activeSlotId}`);
  if (!viewport) return;

  const canvas = viewport.getCanvas();
  const imageDataUrl = canvas.toDataURL('image/png');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(16);
  doc.text('DICOM Viewer — Report', 40, y);
  y += 24;

  doc.setFontSize(10);
  const { study, series } = found;
  const headerLines = [
    `Patient: ${study.patientName}   ID: ${study.patientId}   DOB: ${study.patientBirthDate}   Sex: ${study.patientSex}`,
    `Study: ${study.studyDescription}   Date: ${study.studyDate}   Accession: ${study.accessionNumber}`,
    `Series: ${series.seriesDescription}   Modality: ${series.modality}   Series #: ${series.seriesNumber}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  for (const line of headerLines) {
    doc.text(line, 40, y);
    y += 14;
  }
  y += 10;

  const imgWidth = pageWidth - 80;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;
  doc.addImage(imageDataUrl, 'PNG', 40, y, imgWidth, imgHeight);
  y += imgHeight + 24;

  const seriesMeasurements = measurements.filter((m) => m.seriesInstanceUID === series.seriesInstanceUID);
  if (seriesMeasurements.length > 0) {
    doc.setFontSize(12);
    doc.text('Measurements', 40, y);
    y += 16;
    doc.setFontSize(10);
    for (const m of seriesMeasurements) {
      doc.text(`${m.toolName} — ${m.label}: ${m.value} ${m.unit}`, 48, y);
      y += 14;
    }
  }

  doc.save(`${study.patientId || 'report'}_${series.seriesInstanceUID.slice(-8)}.pdf`);
}
