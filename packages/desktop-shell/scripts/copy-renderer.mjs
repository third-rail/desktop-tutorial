import { cpSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '..', '..', 'viewer-app', 'dist');
const dest = path.join(__dirname, '..', 'renderer');

if (!existsSync(src)) {
  console.error(`viewer-app has not been built yet — expected ${src} to exist. Run "npm run build" first.`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied viewer-app/dist -> desktop-shell/renderer`);
