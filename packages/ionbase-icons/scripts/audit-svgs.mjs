/**
 * Read `svg/` and report the facts that decide how the generator must behave.
 *
 * Run this BEFORE generating anything. Every question it answers is one that is
 * unsafe to assume across a set this size, and each wrong assumption is a defect
 * multiplied by the icon count:
 *
 *   - A mixed viewBox means `size="md"` renders two different optical weights
 *     under one name.
 *   - Stroke-based and fill-based icons need opposite `currentColor` handling.
 *     Guessing wrong makes an icon invisible or a solid black block.
 *   - Stroke icons that disagree on `stroke-width` never read as one family,
 *     however carefully they are sized.
 *   - Two source files can collide after kebab-case normalisation, and a name
 *     can PascalCase into a JS reserved word.
 *
 * Reports only. It writes nothing and fails nothing — the point is to see the
 * set before committing to a shape for it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = join(here, '..', 'svg');

const VALID_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** `arrow-right` -> `ArrowRight`. Digits keep their segment. */
export function pascal(id) {
  return id
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

const RESERVED = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'let',
  'static',
  'await',
]);

const attr = (src, name) => {
  const m = src.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
};

function main() {
  let files;
  try {
    files = readdirSync(SVG_DIR).filter((f) =>
      f.toLowerCase().endsWith('.svg'),
    );
  } catch {
    console.error(`No such directory: ${SVG_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(`No SVGs in ${SVG_DIR} yet — drop them in and re-run.`);
    return;
  }

  const viewBoxes = new Map();
  const strokeWidths = new Map();
  const byId = new Map();
  const badNames = [];
  const reservedNames = [];
  const hardcodedColour = [];
  const hasWidthHeight = [];
  const rootFillNone = [];
  let strokeBased = 0;
  let fillBased = 0;
  let both = 0;
  let neither = 0;

  for (const file of files) {
    const raw = readFileSync(join(SVG_DIR, file), 'utf8');
    const id = basename(file, '.svg');

    if (!VALID_NAME.test(id)) badNames.push(file);
    const pas = pascal(id);
    if (RESERVED.has(pas.toLowerCase()) || /^\d/.test(pas))
      reservedNames.push(file);

    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(file);

    const vb = attr(raw, 'viewBox') || '(none)';
    viewBoxes.set(vb, (viewBoxes.get(vb) || 0) + 1);

    if (attr(raw, 'width') || attr(raw, 'height')) hasWidthHeight.push(file);

    // Stroke vs fill, judged on the whole document rather than the root tag —
    // many sets put the paint on the children.
    const strokes = [...raw.matchAll(/\sstroke\s*=\s*["']([^"']*)["']/gi)].map(
      (m) => m[1],
    );
    const fills = [...raw.matchAll(/\sfill\s*=\s*["']([^"']*)["']/gi)].map(
      (m) => m[1],
    );
    const realStroke = strokes.some((v) => v && v !== 'none');
    const realFill = fills.some((v) => v && v !== 'none');

    if (realStroke && realFill) both++;
    else if (realStroke) strokeBased++;
    else if (realFill) fillBased++;
    else neither++;

    const rootFill = attr(raw, 'fill');
    if (rootFill === 'none') rootFillNone.push(file);

    for (const sw of [
      ...raw.matchAll(/stroke-width\s*=\s*["']([^"']*)["']/gi),
    ].map((m) => m[1])) {
      strokeWidths.set(sw, (strokeWidths.get(sw) || 0) + 1);
    }

    // Anything that is a colour but not currentColor has to be rewritten.
    const paints = [...strokes, ...fills].filter(
      (v) => v && v !== 'none' && v !== 'currentColor' && v !== 'inherit',
    );
    if (paints.length)
      hardcodedColour.push({ file, paints: [...new Set(paints)].slice(0, 3) });
  }

  const collisions = [...byId.entries()].filter(([, v]) => v.length > 1);
  const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\nSOURCE: ${SVG_DIR}`);
  console.log(`${files.length} SVG files\n`);

  console.log('viewBox');
  for (const [vb, n] of sorted(viewBoxes)) {
    const pct = ((n / files.length) * 100).toFixed(1);
    console.log(`  ${String(n).padStart(5)}  ${pct.padStart(5)}%  ${vb}`);
  }
  if (viewBoxes.size > 1) {
    console.log(
      '  ^ MIXED. One size prop cannot mean one optical weight across these.',
    );
  }

  console.log('\npaint model');
  console.log(`  stroke only   ${strokeBased}`);
  console.log(`  fill only     ${fillBased}`);
  console.log(`  both          ${both}`);
  console.log(`  neither       ${neither}   (inherits — usually fine)`);
  if (strokeBased && fillBased) {
    console.log(
      '  ^ MIXED. currentColor must be applied per icon, not globally.',
    );
  }

  if (strokeWidths.size) {
    console.log('\nstroke-width');
    for (const [w, n] of sorted(strokeWidths))
      console.log(`  ${String(n).padStart(5)}  ${w}`);
    if (strokeWidths.size > 1)
      console.log('  ^ MIXED. These will not read as one family.');
  }

  console.log('\nrewrites the generator will make');
  console.log(`  drop width/height        ${hasWidthHeight.length}`);
  console.log(`  colour -> currentColor   ${hardcodedColour.length}`);
  console.log(
    `  root fill="none"         ${rootFillNone.length}  (kept as-is)`,
  );

  const problem = (label, list, show = (x) => x) => {
    if (!list.length) return 0;
    console.log(`\n${label} — ${list.length}`);
    for (const item of list.slice(0, 15)) console.log(`  ${show(item)}`);
    if (list.length > 15) console.log(`  ... and ${list.length - 15} more`);
    return list.length;
  };

  let blocking = 0;
  blocking += problem('INVALID NAMES (must be kebab-case)', badNames);
  blocking += problem(
    'NAME COLLISIONS after normalisation',
    collisions,
    ([id, fs]) => `${id}: ${fs.join(', ')}`,
  );
  blocking += problem(
    'NAMES THAT ARE RESERVED WORDS or start with a digit',
    reservedNames,
  );
  problem(
    'HARDCODED COLOURS (rewritten, listed for review)',
    hardcodedColour,
    (x) => `${x.file}: ${x.paints.join(', ')}`,
  );

  console.log(
    blocking
      ? `\n${blocking} blocking issue(s). Fix the filenames before generating.`
      : '\nNo blocking issues. Safe to generate.',
  );
}

main();
