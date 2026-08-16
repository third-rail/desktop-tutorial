import * as cornerstoneTools from '@cornerstonejs/tools';

const { ToolGroupManager, Enums: csToolsEnums } = cornerstoneTools;
const { MouseBindings } = csToolsEnums;

export const STACK_TOOL_GROUP_ID = 'stackToolGroup';
export const MPR_TOOL_GROUP_ID = 'mprToolGroup';
export const VOLUME3D_TOOL_GROUP_ID = 'volume3dToolGroup';

/** Tools a user can pick from the toolbar and bind to the left mouse button. */
export const ANNOTATION_TOOL_NAMES = [
  'WindowLevel',
  'Pan',
  'Zoom',
  'Length',
  'Angle',
  'RectangleROI',
  'EllipticalROI',
  'ArrowAnnotate',
  'Crosshairs',
] as const;

export type PrimaryToolName = (typeof ANNOTATION_TOOL_NAMES)[number];

function getOrCreateToolGroup(id: string) {
  return ToolGroupManager.getToolGroup(id) ?? ToolGroupManager.createToolGroup(id)!;
}

/** Tool group for plain 2D stack viewports (X-ray, CR/DX, single-frame CT/MR slices, US). */
export function createStackToolGroup() {
  const toolGroup = getOrCreateToolGroup(STACK_TOOL_GROUP_ID);
  registerBaseTools(toolGroup);
  addToolOnce(toolGroup, 'Length');
  addToolOnce(toolGroup, 'Angle');
  addToolOnce(toolGroup, 'RectangleROI');
  addToolOnce(toolGroup, 'EllipticalROI');
  addToolOnce(toolGroup, 'ArrowAnnotate');
  applyDefaultBindings(toolGroup);
  return toolGroup;
}

/** Tool group for the linked axial/sagittal/coronal MPR panes, including crosshair navigation. */
export function createMprToolGroup() {
  const toolGroup = getOrCreateToolGroup(MPR_TOOL_GROUP_ID);
  registerBaseTools(toolGroup);
  addToolOnce(toolGroup, 'Length');
  addToolOnce(toolGroup, 'Angle');
  addToolOnce(toolGroup, 'RectangleROI');
  addToolOnce(toolGroup, 'EllipticalROI');
  addToolOnce(toolGroup, 'Crosshairs', { getReferenceLineColor: () => 'rgb(0, 214, 143)' });
  applyDefaultBindings(toolGroup);
  return toolGroup;
}

/** Tool group for the 3D volume-render viewport: orbit camera + volume clipping (the slicer). */
export function createVolume3dToolGroup() {
  const toolGroup = getOrCreateToolGroup(VOLUME3D_TOOL_GROUP_ID);
  addToolOnce(toolGroup, 'TrackballRotate');
  toolGroup.setToolActive('TrackballRotate', {
    bindings: [{ mouseButton: MouseBindings.Primary }],
  });
  return toolGroup;
}

function addToolOnce(toolGroup: ReturnType<typeof getOrCreateToolGroup>, name: string, configuration?: Record<string, unknown>) {
  if (!toolGroup.hasTool(name)) {
    toolGroup.addTool(name, configuration);
  }
}

function registerBaseTools(toolGroup: ReturnType<typeof getOrCreateToolGroup>) {
  addToolOnce(toolGroup, 'Pan');
  addToolOnce(toolGroup, 'Zoom');
  addToolOnce(toolGroup, 'WindowLevel');
  addToolOnce(toolGroup, 'StackScroll');
}

function applyDefaultBindings(toolGroup: ReturnType<typeof getOrCreateToolGroup>) {
  toolGroup.setToolActive('WindowLevel', { bindings: [{ mouseButton: MouseBindings.Primary }] });
  toolGroup.setToolActive('Pan', { bindings: [{ mouseButton: MouseBindings.Auxiliary }] });
  toolGroup.setToolActive('Zoom', { bindings: [{ mouseButton: MouseBindings.Secondary }] });
  toolGroup.setToolActive('StackScroll', { bindings: [{ mouseButton: MouseBindings.Wheel }] });
}

/** Switches which tool is bound to the left (primary) mouse button — the toolbar's "active tool". */
export function setPrimaryTool(toolGroupId: string, toolName: PrimaryToolName) {
  const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
  if (!toolGroup) return;

  for (const name of ANNOTATION_TOOL_NAMES) {
    if (!toolGroup.hasTool(name)) continue;
    if (name === toolName) continue;
    // Leave Pan/Zoom/WindowLevel/StackScroll bound to their fixed secondary buttons; only
    // demote other annotation/primary-bindable tools that were previously primary.
    if (name === 'Pan' || name === 'Zoom' || name === 'WindowLevel') continue;
    toolGroup.setToolPassive(name);
  }

  if (toolName === 'Pan' || toolName === 'Zoom' || toolName === 'WindowLevel') {
    // These three stay on their dedicated mouse buttons at all times; selecting them from the
    // toolbar simply also promotes them to the primary button for single-button/touch users.
    toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
    return;
  }

  toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
}
