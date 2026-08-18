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

/** Tool group for the 3D volume-render viewport: orbit camera + zoom + volume clipping (the slicer). */
export function createVolume3dToolGroup() {
  const toolGroup = getOrCreateToolGroup(VOLUME3D_TOOL_GROUP_ID);
  addToolOnce(toolGroup, 'TrackballRotate');
  addToolOnce(toolGroup, 'Zoom');
  toolGroup.setToolActive('TrackballRotate', {
    bindings: [{ mouseButton: MouseBindings.Primary }],
  });
  toolGroup.setToolActive('Zoom', {
    bindings: [{ mouseButton: MouseBindings.Secondary }, { mouseButton: MouseBindings.Wheel }],
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
    // Pan and Zoom keep working on their fixed secondary/auxiliary buttons no matter which tool
    // is primary -- setToolPassive() only strips their *primary*-button binding (Cornerstone3D's
    // default "passive" behavior removes just the primary binding, and leaves a tool Active on
    // whatever bindings remain), so excluding them here is just avoiding a no-op call, not
    // actually required for correctness.
    //
    // WindowLevel must NOT be excluded, though: unlike Pan/Zoom it has no binding of its own
    // beyond primary, so if it's left active here (as it used to be) it stays permanently bound
    // to the primary button -- and because it's the first tool ever activated (at tool-group
    // creation), Cornerstone3D's mouse dispatcher picks it as *the* tool for every primary-button
    // click/drag no matter what's selected. That silently broke every other primary tool
    // (Length, Angle, ROI tools, Zoom via primary, ...) -- clicks and drags always ended up
    // adjusting window/level instead of doing what the selected tool does.
    if (name === 'Pan' || name === 'Zoom') continue;
    toolGroup.setToolPassive(name);
  }

  toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: MouseBindings.Primary }] });
}
