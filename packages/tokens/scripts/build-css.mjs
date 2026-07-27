/**
 * Style Dictionary v4 build: DTCG -> CSS custom properties + TS.
 *
 * Each theme/breakpoint mode is its own Style Dictionary run, because a mode is
 * really "the same token names under a different selector". Primitives and
 * Component tokens have one mode and land in :root.
 */
import StyleDictionary from 'style-dictionary';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_KEY } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const DTCG = join(PKG, 'src', 'dtcg');
const DIST = join(PKG, 'dist');

/** Figma stores weights as font *style names*; CSS wants numeric weights. */
const FONT_WEIGHTS = {
  Regular: '400',
  Medium: '500',
  SemiBold: '600',
  Bold: '700',
};

StyleDictionary.registerTransform({
  name: 'ionbase/name/css',
  type: 'name',
  // `DEFAULT` exists only to make the DTCG tree legal — it must not reach CSS.
  transform: (token) => {
    const path =
      token.path.at(-1) === DEFAULT_KEY ? token.path.slice(0, -1) : token.path;
    return path.join('-');
  },
});

StyleDictionary.registerTransform({
  name: 'ionbase/dimension/px',
  type: 'value',
  filter: (token) =>
    token.$type === 'dimension' && typeof token.$value === 'number',
  transform: (token) => `${token.$value}px`,
});

StyleDictionary.registerTransform({
  name: 'ionbase/fontWeight/numeric',
  type: 'value',
  filter: (token) => token.$type === 'fontWeight',
  transform: (token) => FONT_WEIGHTS[token.$value] ?? token.$value,
});

StyleDictionary.registerTransformGroup({
  name: 'ionbase/css',
  transforms: [
    'ionbase/name/css',
    'ionbase/dimension/px',
    'ionbase/fontWeight/numeric',
    'color/css',
  ],
});

/**
 * @param {object} opts
 * @param {string[]} opts.source  DTCG files feeding this run
 * @param {string} opts.output    CSS filename
 * @param {string} opts.selector  CSS selector the vars are declared on
 * @param {string} [opts.mediaQuery] wraps the block, for breakpoint modes
 * @param {string} [opts.onlyFrom]  emit only tokens defined in this source file.
 *   Mode overrides still need the full token set loaded so aliases resolve, but
 *   re-declaring every primitive under `[data-theme="dark"]` would be noise.
 */
async function buildCss({ source, output, selector, mediaQuery, onlyFrom }) {
  const sd = new StyleDictionary({
    source: source.map((f) => join(DTCG, f)),
    log: { verbosity: 'silent', warnings: 'disabled' },
    platforms: {
      css: {
        transformGroup: 'ionbase/css',
        buildPath: `${DIST}/css/`,
        files: [
          {
            destination: output,
            format: 'css/variables',
            options: { selector },
            ...(onlyFrom && {
              filter: (token) => token.filePath.endsWith(onlyFrom),
            }),
          },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();

  if (mediaQuery) {
    const path = join(DIST, 'css', output);
    const body = readFileSync(path, 'utf8')
      .split('\n')
      .map((l) => (l.trim() ? `  ${l}` : l))
      .join('\n');
    writeFileSync(path, `@media ${mediaQuery} {\n${body}\n}\n`);
  }
}

/**
 * Only tokens that actually change between modes belong in a mode override.
 * Emitting the unchanged ones too would work, but it triples the dark-theme
 * payload and hides which tokens are genuinely theme-dependent.
 */
function changedTokens(baseFile, modeFile) {
  const flatten = (obj, path = [], out = {}) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object' && '$value' in v)
        out[[...path, k].join('.')] = v.$value;
      else if (v && typeof v === 'object') flatten(v, [...path, k], out);
    }
    return out;
  };
  const base = flatten(JSON.parse(readFileSync(join(DTCG, baseFile), 'utf8')));
  const mode = flatten(JSON.parse(readFileSync(join(DTCG, modeFile), 'utf8')));
  return Object.keys(mode).filter(
    (k) => JSON.stringify(base[k]) !== JSON.stringify(mode[k]),
  );
}

/** Writes a pruned copy of a mode file containing only its diverging tokens. */
function writeDiffFile(baseFile, modeFile, outName) {
  const changed = new Set(changedTokens(baseFile, modeFile));
  const src = JSON.parse(readFileSync(join(DTCG, modeFile), 'utf8'));
  const out = {};
  const walk = (obj, path = []) => {
    for (const [k, v] of Object.entries(obj)) {
      const p = [...path, k];
      if (v && typeof v === 'object' && '$value' in v) {
        if (!changed.has(p.join('.'))) continue;
        let node = out;
        for (const seg of p.slice(0, -1)) node = node[seg] ??= {};
        node[p.at(-1)] = v;
      } else if (v && typeof v === 'object') walk(v, p);
    }
  };
  walk(src);
  writeFileSync(join(DTCG, outName), JSON.stringify(out, null, 2) + '\n');
  return changed.size;
}

async function main() {
  mkdirSync(join(DIST, 'css'), { recursive: true });

  // Base layer: primitives + light theme + desktop + component aliases.
  await buildCss({
    source: [
      'primitives.json',
      'semantic.light.json',
      'breakpoint.desktop.json',
      'component.json',
    ],
    output: 'base.css',
    selector: ':root',
  });

  // Dark theme — only the semantic tokens that actually differ.
  const darkCount = writeDiffFile(
    'semantic.light.json',
    'semantic.dark.json',
    '_dark.diff.json',
  );
  await buildCss({
    source: ['primitives.json', 'semantic.light.json', '_dark.diff.json'],
    output: 'theme-dark.css',
    selector: '[data-theme="dark"]',
    onlyFrom: '_dark.diff.json',
  });

  // Breakpoints — geometry and type only, no colour.
  const tabletCount = writeDiffFile(
    'breakpoint.desktop.json',
    'breakpoint.tablet.json',
    '_tablet.diff.json',
  );
  await buildCss({
    source: ['primitives.json', 'breakpoint.desktop.json', '_tablet.diff.json'],
    output: 'breakpoint-tablet.css',
    selector: ':root',
    mediaQuery: '(max-width: 1023px)',
    onlyFrom: '_tablet.diff.json',
  });

  const mobileCount = writeDiffFile(
    'breakpoint.desktop.json',
    'breakpoint.mobile.json',
    '_mobile.diff.json',
  );
  await buildCss({
    source: ['primitives.json', 'breakpoint.desktop.json', '_mobile.diff.json'],
    output: 'breakpoint-mobile.css',
    selector: ':root',
    mediaQuery: '(max-width: 767px)',
    onlyFrom: '_mobile.diff.json',
  });

  writeFileSync(
    join(DIST, 'css', 'index.css'),
    [
      '@import "./base.css";',
      '@import "./theme-dark.css";',
      '@import "./breakpoint-tablet.css";',
      '@import "./breakpoint-mobile.css";',
      '@import "./typography.css";',
      '',
    ].join('\n'),
  );

  console.log(
    `CSS: base + dark(${darkCount} overrides) + tablet(${tabletCount}) + mobile(${mobileCount})`,
  );
}

main();
