/** Prints the complete asset table (markdown) from the typed manifest: npx tsx scripts/asset-table.ts */
import { MANIFEST } from '../src/assets/manifest';
const rows = MANIFEST.map((a) => `| \`${a.id}\` | ${a.category} | \`public/${a.url}\` | ${a.kind === 'audio' ? '—' : `${a.width}×${a.height}${a.frameWidth ? ` (frames ${a.frameWidth}×${a.frameHeight})` : ''}`} | ${a.anchor ? `${a.anchor.x}, ${a.anchor.y}` : '—'} | ${a.description}${a.frames ? ` ${a.frames}` : ''} |`);
console.log(['| Asset ID | Category | File to add/replace | Size (px) | Anchor | What it is / state |', '|---|---|---|---|---|---|', ...rows].join('\n'));
