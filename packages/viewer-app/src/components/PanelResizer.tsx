import { useCallback, useEffect, useRef } from 'react';
import { PANEL_MAX_WIDTH, PANEL_MIN_WIDTH } from '../state/store';

interface Props {
  /** Which panel this handle belongs to — determines which way a drag widens it. */
  side: 'left' | 'right';
  width: number;
  onResize: (width: number) => void;
}

const KEYBOARD_STEP = 16;

/**
 * Drag handle sitting on a side panel's inner edge. Pointer capture keeps the drag alive even when
 * the cursor outruns the handle, which matters because the viewport canvases below would otherwise
 * swallow the move events.
 */
export default function PanelResizer({ side, width, onResize }: Props) {
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const widthForClientX = useCallback(
    (clientX: number) => {
      const drag = dragStateRef.current;
      if (!drag) return width;
      const delta = clientX - drag.startX;
      return side === 'left' ? drag.startWidth + delta : drag.startWidth - delta;
    },
    [side, width],
  );

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    function onPointerMove(event: PointerEvent) {
      if (!dragStateRef.current) return;
      event.preventDefault();
      onResize(widthForClientX(event.clientX));
    }

    function onPointerUp(event: PointerEvent) {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      handle?.releasePointerCapture(event.pointerId);
      handle?.classList.remove('dragging');
      document.body.classList.remove('resizing-panel');
    }

    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
    return () => {
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
      document.body.classList.remove('resizing-panel');
    };
  }, [onResize, widthForClientX]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragStateRef.current = { startX: event.clientX, startWidth: width };
    handleRef.current?.setPointerCapture(event.pointerId);
    handleRef.current?.classList.add('dragging');
    document.body.classList.add('resizing-panel');
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    onResize(width + direction * KEYBOARD_STEP * (side === 'left' ? 1 : -1));
  }

  return (
    <div
      ref={handleRef}
      className={`panel-resizer panel-resizer-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      aria-valuenow={width}
      aria-valuemin={PANEL_MIN_WIDTH}
      aria-valuemax={PANEL_MAX_WIDTH}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onResize(260)}
    />
  );
}
