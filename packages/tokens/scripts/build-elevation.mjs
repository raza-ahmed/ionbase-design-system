/**
 * Figma effect styles -> CSS custom properties.
 *
 * Emits `dist/css/elevation.css`. Every value is derived from
 * `src/figma/effect-styles.json`, so a shadow cannot drift from the design by
 * transcription error — which is exactly how the Button focus ring ended up
 * fully opaque when Figma renders it at 50% alpha.
 *
 * Effect styles are not variable-bound in the Figma file, so unlike geometry
 * they cannot be tokens: there is nothing to alias. Generating from committed
 * data is the closest equivalent — the value has one source, and re-exporting
 * updates the CSS.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'dist', 'css');
const { effectStyles } = JSON.parse(
  readFileSync(join(here, '..', 'src', 'figma', 'effect-styles.json'), 'utf8'),
);

/** `Button/Raised Hover` -> `--ion-shadow-button-raised-hover`. */
const cssName = (figmaName) =>
  '--ion-shadow-' +
  figmaName
    .toLowerCase()
    .replace(/[/\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const round = (n) => Number(n.toFixed(2));

function layer(fx) {
  const parts = [
    fx.type === 'INNER_SHADOW' ? 'inset' : null,
    `${round(fx.x)}px`,
    `${round(fx.y)}px`,
    `${round(fx.blur)}px`,
    // Omit a zero spread only when it is genuinely absent from the design;
    // keeping it explicit makes the generated CSS diff against Figma directly.
    `${round(fx.spread)}px`,
    `rgb(${fx.r} ${fx.g} ${fx.b} / ${round(fx.a * 100)}%)`,
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * Figma lists effects top-layer-first, and so does CSS `box-shadow`. For rings
 * that means the smallest spread must come first or a larger ring paints over
 * it — `Button/Raised Focus` is stored 4px-then-2px, which would hide the white
 * inner ring entirely. Sorting ring layers by spread ascending fixes that
 * without changing any value.
 */
function order(effects) {
  const isRing = effects.every((fx) => fx.blur === 0 || fx.spread > 0);
  if (!isRing) return effects;
  return [...effects].sort((a, b) => a.spread - b.spread);
}

const blocks = [];
for (const [name, effects] of Object.entries(effectStyles)) {
  if (!effects.length) continue;
  const value = order(effects).map(layer).join(',\n    ');
  blocks.push(`  ${cssName(name)}:\n    ${value};`);
}

const css = `/**
 * Generated from the Figma effect styles. Do not edit.
 * Regenerate with \`pnpm --filter @ionbase-ui/tokens build\`.
 *
 * Source: src/figma/effect-styles.json
 *
 * These are NOT tokens. Figma's effect styles are not variable-bound, so there
 * is nothing for them to alias — the values are committed and generated instead.
 * The \`--ion-\` prefix marks that: anything named \`--shadow-*\` would come from
 * the token pipeline, and none of this does.
 *
 * DARK MODE: override these same properties under \`[data-theme='dark']\`.
 * No component file should need to change.
 */

:root {
${blocks.join('\n\n')}

  /* A shadow that paints nothing, so composed lists always stay valid. */
  --ion-shadow-none: 0 0 transparent;
}
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'elevation.css'), css);

console.log(
  `Elevation: ${blocks.length} shadows -> dist/css/elevation.css (from ${Object.keys(effectStyles).length} Figma effect styles)`,
);
