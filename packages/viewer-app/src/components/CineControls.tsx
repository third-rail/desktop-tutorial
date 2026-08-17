import { getEnabledElementByViewportId } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { useEffect, useState } from 'react';
import { registerViewportControls } from '../cornerstone/activeViewportControls';

interface Props {
  slotId: string;
  viewportId: string;
  numberOfFrames: number;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}

export default function CineControls({ slotId, viewportId, isPlaying, onPlayingChange }: Props) {
  const [fps, setFps] = useState(15);

  function togglePlay() {
    const enabled = getEnabledElementByViewportId(viewportId);
    if (!enabled) return;
    const element = enabled.viewport.element;
    if (isPlaying) {
      cornerstoneTools.utilities.cine.stopClip(element);
    } else {
      cornerstoneTools.utilities.cine.playClip(element, { framesPerSecond: fps, loop: true });
    }
    onPlayingChange(!isPlaying);
  }

  // Exposes the Space-bar shortcut a way to reach this specific pane's play/pause without every
  // caller needing viewportId/fps/isPlaying — re-registers whenever those change so the shortcut
  // always toggles from the current state rather than a stale closure.
  useEffect(() => {
    return registerViewportControls(slotId, { toggleCine: togglePlay });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId, viewportId, isPlaying, fps]);

  return (
    <div className="cine-controls" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pause cine' : 'Play cine'}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <label>
        FPS
        <input
          type="number"
          min={1}
          max={60}
          value={fps}
          onChange={(e) => setFps(Number(e.target.value) || 1)}
        />
      </label>
    </div>
  );
}
