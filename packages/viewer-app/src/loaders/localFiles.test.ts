import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { expandZips, formatPersonName, isDicomP10, isVolumeCandidate, type RawFile } from './localFiles';

describe('isDicomP10', () => {
  it('recognizes a valid 128-byte preamble + DICM magic', () => {
    const data = new Uint8Array(132);
    data.set([0x44, 0x49, 0x43, 0x4d], 128); // "DICM"
    expect(isDicomP10(data)).toBe(true);
  });

  it('rejects files shorter than the preamble + magic', () => {
    expect(isDicomP10(new Uint8Array(100))).toBe(false);
  });

  it('rejects files with the right length but wrong magic bytes', () => {
    const data = new Uint8Array(132);
    data.set([0x00, 0x00, 0x00, 0x00], 128);
    expect(isDicomP10(data)).toBe(false);
  });

  it('rejects a plain text file', () => {
    const data = new TextEncoder().encode('This is a README, not a DICOM file. Padding to be long enough...');
    expect(isDicomP10(data)).toBe(false);
  });
});

describe('isVolumeCandidate', () => {
  it('accepts CT/MR/PT/NM series with 4+ slices and no cine frames', () => {
    expect(isVolumeCandidate('CT', 4, false)).toBe(true);
    expect(isVolumeCandidate('MR', 128, false)).toBe(true);
  });

  it('rejects series with fewer than 4 instances', () => {
    expect(isVolumeCandidate('CT', 3, false)).toBe(false);
  });

  it('rejects multiframe cine series even if modality/count match', () => {
    expect(isVolumeCandidate('CT', 10, true)).toBe(false);
  });

  it('rejects non-volumetric modalities like CR/US', () => {
    expect(isVolumeCandidate('CR', 10, false)).toBe(false);
    expect(isVolumeCandidate('US', 10, false)).toBe(false);
  });
});

describe('formatPersonName', () => {
  it('converts DICOM caret-delimited PN format to a readable name', () => {
    expect(formatPersonName('Doe^John^A')).toBe('Doe John A');
  });

  it('handles trailing empty components', () => {
    expect(formatPersonName('Doe^John^^^')).toBe('Doe John');
  });

  it('falls back to "(unknown)" for missing names', () => {
    expect(formatPersonName(undefined)).toBe('(unknown)');
    expect(formatPersonName('')).toBe('(unknown)');
  });
});

describe('expandZips', () => {
  it('passes non-zip files through unchanged', async () => {
    const files: RawFile[] = [{ name: 'scan.dcm', data: new Uint8Array([1, 2, 3]) }];
    const result = await expandZips(files);
    expect(result).toEqual(files);
  });

  it('expands a zip into its member files and drops directory entries', async () => {
    const zip = new JSZip();
    zip.file('series1/image1.dcm', new Uint8Array([9, 9, 9]));
    zip.file('series1/image2.dcm', new Uint8Array([8, 8, 8]));
    zip.folder('series1/empty-subdir');
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });

    const result = await expandZips([{ name: 'study.zip', data: zipBytes }]);

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.name).sort()).toEqual(['series1/image1.dcm', 'series1/image2.dcm']);
  });

  it('handles a mix of zip and non-zip files', async () => {
    const zip = new JSZip();
    zip.file('a.dcm', new Uint8Array([1]));
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });

    const result = await expandZips([
      { name: 'study.zip', data: zipBytes },
      { name: 'loose.dcm', data: new Uint8Array([2]) },
    ]);

    expect(result.map((f) => f.name).sort()).toEqual(['a.dcm', 'loose.dcm']);
  });
});
