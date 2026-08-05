/**
 * svg/*.svg  ->  src/icons/<id>.tsx + src/index.ts
 *
 * The SVGs in `svg/` are the source of truth. Everything this writes is
 * gitignored and rebuilt, so `src/` is never hand-edited and a regeneration is
 * never a review burden.
 *
 * ONE MODULE PER ICON, AND WHY IT MATTERS
 *
 * Each icon is its own file under `src/icons/`, reachable as
 * `ionbase-icons/icons/copy`. The barrel exists for discovery, and is only safe
 * because the manifest sets `sideEffects: false` — several bundlers will
 * otherwise pull the whole set from a single named import. That is the exact
 * failure `ionbase-ui` avoids by shipping no icon set at all, and it does not
 * stop being true just because the icons moved to their own package.
 *
 * WHAT IS REWRITTEN, AND WHY EACH ONE
 *
 *   width/height     Dropped. Size belongs to CSS or to the `Icon` wrapper. An
 *                    icon that carries its own is unsizeable by either.
 *   colours          Any concrete paint becomes `currentColor`, so the icon
 *                    inherits the text colour it sits in and themes for free.
 *                    `none` and `currentColor` are left alone — `none` is
 *                    structural, not a colour.
 *   viewBox          Kept exactly. It is the icon's coordinate system; the
 *                    audit script is what flags a set that disagrees.
 *   metadata         `<title>`, `<desc>`, comments and editor attributes
 *                    (`id`, `class`, `data-*`, `xmlns:*`, sketch/figma/illustrator)
 *                    are stripped. `<title>` in particular would otherwise
 *                    render a browser tooltip on every icon.
 *
 * Everything else — paths, groups, stroke-width, linecaps, fill-rule — is
 * preserved verbatim. The generator's job is plumbing, not redrawing.
 *
 * Props spread LAST so a caller can override anything, and `ref` is forwarded
 * so the components satisfy `IconComponent` from ionbase-ui and drop straight
 * into `<Icon as={...} />`.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const SVG_DIR = join(PKG, 'svg');
const SRC = join(PKG, 'src');
const ICONS = join(SRC, 'icons');

const VALID_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const pascal = (id) =>
  id
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

/** Attributes that describe the editor, not the drawing. */
const DROP_ATTR =
  /\s(?:xmlns:[\w-]+|xml:space|id|class|data-[\w-]+|sketch:[\w-]+|figma:[\w-]+|inkscape:[\w-]+|sodipodi:[\w-]+|serif:[\w-]+)\s*=\s*["'][^"']*["']/gi;

/** kebab-case SVG attributes React wants camelCased. */
const REACT_ATTR = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'text-anchor': 'textAnchor',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'letter-spacing': 'letterSpacing',
  'paint-order': 'paintOrder',
  'vector-effect': 'vectorEffect',
  'color-interpolation-filters': 'colorInterpolationFilters',
  gradientUnits: 'gradientUnits',
  gradientTransform: 'gradientTransform',
};

function toReactAttrs(markup) {
  let out = markup;
  for (const [from, to] of Object.entries(REACT_ATTR)) {
    out = out.replace(new RegExp(`\\s${from}\\s*=`, 'g'), ` ${to}=`);
  }
  return out;
}

/** Concrete paints become currentColor; `none` and `currentColor` stay. */
function paintToCurrentColor(markup) {
  return markup.replace(
    /(\s(?:fill|stroke)\s*=\s*)["']([^"']*)["']/gi,
    (all, lead, value) => {
      const v = value.trim();
      if (v === '' || v === 'none' || v === 'currentColor' || v === 'inherit')
        return all;
      if (v.startsWith('url(')) return all; // gradient / pattern reference
      return `${lead}"currentColor"`;
    },
  );
}

/**
 * Attributes on the root `<svg>` that are the editor's, the sizing, or the
 * coordinate system — everything else on the root is PAINT and must survive.
 *
 * Getting this wrong is silent and total: a Lucide-style icon carries
 * `fill="none" stroke="currentColor" stroke-width="2"` on the root and nothing
 * on its children, so dropping the root attributes renders every path as a
 * solid black blob instead of an outline. It looks like a drawing problem, not
 * a build one.
 */
const ROOT_NON_PAINT =
  /^(?:xmlns|xmlns:[\w-]+|xml:space|version|baseProfile|width|height|viewBox|id|class|data-[\w-]+|sketch:[\w-]+|figma:[\w-]+|inkscape:[\w-]+|sodipodi:[\w-]+|serif:[\w-]+|aria-[\w-]+|role|focusable|style)$/i;

function rootPaintAttrs(attrSource) {
  const out = [];
  for (const m of attrSource.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) {
    const [, name, value] = m;
    if (ROOT_NON_PAINT.test(name)) continue;
    out.push({ name, value });
  }
  return out;
}

