/**
 * Figma text styles -> CSS utility classes.
 *
 * Emits `dist/css/typography.css`. Every declaration is a `var()` reference to
 * a token, never a literal — which is what makes these classes responsive: the
 * `type/*` tokens are breakpoint-scoped, so the classes resize at the tablet and
 * mobile breakpoints without carrying a media query of their own.
 *
 * A style with an unbound field is a hard error. Emitting a literal instead
 * would produce a class that silently stops matching Figma the next time
 * someone changes the value there.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTextStyles } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'dist', 'css');

const cssVar = (tokenPath) => `var(--${tokenPath.split('/').join('-')})`;

/**
 * `Body/Large Emphasis` -> `.ion-text-body-lg` + `.ion-text--emphasis`.
 *
 * The Emphasis pairs differ from their base in font-weight and nothing else, so
 * they become one modifier rather than four near-duplicate classes. Keeping them
 * separate would mean a change to Body/Large has to be made twice.
 */
const CLASS_NAMES = {
  Display: 'ion-text-display',
  'Heading/H1': 'ion-text-h1',
  'Heading/H2': 'ion-text-h2',
  'Heading/H3': 'ion-text-h3',
  'Heading/H4': 'ion-text-h4',
  'Heading/H5': 'ion-text-h5',
  'Heading/H6': 'ion-text-h6',
  'Body/Large': 'ion-text-body-lg',
  'Body/Medium': 'ion-text-body-md',
  'Body/Default': 'ion-text-body',
  'Body/Small': 'ion-text-body-sm',
  Caption: 'ion-text-caption',
  'Editorial/Display': 'ion-text-editorial-display',
  'Editorial/H1': 'ion-text-editorial-h1',
  'Editorial/H2': 'ion-text-editorial-h2',
  'Editorial/H3': 'ion-text-editorial-h3',
};

const { textStyles } = loadTextStyles();
const errors = [];
const blocks = [];

// Verify each Emphasis variant really is weight-only before folding it away.
for (const [name, style] of Object.entries(textStyles)) {
  if (!name.endsWith(' Emphasis')) continue;
  const base = textStyles[name.replace(/ Emphasis$/, '')];
  if (!base) {
    errors.push(`${name}: no base style to pair with`);
    continue;
  }
  const differs = ['fontFamily', 'fontSize', 'lineHeight'].filter(
    (k) => base[k] !== style[k],
  );
  if (differs.length) {
    errors.push(
      `${name} differs from its base in ${differs.join(', ')} — it is not a weight-only modifier and needs its own class`,
    );
  }
}

for (const [name, className] of Object.entries(CLASS_NAMES)) {
  const style = textStyles[name];
  if (!style) {
    errors.push(`${name}: in CLASS_NAMES but missing from the export`);
    continue;
  }
  const unbound = ['fontFamily', 'fontWeight', 'fontSize', 'lineHeight'].filter(
    (k) => !style[k],
  );
  if (unbound.length) {
    errors.push(`${name}: unbound in Figma — ${unbound.join(', ')}`);
    continue;
  }
  blocks.push(
    `.${className} {\n` +
      `  font-family: ${cssVar(style.fontFamily)};\n` +
      `  font-weight: ${cssVar(style.fontWeight)};\n` +
      `  font-size: ${cssVar(style.fontSize)};\n` +
      `  line-height: ${cssVar(style.lineHeight)};\n` +
      `}`,
  );
}

// Any exported style with no class is a gap, not a silent omission.
const unmapped = Object.keys(textStyles).filter(
  (n) => !CLASS_NAMES[n] && !n.endsWith(' Emphasis'),
);
if (unmapped.length) {
  errors.push(`no class mapping for: ${unmapped.join(', ')}`);
}

if (errors.length) {
  console.error(`\nTypography build failed — ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

const emphasisWeight = textStyles['Body/Default Emphasis'].fontWeight;

const header = [
  '/**',
  ' * Generated from the Figma text styles. Do not edit.',
  ' * Regenerate with `pnpm --filter @ionbase-ui/tokens build`.',
  ' *',
  ' * Responsive by construction: font-size and line-height reference',
  ' * breakpoint-scoped type/* tokens, so these classes resize on their own.',
  ' */',
].join('\n');

const css =
  [
    header,
    ...blocks,
    '/* Weight-only modifier, pairs with any body class. */\n' +
      `.ion-text--emphasis {\n  font-weight: ${cssVar(emphasisWeight)};\n}`,
  ].join('\n\n') + '\n';

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'typography.css'), css);

console.log(
  `Typography: ${blocks.length} classes + 1 emphasis modifier -> dist/css/typography.css`,
);
