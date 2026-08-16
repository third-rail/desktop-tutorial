export interface DicomInstance {
  imageId: string;
  sopInstanceUID: string;
  instanceNumber: number;
  numberOfFrames: number;
  rows?: number;
  columns?: number;
}

export interface DicomSeries {
  seriesInstanceUID: string;
  seriesNumber: string;
  seriesDescription: string;
  modality: string;
  instances: DicomInstance[];
  /** True when the series has enough same-geometry slices to build a 3D volume (CT/MR). */
  isVolumeCandidate: boolean;
  /** True when any instance in the series has more than one frame (US cine, XA). */
  isMultiframeCine: boolean;
  thumbnailUrl?: string;
}

export interface DicomStudy {
  studyInstanceUID: string;
  studyDate: string;
  studyDescription: string;
  accessionNumber: string;
  patientName: string;
  patientId: string;
  patientBirthDate: string;
  patientSex: string;
  series: DicomSeries[];
}

export interface Measurement {
  annotationUID: string;
  toolName: string;
  seriesInstanceUID: string;
  label: string;
  value: string;
  unit: string;
}
