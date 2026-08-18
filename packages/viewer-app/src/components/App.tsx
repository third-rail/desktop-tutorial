import { useEffect, useMemo } from 'react';
import { useViewerStore } from '../state/store';
import { ensureCornerstoneInitialized } from '../cornerstone/init';
import { createStackToolGroup, createMprToolGroup, createVolume3dToolGroup } from '../cornerstone/toolGroups';
import { ensureMeasurementsSync } from '../cornerstone/measurementsSync';
import { installKeyboardShortcuts } from '../cornerstone/keyboardShortcuts';
import { listenForPopoutRequests } from '../platform/popoutChannel';
import { isElectron } from '../platform/platform';
import { openAndLoad, loadRawFiles } from '../loaders/openAndIngest';
import { confirmAndCloseStudies } from '../loaders/closeStudies';
import EmptyState from './EmptyState';
import Toolbar from './Toolbar';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import ViewportGrid from './ViewportGrid';
import PopoutView from './PopoutView';

export default function App() {
  const studies = useViewerStore((s) => s.studies);
  const leftPanelOpen = useViewerStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useViewerStore((s) => s.rightPanelOpen);

  const popoutSlotId = useMemo(() => new URLSearchParams(window.location.search).get('popout'), []);

  useEffect(() => {
    ensureCornerstoneInitialized().then(() => {
      createStackToolGroup();
      createMprToolGroup();
      createVolume3dToolGroup();
      ensureMeasurementsSync();
      if (!popoutSlotId) {
        listenForPopoutRequests();
        // Shortcuts key off activeSlotId, which pop-out windows never set (their viewport uses
        // a fixed slotId of 'popout') — scoping this to the main window keeps that a no-op
        // instead of a silent mismatch.
        installKeyboardShortcuts();
      }
    });
  }, [popoutSlotId]);

  useEffect(() => {
    if (popoutSlotId || !isElectron()) return;
    const bridge = window.dicomViewer!;
    bridge.onMenuOpenFiles(() => openAndLoad('files'));
    bridge.onMenuOpenFolder(() => openAndLoad('folder'));
    bridge.onMenuCloseStudy(() => confirmAndCloseStudies());
    bridge.onOpenPath((file) => loadRawFiles([file]));
    bridge.onOpenFiles((files) => loadRawFiles(files));
  }, [popoutSlotId]);

  if (popoutSlotId) {
    return <PopoutView slotId={popoutSlotId} />;
  }

  if (studies.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="app-shell">
      <Toolbar />
      <div className="app-body">
        {leftPanelOpen && <LeftPanel />}
        <ViewportGrid />
        {rightPanelOpen && <RightPanel />}
      </div>
    </div>
  );
}
