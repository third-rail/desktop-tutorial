import * as dicomParser from 'dicom-parser';
import JSZip from 'jszip';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import type { DicomInstance, DicomSeries, DicomStudy } from '../types/dicom';

const TAG = {
  studyInstanceUID: 'x0020000d',
  seriesInstanceUID: 'x0020000e',
  sopInstanceUID: 'x00080018',
  modality: 'x00080060',
  instanceNumber: 'x00200013',
  seriesNumber: 'x00200011',
  seriesDescription: 'x0008103e',
  studyDescription: 'x00081030',
  studyDate: 'x00080020',
  accessionNumber: 'x00080050',
  patientName: 'x00100010',
  patientId: 'x00100020',
  patientBirthDate: 'x00100030',
  patientSex: 'x00100040',
  numberOfFrames: 'x00280008',
  rows: 'x00280010',
  columns: 'x00280011',
  pixelData: 'x7fe00010',
} as const;

export interface RawFile {
  name: string;
  data: Uint8Array;
}

/** True when the buffer looks like a DICOM Part 10 file (128-byte preamble + "DICM" magic). */
export function isDicomP10(data: Uint8Array): boolean {
  if (data.length < 132) return false;
  return (
    data[128] === 0x44 && // D
    data[129] === 0x49 && // I
    data[130] === 0x43 && // C
    data[131] === 0x4d // M
  );
}

/** Whether a series with these characteristics should be offered as a 3D volume candidate. */
export function isVolumeCandidate(modality: string, instanceCount: number, isMultiframeCine: boolean): boolean {
  const volumeModalities = ['CT', 'MR', 'PT', 'NM'];
  return volumeModalities.includes(modality) && instanceCount >= 4 && !isMultiframeCine;
}

export async function expandZips(files: RawFile[]): Promise<RawFile[]> {
  const out: RawFile[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      out.push(file);
      continue;
    }
    const zip = await JSZip.loadAsync(file.data);
    for (const [entryName, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const data = await entry.async('uint8array');
      out.push({ name: entryName, data });
    }
  }
  return out;
}

/**
 * Ingests raw local files (dropped, opened, or unzipped) into a patient/study/series tree.
 * Non-DICOM files (README, DICOMDIR directory records, etc.) are skipped; DICOMDIR itself is not
 * parsed as a directory tree — its referenced instance files are found directly by content-sniffing
 * every file instead, which is sufficient for the flat/one-level exports imaging centers hand out.
 */
export async function ingestLocalFiles(rawFiles: RawFile[]): Promise<DicomStudy[]> {
  const expanded = await expandZips(rawFiles);
  const studiesByUid = new Map<string, DicomStudy>();
  const seriesByUid = new Map<string, DicomSeries>();

  for (const file of expanded) {
    if (!isDicomP10(file.data)) continue;

    let dataSet: dicomParser.DataSet;
    try {
      dataSet = dicomParser.parseDicom(file.data);
    } catch {
      continue; // not a parseable DICOM instance; skip silently
    }

    const studyInstanceUID = dataSet.string(TAG.studyInstanceUID);
    const seriesInstanceUID = dataSet.string(TAG.seriesInstanceUID);
    const sopInstanceUID = dataSet.string(TAG.sopInstanceUID);
    if (!studyInstanceUID || !seriesInstanceUID || !sopInstanceUID) continue;
    // Skip non-image SOP instances (presentation states, SR, raw data, DICOMDIR, ...) that
    // parse fine but carry no pixel data and would otherwise break stack/volume construction.
    if (!dataSet.elements[TAG.pixelData]) continue;

    const blob = new Blob([file.data as unknown as BlobPart], { type: 'application/dicom' });
    const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(blob);

    const instance: DicomInstance = {
      imageId,
      sopInstanceUID,
      instanceNumber: parseInt(dataSet.string(TAG.instanceNumber) ?? '0', 10) || 0,
      numberOfFrames: parseInt(dataSet.string(TAG.numberOfFrames) ?? '1', 10) || 1,
      rows: dataSet.uint16(TAG.rows),
      columns: dataSet.uint16(TAG.columns),
    };

    let study = studiesByUid.get(studyInstanceUID);
    if (!study) {
      study = {
        studyInstanceUID,
        studyDate: dataSet.string(TAG.studyDate) ?? '',
        studyDescription: dataSet.string(TAG.studyDescription) ?? '(no study description)',
        accessionNumber: dataSet.string(TAG.accessionNumber) ?? '',
        patientName: formatPersonName(dataSet.string(TAG.patientName)),
        patientId: dataSet.string(TAG.patientId) ?? '',
        patientBirthDate: dataSet.string(TAG.patientBirthDate) ?? '',
        patientSex: dataSet.string(TAG.patientSex) ?? '',
        series: [],
      };
      studiesByUid.set(studyInstanceUID, study);
    }

    let series = seriesByUid.get(seriesInstanceUID);
    if (!series) {
      series = {
        seriesInstanceUID,
        seriesNumber: dataSet.string(TAG.seriesNumber) ?? '',
        seriesDescription: dataSet.string(TAG.seriesDescription) ?? '(no series description)',
        modality: dataSet.string(TAG.modality) ?? 'OT',
        instances: [],
        isVolumeCandidate: false,
        isMultiframeCine: false,
      };
      seriesByUid.set(seriesInstanceUID, series);
      study.series.push(series);
    }

    series.instances.push(instance);
  }

  for (const series of seriesByUid.values()) {
    series.instances.sort((a, b) => a.instanceNumber - b.instanceNumber);
    series.isMultiframeCine = series.instances.some((i) => i.numberOfFrames > 1);
    series.isVolumeCandidate = isVolumeCandidate(series.modality, series.instances.length, series.isMultiframeCine);
  }

  for (const study of studiesByUid.values()) {
    study.series.sort((a, b) => (a.seriesNumber || '0').localeCompare(b.seriesNumber || '0', undefined, { numeric: true }));
  }

  return Array.from(studiesByUid.values());
}

export function formatPersonName(dicomName?: string): string {
  if (!dicomName) return '(unknown)';
  return dicomName.split('^').filter(Boolean).join(' ') || dicomName;
}
