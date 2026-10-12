#!/usr/bin/env node
/**
 * Phase 4a — the tier between components and screens.
 *
 * A pattern here is a DOCUMENTED COMPOSITION, not a new component: Brad Frost's
 * distinction, and the reason nothing in patterns/ is a package export or has
 * tokens of its own. The worked examples in patterns/examples/ are TSX, but
 * they ship as text: documentation that happens to compile. The `control/<size>/*` deletion recorded in AGENTS.md is the
 * precedent — a tier that grows its own tokens stops being a composition of the
 * tier below it and starts being a fork of it.
 *
 * What patterns carry that component contracts cannot: the EMPTY, LOADING and
 * ERROR states. Those belong to no single component — Table has no empty state,
 * and correctly so — which is exactly why an agent omits them. A prop type never
 * mentions them and no type check misses them.
 *
 * Everything here is verified against dist/meta/components.json. A recipe that
 * names a component, prop or variant value that does not exist fails the build,
 * so these files cannot rot quietly the way a docs page does.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
  copyFileSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG, 'patterns');
const EXAMPLES = join(SRC, 'examples');
const OUT = join(PKG, 'dist', 'meta', 'patterns');
const DOC = join(PKG, 'dist', 'meta', 'components.json');

if (!existsSync(DOC)) {
  console.error(
    'No dist/meta/components.json — run scripts/build-meta.mjs first.',
  );
  process.exit(1);
}

const doc = JSON.parse(readFileSync(DOC, 'utf8'));
const components = doc.components;
const hooks = doc.hooks ?? [];
const version = JSON.parse(
  readFileSync(join(PKG, 'package.json'), 'utf8'),
).version;

/* Every state a pattern must answer for. Not a style rule: these are the three
 * an agent leaves out, and a recipe that omits one is the failure this tier
 * exists to prevent. */
const REQUIRED_STATES = ['loading', 'empty', 'error'];

/* Layout and the icon wrapper: every example uses them, and a pattern that
 * listed them would be listing the page, not its composition. */
const LAYOUT = new Set(['Stack', 'Grid', 'Icon']);

const errors = [];
const err = (p, m) => errors.push(`${p}: ${m}`);

const patterns = {};

