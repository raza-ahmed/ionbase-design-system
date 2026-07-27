/**
 * Spec Q3, made mechanical.
 *
 * "Would more than one component use this exact value? -> Semantic."
 *
 * The flowchart in the naming spec is correct but relies on judgement at the
 * moment of writing, and judgement failed: Button and Tabs were each given
 * their own `padding-x` tokens for the identical `spacing/16`. That is how the
 * component tier grew to ~41 tokens per component — a rate that reaches ~4,000
 * at 100 components and makes the Figma variables UI unusable.
 *
 * This fails the build when two components alias the same primitive for the
 * same property. Such a value is shared by definition and belongs in the
 * control scale.
 *
 * Genuine divergences are declared in `shared-value-exceptions.json` with a
 * reason, so an exception is a decision on the record rather than an accident.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { exceptions } = JSON.parse(
  readFileSync(join(here, '..', 'shared-value-exceptions.json'), 'utf8'),
);
const excused = new Set(exceptions.map((e) => e.token));

const component = loadCollections().find((c) => c.collection === 'Component');

const groups = new Map();
for (const [name, token] of Object.entries(component.variables)) {
  if (token.type === 'COLOR') continue; // colour is legitimately per-component
  if (excused.has(name)) continue;
  const owner = name.split('/')[0];
  const property = name.split('/').at(-1);
  const key = `${property}|${token.values.Value}`;
  const entry = groups.get(key) ?? { owners: new Map() };
  entry.owners.set(owner, name);
  groups.set(key, entry);
}

const violations = [];
for (const [key, { owners }] of groups) {
  if (owners.size < 2) continue;
  const [property, value] = key.split('|');
  violations.push({ property, value, tokens: [...owners.values()] });
}

// An exception that no longer diverges is dead weight — flag it too.
const stale = [];
for (const e of exceptions) {
  if (!component.variables[e.token])
    stale.push(`${e.token} (no longer exists)`);
}

if (violations.length) {
  console.error(
    `\nSpec Q3 — ${violations.length} shared value(s) in the component tier:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.property} = ${v.value}`);
    for (const t of v.tokens) console.error(`      ${t}`);
  }
  console.error(
    '\nA value more than one component uses belongs in the control scale\n' +
      '(control/<step>/<property>). Move it there, or declare a deliberate\n' +
      'divergence in shared-value-exceptions.json with a reason.',
  );
}
if (stale.length) {
  console.error(
    `\n${stale.length} stale exception(s) — remove from shared-value-exceptions.json:`,
  );
  for (const s of stale) console.error(`  ${s}`);
}
if (violations.length || stale.length) process.exit(1);

console.log(
  `Shared values: component tier clean (${Object.keys(component.variables).length} tokens, ${exceptions.length} declared exceptions)`,
);
