/**
 * Injeta meta tags PWA no index.html após expo export (modo single).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'dist', 'index.html');

const injections = `
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Sláinte" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<style>
  html, body, #root { height: 100%; }
  body { overflow: hidden; background-color: #F5F0E8; }
  #root { display: flex; flex: 1; }
</style>`;

let html = readFileSync(htmlPath, 'utf8');

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', `${injections}\n</head>`);
  writeFileSync(htmlPath, html, 'utf8');
  console.log('✓ dist/index.html — meta tags PWA adicionados');
} else {
  console.log('dist/index.html já contém manifest');
}
