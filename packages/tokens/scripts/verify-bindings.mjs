/**
 * Does Figma bind what the repo says exists, and at the right tier?
 *
 * Every other check reads the variable export, which answers "what exists".
 * This one reads `src/figma/bindings.json` — what the components actually BIND.
 * The gap between those two questions is where the expensive defects live.
 *
 * WHAT IT CATCHES
 *
 *   GHOST         A binding to a variable that is in no collection. Deleting a
 *                 variable does not unbind it: Figma keeps resolving it, the
 *                 component renders correctly, and an export that reads only
 *                 live variables reconciles perfectly. Never grandfathered.
 *
 *   WRONG TIER    A component binding a primitive for something other than the
 *                 two sanctioned cases below. A component bound to Semantics
 *                 for colour cannot be re-themed; one bound to Primitives
 *                 cannot be re-branded.
 *
 *   STALE         A snapshot older than the variable export it is checked
 *                 against is not evidence of anything.
 *
 * THE SANCTIONED PRIMITIVE BINDINGS
 *
 *   spacing/*   Components bind these directly. A 16px gap means 16px in every
 *               brand, so routing it through Semantics would add a layer that
 *               never varies. This is stated in the architecture doc, not an
 *               oversight.
 *
 *   color/*, on `Avatar/Avatar Gradient` ONLY. Its disc is built from the raw
 *               hue ramp on purpose: the gradient does not theme, so a semantic
 *               foreground over it would flip in dark mode and leave the
 *               background alone. An earlier draft did exactly that and the
 *               contrast gate caught it at 1.05:1. The reasoning is written at
 *               the point of the declaration in `avatar-gradient.css` under
 *               "NOT AN OVERSIGHT", and the exemption is scoped to that one
 *               component so nothing else inherits it.
 *
 * Anything else from Primitives is a real defect.
 *
 * `font/*` WAS SANCTIONED AND NO LONGER IS. The carve-out existed because text
 * styles used to bind primitives, so flagging font here would have failed the
 * build for something no component author could fix. The 2026-08-03 entry in
 * naming-decisions.md repaired that — every text style now binds the Semantics
 * aliases — but the carve-out outlived its reason and went on hiding the case
 * it was never meant to cover: a text NODE with no style, binding
 * `font/weight/600` straight from Primitives. `Full Card` and `Badge` were
 * doing exactly that. Both now carry text styles instead.
 *
 * A carve-out is only as good as the reason written next to it. When the reason
 * is repaired, the carve-out is the next defect.
 *
 * WHY THE SNAPSHOT CAN LIE. `figma/export-bindings.js` must set the current
 * page, walk `.children`, and reveal hidden instances before reading. Skipping
 * any of the three once reported 407 live bindings as zero — and a collection
 * was deleted on the strength of that. If this check ever passes suspiciously
 * easily, re-read the exporter before trusting it.
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
const known = new Map(); // token name -> owning collection
for (const c of collections) {
  for (const name of Object.keys(c.variables)) {
    if (!known.has(name)) known.set(name, new Set());
    known.get(name).add(c.collection);
  }
}

/** Primitive families ANY component may bind directly. */
const ALLOWED_PRIMITIVE = /^spacing\//;

/**
 * Per-component exemptions, each earned and each documented at the point of the
 * declaration in the component's own stylesheet. Deliberately not a family-wide
 * allowance: `color/*` from Primitives is a defect everywhere else.
 */
const COMPONENT_EXEMPT = {
  'Avatar/Avatar Gradient': /^color\//,
};

const ghosts = [];
const wrongTier = [];
const mismatched = [];
let rows = 0;

for (const [component, bindings] of Object.entries(snapshot.components)) {
  for (const { collection, token } of bindings) {
    rows++;
    const owners = known.get(token);

    if (!owners) {
      ghosts.push(`${component} :: ${token} (${collection})`);
      continue;
    }
    // The snapshot records which collection Figma resolved it from; if the
    // export disagrees, one of the two is stale.
    if (!owners.has(collection)) {
      mismatched.push(
        `${component} :: ${token} — snapshot says ${collection}, export says ${[...owners].join('/')}`,
      );
      continue;
    }
    const exempt = COMPONENT_EXEMPT[component];
    if (
      collection === 'Primitives' &&
      !ALLOWED_PRIMITIVE.test(token) &&
      !(exempt && exempt.test(token))
    ) {
      wrongTier.push(
        `${component} :: ${token} — components bind Interface, Semantics or Breakpoint`,
      );
    }
  }
}

const fail = (label, list, advice) => {
  if (!list.length) return 0;
  console.error(`\n${label} — ${list.length}\n${'='.repeat(60)}`);
  for (const l of list) console.error(`  ${l}`);
  if (advice) console.error(`\n${advice}`);
  return list.length;
};

let bad = 0;
bad += fail(
  'GHOST BINDINGS',
  ghosts,
  'A deleted variable is still driving the design. Rebind those nodes, or clear\n' +
    'the binding. Deleting the variable did not unbind it.',
);
bad += fail(
  'WRONG TIER',
  wrongTier,
  'Only spacing/* may be bound from Primitives by any component, plus the\n' +
    'per-component exemptions listed in COMPONENT_EXEMPT — see the header.',
);
bad += fail(
  'SNAPSHOT DISAGREES WITH EXPORT',
  mismatched,
  'One of the two is stale. Re-run figma/export-bindings.js and the variable\n' +
    'export together, from the same state of the file.',
);

if (bad) process.exit(1);

const components = Object.keys(snapshot.components).length;
const defined = collections.reduce(
  (n, c) => n + Object.keys(c.variables).length,
  0,
);
const bound = new Set();
for (const b of Object.values(snapshot.components))
  for (const { token } of b) bound.add(token);

console.log(
  `Bindings: ${rows} across ${components} components — no ghosts, no tier violations ` +
    `(snapshot ${snapshot.exported})`,
);
console.log(
  `          ${bound.size} of ${defined} variables are bound by a component; ` +
    `the rest are ramp steps and roles held in reserve`,
);
