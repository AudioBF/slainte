/**
 * Gera PNGs nítidos a partir do SVG da marca.
 * Uso: node scripts/generate-icons.mjs
 */
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const iconSvg = join(root, 'assets', 'brand', 'icon.svg');
const foregroundSvg = join(root, 'assets', 'brand', 'icon-foreground.svg');

const outputs = [
  { input: iconSvg, out: join(root, 'assets', 'icon.png'), size: 1024 },
  { input: iconSvg, out: join(root, 'assets', 'favicon.png'), size: 96 },
  { input: iconSvg, out: join(root, 'public', 'favicon.png'), size: 32 },
  { input: iconSvg, out: join(root, 'public', 'icons', 'icon-192.png'), size: 192 },
  { input: iconSvg, out: join(root, 'public', 'icons', 'icon-512.png'), size: 512 },
  { input: iconSvg, out: join(root, 'public', 'icons', 'apple-touch-icon.png'), size: 180 },
  { input: foregroundSvg, out: join(root, 'assets', 'android-icon-foreground.png'), size: 1024 },
];

mkdirSync(join(root, 'public', 'icons'), { recursive: true });

for (const { input, out, size } of outputs) {
  mkdirSync(dirname(out), { recursive: true });
  await sharp(input)
    .resize(size, size, { fit: 'contain', background: { r: 27, g: 67, b: 50, alpha: 1 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  console.log(`✓ ${out.replace(root + '\\', '').replace(root + '/', '')} (${size}px)`);
}

console.log('Ícones gerados.');
