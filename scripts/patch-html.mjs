/**
 * Injeta meta tags PWA no index.html após expo export (modo single).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'dist', 'index.html');

const layoutCss = `<style>
  html, body, #root {
    height: 100%;
    width: 100%;
    overflow-x: hidden;
  }
  body {
    overflow: hidden;
    background-color: #F5F0E8;
    margin: 0;
  }
  #root {
    display: flex;
    flex: 1;
    width: 100%;
    min-width: 0;
  }
</style>`;

const metaTags = `
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Sláinte" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />`;

let html = readFileSync(htmlPath, 'utf8');
let changed = false;

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', `${metaTags}\n${layoutCss}\n</head>`);
  changed = true;
} else if (!html.includes('overflow-x: hidden')) {
  if (html.includes('<style>')) {
    html = html.replace(/<style>[\s\S]*?<\/style>/, layoutCss);
  } else {
    html = html.replace('</head>', `${layoutCss}\n</head>`);
  }
  changed = true;
}

if (changed) {
  writeFileSync(htmlPath, html, 'utf8');
  console.log('✓ dist/index.html — layout/PWA atualizado');
} else {
  console.log('dist/index.html já está atualizado');
}