for (const file of readdirSync(SRC)
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const name = file.replace(/\.json$/, '');
  const p = JSON.parse(readFileSync(join(SRC, file), 'utf8'));

  if (components[name])
    err(
      name,
      `shares a name with an exported component — patterns are compositions, not components`,
    );

  if (!p.summary) err(name, 'no summary');

  /* 1. Everything it composes must exist. */
  const composes = p.composes ?? [];
  if (!composes.length)
    err(name, '"composes" is empty — a pattern with no components is prose');
  for (const c of composes)
    if (!components[c])
      err(name, `composes "${c}", which is not an exported component`);

  /* 1b. A pattern whose states ship as code names the hook, and it must exist.
   * Without this, a renamed hook leaves the recipe pointing at nothing. */
  if (p.drivenBy) {
    if (!hooks.includes(p.drivenBy.hook))
      err(
        name,
        `drivenBy names "${p.drivenBy.hook}", which is not an exported hook`,
      );
    if (!p.drivenBy.note)
      err(
        name,
        'drivenBy has no note — say what the hook owns and what it does not',
      );
  }

  /* 2. Every prop it names must be real, on a component it actually composes. */
  for (const [comp, props] of Object.entries(p.propsUsed ?? {})) {
    if (!components[comp]) {
      err(
        name,
        `propsUsed names "${comp}", which is not an exported component`,
      );
      continue;
    }
    if (!composes.includes(comp))
      err(name, `propsUsed names "${comp}", which is absent from "composes"`);
    for (const prop of props)
      if (!components[comp].props?.[prop])
        err(
          name,
          `propsUsed."${comp}" names "${prop}", which is not a prop of ${comp}`,
        );
  }

  /* 3. Every variant value it names must be in the real union. */
  for (const [comp, axes] of Object.entries(p.variantsUsed ?? {})) {
    if (!components[comp]) {
      err(
        name,
        `variantsUsed names "${comp}", which is not an exported component`,
      );
      continue;
    }
    for (const [axis, values] of Object.entries(axes)) {
      const prop = components[comp].props?.[axis];
      if (!prop) {
        err(name, `variantsUsed."${comp}"."${axis}" is not a prop of ${comp}`);
        continue;
      }
      if (!prop.values) {
        err(
          name,
          `variantsUsed."${comp}"."${axis}" is not a string-literal union`,
        );
        continue;
      }
      for (const v of values)
        if (!prop.values.includes(v))
          err(
            name,
            `variantsUsed."${comp}"."${axis}" names "${v}", not in [${prop.values.join(', ')}]`,
          );
    }
  }

  /* 4. The three states, each actually answered. */
  for (const s of REQUIRED_STATES) {
    const state = p.states?.[s];
    if (!state) {
      err(name, `no "${s}" state — the three states are why this tier exists`);
      continue;
    }
    if (!state.must) err(name, `states."${s}" has no "must"`);
    if (!state.why)
      err(
        name,
        `states."${s}" has no "why" — a rule with no reason gets ignored`,
      );
  }

  /* 5. A pattern that points at another pattern must point at a real one. */
  for (const a of p.antiPatterns ?? []) {
    if (!a.do) continue;
    const m = a.do.match(/the (\w+) pattern/);
    if (m && !existsSync(join(SRC, `${m[1]}.json`)))
      err(
        name,
        `antiPatterns points at "the ${m[1]} pattern", which does not exist`,
      );
  }

  /* 6. A worked example, where there is one: patterns/examples/<Name>.tsx.
   * `tsc -p patterns/examples` has already type-checked it against the
   * published types, and ESLint holds it to the consumer rule set. Here: it
   * imports nothing an app might not have, and it composes what the pattern
   * says it does. An example using a component the pattern never names
   * teaches a composition the pattern does not document. */
  const exampleFile = join(EXAMPLES, `${name}.tsx`);
  let example;
  if (existsSync(exampleFile)) {
    const source = readFileSync(exampleFile, 'utf8');
    for (const [, from] of source.matchAll(/^import [^;]*? from '([^']+)';/gms))
      if (from !== 'react' && from !== 'ionbase-ui')
        err(
          name,
          `example imports "${from}" — an example may import only react and ionbase-ui, or it does not compile in an app without that package`,
        );
    const named = source.match(/^import \{([^}]*)\} from 'ionbase-ui';/m)?.[1];
    if (!named) err(name, 'example does not import from ionbase-ui');
    for (const raw of (named ?? '').split(',')) {
      const id = raw.trim();
      if (!id || id.startsWith('type ')) continue;
      if (hooks.includes(id)) continue;
      if (!components[id]) {
        err(
          name,
          `example imports "${id}", which is not an exported component or hook`,
        );
        continue;
      }
      if (!LAYOUT.has(id) && !composes.includes(id))
        err(name, `example uses ${id}, which is absent from "composes"`);
    }
    example = { file: `dist/meta/patterns/examples/${name}.tsx`, source };
  }

  patterns[name] = { name, ...p, ...(example ? { example } : {}) };
}

if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\nPatterns: ${errors.length} errors`);
  process.exit(1);
}

/* ------------------------------------------------------------------ write */

/* An example with no pattern of that name is documentation nobody can find. */
if (existsSync(EXAMPLES))
  for (const f of readdirSync(EXAMPLES).filter((f) => f.endsWith('.tsx')))
    if (!patterns[f.replace(/\.tsx$/, '')] && !errors.length)
      errors.push(`examples/${f}: no pattern of that name`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\nPatterns: ${errors.length} errors`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'examples'), { recursive: true });
for (const [name, p] of Object.entries(patterns))
  if (p.example)
    copyFileSync(
      join(EXAMPLES, `${name}.tsx`),
      join(OUT, 'examples', `${name}.tsx`),
    );
for (const [name, p] of Object.entries(patterns))
  writeFileSync(join(OUT, `${name}.json`), `${JSON.stringify(p, null, 2)}\n`);

const index = {
  package: 'ionbase-ui',
  version,
  usage:
    'A pattern is a documented composition of components, not a component. ' +
    'Read one here, then read the contracts of what it composes.',
  patterns: Object.fromEntries(
    Object.entries(patterns).map(([name, p]) => [
      name,
      {
        summary: p.summary,
        composes: p.composes,
        ...(p.drivenBy ? { drivenBy: p.drivenBy.hook } : {}),
        states: Object.keys(p.states ?? {}),
        detail: `dist/meta/patterns/${name}.json`,
        ...(p.example ? { example: p.example.file } : {}),
      },
    ]),
  ),
};
writeFileSync(join(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

const names = Object.keys(patterns);
console.log(
  `Patterns: ${names.length} -> dist/meta/patterns/ — ` +
    `${names.length * REQUIRED_STATES.length} required states present, 0 errors`,
);
