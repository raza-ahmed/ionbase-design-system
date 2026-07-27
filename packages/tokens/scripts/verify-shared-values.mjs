/**
 * Spec Q3, made mechanical.
 *
 * "Would more than one component use this exact value? -> Semantic."
 *
 * Concretely: a component geometry token must not duplicate a value the control
 * scale already provides for the same property. That is the failure this exists
 * to stop — Button and Tabs were each given their own `padding-x` for the
 * identical `spacing/16`, which is how the component tier reached ~41 tokens
 * per component (~4,000 at 100 components) and how the two silently drifted
 * apart on icon size.
 *
 * It deliberately does NOT flag two components sharing a number by coincidence.
 * A badge's internal gap and a tab track's gap are both 4px and have nothing to
 * do with each other; flagging that would train everyone to ignore the check.
 *
 * Genuine divergences from the control scale go in
 * `shared-value-exceptions.json` with a written reason.
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

const collections = loadCollections();
const component = collections.find((c) => c.collection === 'Component');
const semantic = collections.find((c) => c.collection === 'Semantic');

/** property -> set of values the control scale already offers for it. */
const controlOffers = new Map();
for (const [name, token] of Object.entries(semantic.variables)) {
  if (!name.startsWith('control/')) continue;
  const property = name.split('/').at(-1);
  const value = token.values[semantic.defaultMode];
  if (!controlOffers.has(property)) controlOffers.set(property, new Map());
  controlOffers.get(property).set(value, name);
}

const violations = [];
for (const [name, token] of Object.entries(component.variables)) {
  if (token.type === 'COLOR') continue; // colour is legitimately per-component
  if (excused.has(name)) continue;
  const property = name.split('/').at(-1);
  const value = token.values.Value;
  const match = controlOffers.get(property)?.get(value);
  if (match) violations.push({ name, value, match });
}

// An exception naming a token that no longer exists is dead weight.
const stale = exceptions
  .filter((e) => !component.variables[e.token])
  .map((e) => e.token);

if (violations.length) {
  console.error(
    `\nSpec Q3 — ${violations.length} component token(s) duplicate the control scale:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.name}  =  ${v.value}`);
    console.error(`      already provided by ${v.match}`);
  }
  console.error(
    '\nRead the control token instead and delete this one, or — if the component\n' +
      'genuinely must differ — change the value and record why in\n' +
      'shared-value-exceptions.json.',
  );
}
if (stale.length) {
  console.error(
    `\n${stale.length} stale exception(s) — remove from shared-value-exceptions.json:`,
  );
  for (const s of stale) console.error(`  ${s}`);
}
if (violations.length || stale.length) process.exit(1);

const geometry = Object.values(component.variables).filter(
  (t) => t.type !== 'COLOR',
).length;
console.log(
  `Shared values: ${geometry} component geometry tokens, none duplicating the control scale, ${exceptions.length} declared exceptions`,
);
