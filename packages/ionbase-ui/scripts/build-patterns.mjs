#!/usr/bin/env node
/**
 * Phase 4a — the tier between components and screens.
 *
 * A pattern here is a DOCUMENTED COMPOSITION, not a new component: Brad Frost's
 * distinction, and the reason nothing in patterns/ ships React code or tokens of
 * its own. The `control/<size>/*` deletion recorded in AGENTS.md is the
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
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG, 'patterns');
const OUT = join(PKG, 'dist', 'meta', 'patterns');
const DOC = join(PKG, 'dist', 'meta', 'components.json');

if (!existsSync(DOC)) {
  console.error(
    'No dist/meta/components.json — run scripts/build-meta.mjs first.',
  );
  process.exit(1);
}

const components = JSON.parse(readFileSync(DOC, 'utf8')).components;
const version = JSON.parse(
  readFileSync(join(PKG, 'package.json'), 'utf8'),
).version;

/* Every state a pattern must answer for. Not a style rule: these are the three
 * an agent leaves out, and a recipe that omits one is the failure this tier
 * exists to prevent. */
const REQUIRED_STATES = ['loading', 'empty', 'error'];

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

  patterns[name] = { name, ...p };
}

if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\nPatterns: ${errors.length} errors`);
  process.exit(1);
}

/* ------------------------------------------------------------------ write */

mkdirSync(OUT, { recursive: true });
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
        states: Object.keys(p.states ?? {}),
        detail: `dist/meta/patterns/${name}.json`,
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
