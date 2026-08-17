import { describe, expect, it } from 'vitest';
import type { Annotation } from '@cornerstonejs/tools/types';
import { describeAnnotation, toMeasurement } from './measurementsSync';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    annotationUID: 'uid-1',
    highlighted: false,
    invalidated: false,
    isLocked: false,
    isVisible: true,
    metadata: { toolName: 'Length', seriesInstanceUID: 'series-1' } as Annotation['metadata'],
    data: {},
    ...overrides,
  } as Annotation;
}

describe('describeAnnotation', () => {
  it('reports length measurements from cachedStats', () => {
    const annotation = makeAnnotation({
      data: { cachedStats: { target1: { length: 12.345, unit: 'mm' } } } as Annotation['data'],
    });
    expect(describeAnnotation(annotation)).toEqual({ label: 'Length', value: '12.35', unit: 'mm' });
  });

  it('reports area measurements from cachedStats', () => {
    const annotation = makeAnnotation({
      metadata: { toolName: 'EllipticalROI' } as Annotation['metadata'],
      data: { cachedStats: { target1: { area: 5, areaUnit: 'mm²' } } } as Annotation['data'],
    });
    expect(describeAnnotation(annotation)).toEqual({ label: 'Area', value: '5.00', unit: 'mm²' });
  });

  it('reports free-text notes for arrow annotations', () => {
    const annotation = makeAnnotation({
      metadata: { toolName: 'ArrowAnnotate' } as Annotation['metadata'],
      data: { text: 'Suspicious nodule' } as Annotation['data'],
    });
    expect(describeAnnotation(annotation)).toEqual({ label: 'Note', value: 'Suspicious nodule', unit: '' });
  });

  it('falls back to a placeholder for angle tools with no stats yet', () => {
    const annotation = makeAnnotation({ metadata: { toolName: 'Angle' } as Annotation['metadata'] });
    expect(describeAnnotation(annotation)).toEqual({ label: 'Angle', value: '—', unit: 'deg' });
  });
});

describe('toMeasurement', () => {
  it('converts a Length annotation into a Measurement', () => {
    const annotation = makeAnnotation({
      data: { cachedStats: { t: { length: 10, unit: 'mm' } } } as Annotation['data'],
    });
    expect(toMeasurement(annotation)).toEqual({
      annotationUID: 'uid-1',
      toolName: 'Length',
      seriesInstanceUID: 'series-1',
      label: 'Length',
      value: '10.00',
      unit: 'mm',
    });
  });

  it('filters out Crosshairs annotations, which are navigation state, not measurements', () => {
    const annotation = makeAnnotation({ metadata: { toolName: 'Crosshairs' } as Annotation['metadata'] });
    expect(toMeasurement(annotation)).toBeNull();
  });

  it('filters out annotations with no annotationUID', () => {
    const annotation = makeAnnotation({ annotationUID: undefined });
    expect(toMeasurement(annotation)).toBeNull();
  });

  it('filters out unknown/future tool names not in the measurement allowlist', () => {
    const annotation = makeAnnotation({ metadata: { toolName: 'SomeFutureTool' } as Annotation['metadata'] });
    expect(toMeasurement(annotation)).toBeNull();
  });
});
