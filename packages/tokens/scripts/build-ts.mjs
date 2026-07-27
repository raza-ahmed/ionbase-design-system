/**
 * Emits the TS surface for the token set.
 *
 * Deliberately exports `var(--x)` reference strings rather than resolved values:
 * a component that inlines `#286ef0` stops responding to the theme, which is the
 * exact failure the token layer exists to prevent. Raw values are still
 * reachable per mode via `tokenValues` for tooling that genuinely needs them
 * (docs tables, contrast checks).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'src', 'generated');

const cssVar = (name) => `--${name.replace(/\//g, '-')}`;
const tsKey = (name) => `'${name}'`;

const collections = loadCollections();

const lines = [
  '// Generated from the IonBase Figma file. Do not edit directly.',
  '// Regenerate with `pnpm --filter @ionbase/tokens build`.',
  '',
];

// One exported const per collection, so consumers can lint on tier.
for (const c of collections) {
  const key = c.collection.toLowerCase();
  lines.push(`/** ${c.collection} tokens — modes: ${c.modes.join(', ')}. */`);
  lines.push(`export const ${key} = {`);
  for (const name of Object.keys(c.variables)) {
    lines.push(`  ${tsKey(name)}: 'var(${cssVar(name)})',`);
  }
  lines.push('} as const;');
  lines.push('');
}

const names = collections.map((c) => c.collection.toLowerCase());
lines.push(`export const tokens = { ${names.join(', ')} } as const;`);
lines.push('');
lines.push(`export type TokenTier = keyof typeof tokens;`);
for (const c of collections) {
  const key = c.collection.toLowerCase();
  const type = c.collection;
  lines.push(`export type ${type}Token = keyof typeof ${key};`);
}
lines.push('');
lines.push(
  `export type Theme = ${collections
    .find((c) => c.collection === 'Semantic')
    .modes.map((m) => `'${m.toLowerCase()}'`)
    .join(' | ')};`,
);
lines.push(
  `export type Breakpoint = ${collections
    .find((c) => c.collection === 'Breakpoint')
    .modes.map((m) => `'${m.toLowerCase()}'`)
    .join(' | ')};`,
);
lines.push('');

// Raw per-mode values, for docs and contrast tooling only.
const values = {};
for (const c of collections) {
  for (const [name, token] of Object.entries(c.variables))
    values[name] = token.values;
}
lines.push(
  '/** Raw per-mode values. Prefer the `var()` references above in components. */',
);
lines.push(
  `export const tokenValues = ${JSON.stringify(values, null, 2)} as const;`,
);
lines.push('');

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.ts'), lines.join('\n'));

const count = Object.keys(values).length;
console.log(
  `TS: ${count} token references + raw values -> src/generated/index.ts`,
);