function transform(raw, file) {
  const open = raw.match(/<svg\b([^>]*)>/i);
  if (!open) throw new Error(`${file}: no <svg> element`);

  const viewBox = open[1].match(/\sviewBox\s*=\s*["']([^"']*)["']/i);
  if (!viewBox) throw new Error(`${file}: no viewBox — cannot size this icon`);

  // Carried onto the generated <svg>, before {...props}, so a caller can still
  // override any of them.
  const rootAttrs = rootPaintAttrs(open[1]).map(({ name, value }) => {
    const rewritten = paintToCurrentColor(` ${name}="${value}"`).trim();
    return toReactAttrs(` ${rewritten}`).trim();
  });

  const close = raw.lastIndexOf('</svg>');
  let inner = raw.slice(open.index + open[0].length, close);

  inner = inner
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title\b[\s\S]*?<\/title>/gi, '')
    .replace(/<desc\b[\s\S]*?<\/desc>/gi, '')
    .replace(/<metadata\b[\s\S]*?<\/metadata>/gi, '')
    .replace(DROP_ATTR, '');

  inner = paintToCurrentColor(inner);
  inner = toReactAttrs(inner);

  // Self-close void SVG elements so the markup is valid JSX.
  inner = inner.replace(
    /<(path|circle|rect|line|polyline|polygon|ellipse|stop|use)\b([^>/]*)>/gi,
    (all, tag, attrs) =>
      attrs.trimEnd().endsWith('/') ? all : `<${tag}${attrs} />`,
  );

  inner = inner
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n    ');

  return { viewBox: viewBox[1], inner, rootAttrs };
}

const template = (
  id,
  name,
  viewBox,
  inner,
  rootAttrs,
) => `import { forwardRef } from 'react';
import type { SVGProps } from 'react';

/** \`${id}\` — generated from svg/${id}.svg. Do not edit. */
export const ${name} = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${viewBox}"
      width="1em"
      height="1em"${rootAttrs.length ? '\n      ' + rootAttrs.join('\n      ') : ''}
      {...props}
    >
    ${inner}
    </svg>
  ),
);

${name}.displayName = '${name}';

export default ${name};
`;

function main() {
  if (!existsSync(SVG_DIR)) {
    console.error(`ionbase-icons: no svg/ directory at ${SVG_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(SVG_DIR).filter((f) =>
    f.toLowerCase().endsWith('.svg'),
  );

  rmSync(SRC, { recursive: true, force: true });
  mkdirSync(ICONS, { recursive: true });

  if (files.length === 0) {
    // Not an error. The package is scaffolded before the artwork lands, and a
    // workspace build must stay green in between — but it must also not
    // silently publish an empty icon set, which is what the barrel comment and
    // the manifest's `private: true` are for.
    writeFileSync(
      join(SRC, 'index.ts'),
      '// No SVGs in svg/ yet. Drop them in and run `pnpm --filter ionbase-icons build`.\nexport {};\n',
    );
    console.log('ionbase-icons: svg/ is empty — generated an empty barrel.');
    return;
  }

  const icons = [];
  const failures = [];

  for (const file of files.sort()) {
    const id = basename(file, '.svg');
    if (!VALID_NAME.test(id)) {
      failures.push(`${file}: not kebab-case — run icons:audit`);
      continue;
    }
    try {
      const { viewBox, inner, rootAttrs } = transform(
        readFileSync(join(SVG_DIR, file), 'utf8'),
        file,
      );
      const name = pascal(id);
      writeFileSync(
        join(ICONS, `${id}.tsx`),
        template(id, name, viewBox, inner, rootAttrs),
      );
      icons.push({ id, name });
    } catch (e) {
      failures.push(`${file}: ${e.message}`);
    }
  }

  if (failures.length) {
    console.error(`\nionbase-icons: ${failures.length} file(s) failed\n`);
    for (const f of failures.slice(0, 20)) console.error(`  ${f}`);
    if (failures.length > 20)
      console.error(`  ... and ${failures.length - 20} more`);
    process.exit(1);
  }

  const barrel = [
    '/*',
    ' * Generated by scripts/generate.mjs. Do not edit.',
    ' *',
    ' * Importing from this barrel is safe ONLY because the manifest sets',
    ' * `sideEffects: false`. Prefer `ionbase-icons/icons/<id>` in application',
    ' * code — it is one module either way, and it does not depend on the',
    ' * bundler getting tree-shaking right.',
    ' */',
    ...icons.map(
      ({ id, name }) => `export { ${name} } from './icons/${id}.js';`,
    ),
    '',
  ].join('\n');

  writeFileSync(join(SRC, 'index.ts'), barrel);
  console.log(`ionbase-icons: generated ${icons.length} icons -> src/icons/`);
}

main();
