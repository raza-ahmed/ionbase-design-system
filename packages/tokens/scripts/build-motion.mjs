/**
 * Interaction motion -> CSS custom properties.
 *
 * Emits `dist/css/motion.css` from `motion.json`. Unlike every other generator
 * here the source is repo-owned rather than a Figma export: motion in Figma is
 * a prototype reaction, not a variable, so there is nothing for a token to
 * alias. That is the same situation as effect styles and gets the same answer —
 * commit the values, generate the CSS, and mark it with the `--ion-` prefix so
 * nobody mistakes it for pipeline output.
 *
 * The generator asserts every rung is present and well-formed. A duration that
 * silently stringifies to `undefinedms` would produce a stylesheet that parses,
 * drops the declaration, and leaves the transition running at the browser
 * default of 0s — an invisible failure, which is the only kind worth a gate.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'dist', 'css');
const SRC = join(here, '..', 'motion.json');

const { duration, ease } = JSON.parse(readFileSync(SRC, 'utf8'));

if (!duration || !ease) {
  throw new Error('motion.json must define both `duration` and `ease`.');
}

/** Only these two shapes are valid; anything else is a typo, not a value. */
const CUBIC =
  /^cubic-bezier\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)$/;

const durations = Object.entries(duration).map(([name, entry]) => {
  if (!Number.isFinite(entry.ms) || entry.ms < 0) {
    throw new Error(`duration.${name}.ms must be a non-negative number.`);
  }
  return {
    prop: `--ion-duration-${name}`,
    value: `${entry.ms}ms`,
    use: entry.use,
  };
});

const eases = Object.entries(ease).map(([name, entry]) => {
  const curve = entry.curve;
  if (curve !== 'linear' && !CUBIC.test(curve)) {
    throw new Error(
      `ease.${name}.curve must be \`linear\` or a cubic-bezier(); got \`${curve}\`.`,
    );
  }
  return { prop: `--ion-ease-${name}`, value: curve, use: entry.use };
});

/** Wrap the `use` note so the generated file stays readable at 80 columns. */
function comment(text, indent) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 72) {
      lines.push(line.trim());
      line = word;
    } else {
      line += ' ' + word;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.map((l) => `${indent}/* ${l} */`).join('\n');
}

const block = (entries) =>
  entries
    .map((e) => `${comment(e.use, '  ')}\n  ${e.prop}: ${e.value};`)
    .join('\n\n');

const css = `/**
 * Generated from motion.json. Do not edit.
 * Regenerate with \`pnpm --filter @ionbase-ui/tokens build\`.
 *
 * Source: motion.json (repo-owned — NOT a Figma export)
 *
 * These are NOT tokens. Figma expresses motion as prototype reactions rather
 * than variables, so there is nothing for them to alias; the values are
 * committed and generated instead. The \`--ion-\` prefix marks that, the same
 * way it does for \`--ion-shadow-*\`.
 *
 * A LADDER, NOT RECIPES. Pick a rung per component. There is deliberately no
 * \`--ion-duration-hover\`: that is indexed by usage, so it needs a new name
 * per usage pattern.
 *
 * Reduced motion is handled globally in the package's index.css, not here —
 * one block covering every \`ion-*\` rule, rather than a media query per value.
 */

:root {
${block(durations)}

${block(eases)}
}
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'motion.css'), css);

console.log(
  `Motion: ${durations.length} durations + ${eases.length} easings -> dist/css/motion.css (from motion.json)`,
);
