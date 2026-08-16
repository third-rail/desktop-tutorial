import { create } from 'zustand';
import type { DicomStudy, Measurement } from '../types/dicom';
import type { PrimaryToolName } from '../cornerstone/toolGroups';

export type ViewportKind = 'empty' | 'stack' | 'mpr-axial' | 'mpr-sagittal' | 'mpr-coronal' | 'volume3d';

export interface ViewportSlot {
  id: string;
  kind: ViewportKind;
  /** Series driving this slot's content; undefined until the user assigns one. */
  seriesInstanceUID?: string;
}

export type LayoutPreset = '1x1' | '1x2' | '2x2' | '2x3' | 'mpr3d';

const LAYOUT_SLOT_COUNTS: Record<LayoutPreset, number> = {
  '1x1': 1,
  '1x2': 2,
  '2x2': 4,
  '2x3': 6,
  mpr3d: 4,
};

function buildSlotsForLayout(layout: LayoutPreset): ViewportSlot[] {
  if (layout === 'mpr3d') {
    return [
      { id: 'slot-0', kind: 'mpr-axial' },
      { id: 'slot-1', kind: 'mpr-sagittal' },
      { id: 'slot-2', kind: 'mpr-coronal' },
      { id: 'slot-3', kind: 'volume3d' },
    ];
  }
  const count = LAYOUT_SLOT_COUNTS[layout];
  return Array.from({ length: count }, (_, i) => ({ id: `slot-${i}`, kind: 'empty' as const }));
}

interface ViewerState {
  studies: DicomStudy[];
  isLoading: boolean;
  loadError: string | null;

  layout: LayoutPreset;
  slots: ViewportSlot[];
  activeSlotId: string | null;

  primaryTool: PrimaryToolName;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  measurements: Measurement[];

  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  addStudies: (studies: DicomStudy[]) => void;

  setLayout: (layout: LayoutPreset) => void;
  assignSeriesToActiveSlot: (seriesInstanceUID: string) => void;
  assignSeriesToSlot: (slotId: string, seriesInstanceUID: string, kind?: ViewportKind) => void;
  assignSeriesToAllSlots: (seriesInstanceUID: string) => void;
  setActiveSlot: (slotId: string) => void;

  setPrimaryTool: (tool: PrimaryToolName) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  setMeasurements: (measurements: Measurement[]) => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  studies: [],
  isLoading: false,
  loadError: null,

  layout: '2x2',
  slots: buildSlotsForLayout('2x2'),
  activeSlotId: 'slot-0',

  primaryTool: 'WindowLevel',
  leftPanelOpen: true,
  rightPanelOpen: true,

  measurements: [],

  setLoading: (loading) => set({ isLoading: loading }),
  setLoadError: (error) => set({ loadError: error }),
  addStudies: (studies) =>
    set((state) => {
      const merged = [...state.studies];
      for (const incoming of studies) {
        const existingIndex = merged.findIndex((s) => s.studyInstanceUID === incoming.studyInstanceUID);
        if (existingIndex >= 0) {
          merged[existingIndex] = incoming;
        } else {
          merged.push(incoming);
        }
      }
      return { studies: merged };
    }),

  setLayout: (layout) => set({ layout, slots: buildSlotsForLayout(layout), activeSlotId: `slot-0` }),

  assignSeriesToActiveSlot: (seriesInstanceUID) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    get().assignSeriesToSlot(activeSlotId, seriesInstanceUID);
  },

  assignSeriesToSlot: (slotId, seriesInstanceUID, kind) =>
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.id === slotId
          ? { ...slot, seriesInstanceUID, kind: kind ?? (slot.kind === 'empty' ? 'stack' : slot.kind) }
          : slot,
      ),
    })),

  assignSeriesToAllSlots: (seriesInstanceUID) =>
    set((state) => ({
      slots: state.slots.map((slot) => ({ ...slot, seriesInstanceUID })),
    })),

  setActiveSlot: (slotId) => set({ activeSlotId: slotId }),

  setPrimaryTool: (tool) => set({ primaryTool: tool }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

  setMeasurements: (measurements) => set({ measurements }),
}));

export function findSeries(studies: DicomStudy[], seriesInstanceUID: string) {
  for (const study of studies) {
    const series = study.series.find((s) => s.seriesInstanceUID === seriesInstanceUID);
    if (series) return { study, series };
  }
  return null;
}
