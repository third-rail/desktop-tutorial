import { create } from 'zustand';
import type { DicomStudy, Measurement } from '../types/dicom';
import type { PrimaryToolName } from '../cornerstone/toolGroups';

export const PANEL_MIN_WIDTH = 180;
export const PANEL_MAX_WIDTH = 640;
const PANEL_DEFAULT_WIDTH = 260;

const PANEL_WIDTH_STORAGE_KEY = 'dicom-viewer:panel-widths';

export function clampPanelWidth(width: number): number {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, Math.round(width)));
}

function loadStoredPanelWidths(): { left: number; right: number } {
  const fallback = { left: PANEL_DEFAULT_WIDTH, right: PANEL_DEFAULT_WIDTH };
  try {
    const raw = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { left?: unknown; right?: unknown };
    return {
      left: typeof parsed.left === 'number' ? clampPanelWidth(parsed.left) : fallback.left,
      right: typeof parsed.right === 'number' ? clampPanelWidth(parsed.right) : fallback.right,
    };
  } catch {
    // Corrupt or unavailable storage (e.g. privacy mode) — panel widths aren't worth failing over.
    return fallback;
  }
}

function persistPanelWidths(left: number, right: number) {
  try {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, JSON.stringify({ left, right }));
  } catch {
    // Ignore: losing a persisted width is harmless.
  }
}

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
  leftPanelWidth: number;
  rightPanelWidth: number;

  measurements: Measurement[];

  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  addStudies: (studies: DicomStudy[]) => void;
  /** Clears loaded data and viewport assignments. Prefer closeAllStudies(), which also frees caches. */
  resetStudies: () => void;

  setLayout: (layout: LayoutPreset) => void;
  assignSeriesToActiveSlot: (seriesInstanceUID: string) => void;
  assignSeriesToSlot: (slotId: string, seriesInstanceUID: string, kind?: ViewportKind) => void;
  assignSeriesToAllSlots: (seriesInstanceUID: string) => void;
  setActiveSlot: (slotId: string) => void;

  setPrimaryTool: (tool: PrimaryToolName) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

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
  leftPanelWidth: loadStoredPanelWidths().left,
  rightPanelWidth: loadStoredPanelWidths().right,

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

  resetStudies: () =>
    set((state) => ({
      studies: [],
      loadError: null,
      isLoading: false,
      measurements: [],
      slots: buildSlotsForLayout(state.layout),
      activeSlotId: 'slot-0',
    })),

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

  setLeftPanelWidth: (width) =>
    set((s) => {
      const leftPanelWidth = clampPanelWidth(width);
      persistPanelWidths(leftPanelWidth, s.rightPanelWidth);
      return { leftPanelWidth };
    }),

  setRightPanelWidth: (width) =>
    set((s) => {
      const rightPanelWidth = clampPanelWidth(width);
      persistPanelWidths(s.leftPanelWidth, rightPanelWidth);
      return { rightPanelWidth };
    }),

  setMeasurements: (measurements) => set({ measurements }),
}));

export function findSeries(studies: DicomStudy[], seriesInstanceUID: string) {
  for (const study of studies) {
    const series = study.series.find((s) => s.seriesInstanceUID === seriesInstanceUID);
    if (series) return { study, series };
  }
  return null;
}
