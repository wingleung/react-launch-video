// Rebuild the plugin directory's listing icon from the site's favicon, so the two cannot drift apart.
//
// The directory wants a square PNG of 512 to 2048px at plugin/.claude-plugin/icon.png, and reads it only the first
// time the plugin is saved or submitted in the developer portal, so a later change here never reaches the listing.
// The favicon is drawn for 32px on a transparent page. A listing tile needs a background of its own, so the mark is
// set on the site's black at 80% of the tile.
//
// Uses the site's sharp: npm ci --prefix site, then node scripts/make-icon.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const root = new URL("..", import.meta.url);
const sharp = createRequire(new URL("site/package.json", root))("sharp");

const size = 1024;
const mark = readFileSync(new URL("site/public/favicon.svg", root), "utf8")
  .replace(/^<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" fill="#000000" />
  <g transform="translate(16 16) scale(0.8) translate(-16 -16)">${mark}</g>
</svg>`;

const out = new URL("plugin/.claude-plugin/icon.png", root);
const info = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out.pathname);
console.log(`plugin/.claude-plugin/icon.png ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`);
