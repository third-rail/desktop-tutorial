import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewerStore } from '../state/store';
import type { DicomStudy, Measurement } from '../types/dicom';
import { confirmAndCloseStudies } from './closeStudies';

function fakeStudy(): DicomStudy {
  return {
    studyInstanceUID: 'study-1',
    studyDate: '',
    studyDescription: '',
    accessionNumber: '',
    patientName: '',
    patientId: '',
    patientBirthDate: '',
    patientSex: '',
    series: [],
  };
}

function fakeMeasurement(id: string): Measurement {
  return { annotationUID: id, toolName: 'Length', seriesInstanceUID: '', label: 'Length', value: '1.00', unit: 'mm' };
}

describe('confirmAndCloseStudies', () => {
  beforeEach(() => {
    useViewerStore.getState().resetStudies();
    useViewerStore.setState({ studies: [], measurements: [] });
  });

  it('does nothing when no study is loaded', () => {
    const confirm = vi.fn((_message: string) => true);
    confirmAndCloseStudies(confirm);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('closes without prompting when a study is loaded but has no measurements', () => {
    useViewerStore.setState({ studies: [fakeStudy()], measurements: [] });
    const confirm = vi.fn((_message: string) => true);

    confirmAndCloseStudies(confirm);

    expect(confirm).not.toHaveBeenCalled();
    expect(useViewerStore.getState().studies).toHaveLength(0);
  });

  it('prompts before closing when there are unexported measurements, and closes on confirm', () => {
    useViewerStore.setState({ studies: [fakeStudy()], measurements: [fakeMeasurement('a'), fakeMeasurement('b')] });
    const confirm = vi.fn((_message: string) => true);

    confirmAndCloseStudies(confirm);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toContain('2 measurements');
    expect(useViewerStore.getState().studies).toHaveLength(0);
  });

  it('uses singular wording for exactly one measurement', () => {
    useViewerStore.setState({ studies: [fakeStudy()], measurements: [fakeMeasurement('a')] });
    const confirm = vi.fn((_message: string) => true);

    confirmAndCloseStudies(confirm);

    expect(confirm.mock.calls[0][0]).toContain('1 measurement ');
    expect(confirm.mock.calls[0][0]).not.toContain('measurements');
  });

  it('leaves the study loaded when the user cancels the prompt', () => {
    const study = fakeStudy();
    const measurement = fakeMeasurement('a');
    useViewerStore.setState({ studies: [study], measurements: [measurement] });
    const confirm = vi.fn((_message: string) => false);

    confirmAndCloseStudies(confirm);

    expect(useViewerStore.getState().studies).toEqual([study]);
    expect(useViewerStore.getState().measurements).toEqual([measurement]);
  });
});
