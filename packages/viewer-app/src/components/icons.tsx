/**
 * Inline SVG icons for the toolbar. Deliberately hand-rolled rather than pulled from an icon
 * package: the bundle is already large, and this is a small, fixed set drawn on one 24×24 grid
 * with a consistent 2px stroke so the row reads evenly.
 */

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function IconOpenFiles() {
  return (
    <svg {...base}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  );
}

export function IconOpenFolder() {
  return (
    <svg {...base}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function IconCloseStudy() {
  return (
    <svg {...base}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9.5 11.5l5 5M14.5 11.5l-5 5" />
    </svg>
  );
}

export function IconWindowLevel() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPan() {
  return (
    <svg {...base}>
      <path d="M12 3v18M3 12h18" />
      <path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </svg>
  );
}

export function IconZoom() {
  return (
    <svg {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5M8 11h6M11 8v6" />
    </svg>
  );
}

export function IconLength() {
  return (
    <svg {...base}>
      <path d="M4 20L20 4" />
      <path d="M3 17l4 4M17 3l4 4" />
    </svg>
  );
}

export function IconAngle() {
  return (
    <svg {...base}>
      <path d="M4 20h16L4 6z" />
      <path d="M9 20a6 6 0 0 0-1.6-4" />
    </svg>
  );
}

export function IconRectangleRoi() {
  return (
    <svg {...base}>
      <rect x="4" y="6" width="16" height="12" rx="1" strokeDasharray="3 2" />
    </svg>
  );
}

export function IconEllipseRoi() {
  return (
    <svg {...base}>
      <ellipse cx="12" cy="12" rx="8" ry="6" strokeDasharray="3 2" />
    </svg>
  );
}

export function IconArrow() {
  return (
    <svg {...base}>
      <path d="M5 19L19 5" />
      <path d="M13 5h6v6" />
    </svg>
  );
}

export function IconCrosshairs() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
    </svg>
  );
}

export function IconExportPdf() {
  return (
    <svg {...base}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 17v-4h1.5a1.5 1.5 0 0 1 0 3H9" />
    </svg>
  );
}

export function IconExportData() {
  return (
    <svg {...base}>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function IconPanelLeft() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M10 4v16" />
      <path d="M6 9h1M6 12h1" />
    </svg>
  );
}

export function IconPanelRight() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M14 4v16" />
      <path d="M17 9h1M17 12h1" />
    </svg>
  );
}
