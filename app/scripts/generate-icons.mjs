// Renders the three native app icons (icon, splash-icon, adaptive-icon) from
// the HiveLogo mark geometry. Run only when HiveLogo.tsx geometry changes.
//
// Setup (the renderer is not a committed devDep — install it just to run this):
//   npm install --save-dev @resvg/resvg-js
//   node scripts/generate-icons.mjs
//   npm uninstall @resvg/resvg-js
//
// Output: app/assets/images/{icon,splash-icon,adaptive-icon}.png
// Geometry matches src/components/HiveLogo.tsx (32×32 viewBox).

import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(SCRIPT_DIR, '../assets/images');

// Tokens — kept in sync with src/theme/index.ts and the design spec.
const SPLASH_BG = '#130C2E';
const SPLASH_FG = '#F5F3FF';
const PRIMARY = '#6D28D9';

// hexMark draws the two-part "Hex Resonance" mark inside a 32×32 box,
// translated/scaled to land at (cx, cy) with the given outer size.
function hexMark({ cx, cy, size, color }) {
  const scale = size / 32;
  const tx = cx - size / 2;
  const ty = cy - size / 2;
  return `
    <g transform="translate(${tx} ${ty}) scale(${scale})">
      <path d="M16 2.5l11.7 6.75v13.5L16 29.5 4.3 22.75V9.25L16 2.5z"
            fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="16"   cy="3.6"  r="0.85" fill="${color}" opacity="0.85"/>
      <circle cx="26.2" cy="21.6" r="0.85" fill="${color}" opacity="0.5"/>
      <circle cx="5.8"  cy="21.6" r="0.85" fill="${color}" opacity="0.5"/>
      <path d="M16 10l5.2 3v6L16 22l-5.2-3v-6L16 10z" fill="${color}"/>
    </g>`;
}

const CANVAS = 1024;

// Solid splash-purple background + white hex mark at ~52% of canvas.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <rect width="${CANVAS}" height="${CANVAS}" fill="${SPLASH_BG}"/>
  ${hexMark({ cx: CANVAS / 2, cy: CANVAS / 2, size: 540, color: SPLASH_FG })}
</svg>`;

// Transparent background — app.json supplies #130C2E. Hex mark a bit smaller
// so it sits well inside the splash content area.
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${hexMark({ cx: CANVAS / 2, cy: CANVAS / 2, size: 360, color: SPLASH_FG })}
</svg>`;

// Adaptive foreground — Android safe zone is the centered ~66%. Logo at ~46%
// so it stays well inside that circle. Brand purple, transparent bg
// (app.json provides Android backgroundColor #ffffff).
const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${hexMark({ cx: CANVAS / 2, cy: CANVAS / 2, size: 470, color: PRIMARY })}
</svg>`;

function render(svg, filename) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: CANVAS } });
  const png = resvg.render().asPng();
  const outPath = resolve(OUT_DIR, filename);
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}

render(iconSvg, 'icon.png');
render(splashSvg, 'splash-icon.png');
render(adaptiveSvg, 'adaptive-icon.png');
