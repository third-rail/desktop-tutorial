import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cornerstone3D's DICOM codec workers (openjpeg/openjph/charls) need SharedArrayBuffer, which
// only exists in a cross-origin-isolated page — hence the COOP/COEP headers on both dev and preview.
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built app also works loaded directly via file:// in Electron.
  base: './',
  server: { headers: crossOriginIsolationHeaders },
  preview: { headers: crossOriginIsolationHeaders },
})
