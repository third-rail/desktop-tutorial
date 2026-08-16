# DICOM Viewer

A fully-featured DICOM viewer for reviewing medical imaging studies (X-ray, CT, MRI, ultrasound, and
more) handed to you by an imaging center or physician. Runs as a Windows 11 desktop app and as a
web app, built from the same codebase.

Built on [Cornerstone3D](https://www.cornerstonejs.org/) — the same open-source rendering engine
that powers the [OHIF Viewer](https://ohif.org/) — for DICOM decoding, 2D/MPR/3D GPU rendering, and
measurement tools.

## Features

- **Local file ingestion** — open individual DICOM files, a folder, or a ZIP export; no PACS/server
  required. Non-DICOM files and non-image DICOM objects (presentation states, etc.) are skipped
  automatically.
- **2D viewing** — window/level, pan, zoom, stack scroll, cine playback for multiframe series
  (ultrasound, XA), configurable multi-viewport grid layouts (1×1 through 2×3).
- **MPR (multiplanar reformatting)** — linked axial/sagittal/coronal panes with a crosshairs tool,
  built from any CT/MR/PT series with enough slices to form a volume.
- **3D volume rendering** — GPU volume rendering with orbit/pan/zoom camera controls, transfer
  function presets (bone, soft tissue, lung, angio, MIP), and a draggable 3-plane clipping/slicer
  gizmo.
- **Measurement tools** — length, angle, rectangle/ellipse ROI, arrow annotation; a live
  measurements panel; export to PDF (image + measurement table) or a structured JSON sidecar.
- **Multi-window** — pop any viewport (including the 3D view) out into its own OS window for
  multi-monitor reading.
- **Dark, OHIF-style UI** — patient/study/series browser with thumbnails, standard PACS corner
  overlays, keyboard/mouse conventions familiar from other DICOM viewers.

## Project layout

```
packages/
  viewer-app/     React + TypeScript + Vite app — the actual viewer UI and logic.
                  Runs standalone in a browser, and is loaded by the Electron shell.
  desktop-shell/  Electron main process — native file/folder dialogs, app menu,
                  .dcm file association, pop-out windows, Windows NSIS packaging.
```

## Development

```bash
npm install

# Web app, in a browser
npm run dev                 # → http://localhost:5173

# Desktop app, in Electron (loads the Vite dev server)
npm run dev:electron
```

## Building

```bash
# Web app production build → packages/viewer-app/dist
npm run build

# Windows installer → packages/desktop-shell/release
npm run build:win
```

`build:win` builds the web app, copies it into the Electron shell, and packages a Windows x64 NSIS
installer with `electron-builder`. Building the final `.exe` installer (not just the unpacked app)
requires [Wine](https://www.winehq.org/) when cross-building from Linux/macOS — it's unnecessary on
a native Windows build machine or a CI runner that already has Wine (e.g. most electron-builder
Docker images).

## Notes

- All DICOM decoding happens through Web Workers using WebAssembly codecs, which requires the page
  to be [cross-origin isolated](https://developer.mozilla.org/en-US/docs/Web/API/crossOriginIsolated)
  (`SharedArrayBuffer` available). Both the Vite dev/preview server and the Electron shell set the
  required `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers already — if you
  deploy the web build behind your own server, make sure it sends the same two headers.
- The measurement/annotation export is a structured JSON sidecar with DICOM-SR-inspired field names,
  not a DICOM SR IOD.
