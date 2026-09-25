/**
 * Generate PNG icons from SVG at various sizes.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '..', 'public', 'icons', 'icon.svg');
const outDir = join(__dirname, '..', 'public', 'icons');

const sizes = [16, 32, 48, 128];

const svgBuffer = readFileSync(svgPath);

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon${size}.png`));
  console.log(`Generated icon${size}.png`);
}

console.log('Done!');
