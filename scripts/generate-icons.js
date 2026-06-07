/**
 * Generate the PWA icon set into public/icons/ from an inline SVG.
 * Run:  npm run icons
 * (Edit the SVG below to change the icon, then re-run.)
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");

// Brand mark: dark rounded tile + three ascending green bars (portfolio growth).
// Content sits within the center safe-zone so it also works as a maskable icon.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="115" fill="#1A1A1A"/>
  <rect x="134" y="288" width="64" height="104" rx="14" fill="#34C759"/>
  <rect x="224" y="216" width="64" height="176" rx="14" fill="#34C759"/>
  <rect x="314" y="136" width="64" height="256" rx="14" fill="#34C759"/>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

mkdirSync(outDir, { recursive: true });
const buf = Buffer.from(svg);

for (const size of sizes) {
  const file = join(outDir, `icon-${size}.png`);
  await sharp(buf).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
console.log(`Done — ${sizes.length} icons in public/icons/`);
