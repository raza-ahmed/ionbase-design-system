/**
 * Every geometry value a component uses must come from the spacing scale.
 *
 * This is the check that replaces the `control/*` group.
 *
 * WHY THE GROUP WENT
 *
 * `control/<size>/{size,padding-x,gap,icon-size}` was twelve names over zero
 * new values — every one an alias of a spacing primitive, and three of them
 * exact duplicates of the `icon-size` ladder. It was bound by 3 of 26
 * components, because it had been reverse-engineered from Button's own
 * measurements and nothing whose numbers differed could use it. Input's medium
 * padding is 12; `control/md/padding-x` is 16; so Input bypassed it, as 23
 * other components already had.
 *
 * The group was sold as "one place to re-scale controls per brand". It never
 * was. Changing `control/md/padding-x` moved Button and Tabs and left Input,
 * Select, Menu Item, Nav Item and Table Cell where they were — a break, not a
 * re-scale.
 *
 * WHAT ACTUALLY NEEDED GUARDING
 *
 * The real invariant was never "every control shares a padding token". It is:
 *
 *   1. no geometry value is a hard-coded number nobody can see
 *   2. every geometry value sits on the shared scale
 *
 * Neither was enforced, which is how Input shipped a literal 10px — off a scale
 * that runs 8, 12, 16, 20 — and how both Input and Select shipped with every
 * stroke weight unbound. A token group cannot catch either. This can.
 *
 * It is also flat in component count: one rule, checked per binding, whether
 * there are 26 components or 1,000.
 *
 * WHAT IT CANNOT SEE
 *
 * `bindings.json` records what IS bound. A raw number is the absence of a
 * binding, so it leaves no trace here — it can only be caught in Figma, where
 * `figma/audit-geometry.js` reports unbound padding, gap, size and stroke
 * weight on component nodes. Run that after any component edit; this check
 * guards the half that reaches the repo.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(
  readFileSync(join(here, '..', 'src', 'figma', 'bindings.json'), 'utf8'),
);

const collections = loadCollections();
const owner = new Map();
for (const c of collections) {
  for (const name of Object.keys(c.variables)) {
    if (!owner.has(name)) owner.set(name, c.collection);
  }
}

/**
 * Ladders a component may pick a geometry rung from.
 *
 * `spacing/*` is the scale itself. The rest are Semantics ladders — indexed by
 * value, not by usage, so they do not grow as components are added. A group
 * indexed by usage (`control/md/padding-x`) is what this list deliberately
 * excludes.
 */
const GEOMETRY_LADDERS = [
  /^spacing\//, // the scale
  /^radius\//,
  /^border-width\//,
  /^icon-size\//,
  /^scale\//, // raw ramp, allowed only where a ladder has no rung
];

/** Token families that are not geometry, so this check ignores them. */
const NOT_GEOMETRY = [
  /^color\//,
  /^font\//,
  /^type\//,
  /^grid\//,
  /^container\//,
  /^section\//,
  /^(text|icon|surface|border|ring)\//,
  /^(primary|neutral|success|warning|error|information|chart|palette|base|alpha)\//,
];

const offScale = [];
let checked = 0;

for (const [component, bindings] of Object.entries(snapshot.components)) {
  for (const { token } of bindings) {
    if (NOT_GEOMETRY.some((re) => re.test(token))) continue;
    checked++;
    if (GEOMETRY_LADDERS.some((re) => re.test(token))) continue;
    offScale.push(
      `${component} :: ${token} (${owner.get(token) ?? 'unknown'})`,
    );
  }
}

if (offScale.length) {
  console.error(
    `\nGEOMETRY OFF THE SCALE — ${offScale.length}\n${'='.repeat(60)}`,
  );
  for (const row of offScale) console.error(`  ${row}`);
  console.error(
    '\nComponents pick geometry from spacing/* or a Semantics ladder\n' +
      '(radius, border-width, icon-size). A new group that prescribes a value\n' +
      'per component size is what the control/* deletion removed — do not\n' +
      'reintroduce one.',
  );
  process.exit(1);
}

const components = Object.keys(snapshot.components).length;
console.log(
  `Geometry: ${checked} geometry bindings across ${components} components — ` +
    `all on spacing/* or a Semantics ladder`,
);
