/**
 * The alias chain is the architecture. This checks it holds.
 *
 *   Interface  -> Semantics  -> Primitives
 *   Breakpoint -> Primitives
 *   Primitives -> nothing
 *
 * Four failures, each of which has actually happened in this file:
 *
 *   WRONG TIER      An Interface token aliasing a primitive cannot be
 *                   re-branded; a component binding Semantics cannot be
 *                   re-themed. Both look fine the day they are made.
 *   DANGLING ALIAS  Deleting a variable leaves aliases pointing at it, exactly
 *                   as it leaves node bindings pointing at it. Removing
 *                   `gray/850` left `surface/sunken` [Dark] dangling.
 *   CSS COLLISION   Two tokens whose paths produce one custom property. Twelve
 *                   of these existed when Primitives still held role names like
 *                   `radius/full` alongside the Semantics token of the same
 *                   name — one silently overwrote the other in the CSS build.
 *   RAW VALUE       A Semantics or Interface token holding a literal instead of
 *                   an alias. That is a value escaping the tier it belongs to.
 *
 * This replaces the v1 check of the same name, which enforced "no colour in the
 * Component tier". There is no Component tier now.
 */
import { loadCollections } from './figma-to-dtcg.mjs';

const CHAIN = {
  Interface: 'Semantics',
  Semantics: 'Primitives',
  Breakpoint: 'Primitives',
};
const REQUIRED = ['Primitives', 'Semantics', 'Interface', 'Breakpoint'];

const collections = loadCollections();
const byName = new Map(collections.map((c) => [c.collection, c]));

const missing = REQUIRED.filter((n) => !byName.has(n));
if (missing.length) {
  console.error(`\nMissing collection(s): ${missing.join(', ')}`);
  console.error('Expected Primitives, Semantics, Interface, Breakpoint.');
  console.error(
    'If a collection was renamed in Figma, update scripts/verify-tier.mjs.',
  );
  process.exit(1);
}

/** Which collection owns a given token name. A name can exist in more than one
 *  collection, so resolve toward the tier the reference is allowed to reach. */
function owner(name, referrer) {
  const below = CHAIN[referrer];
  if (below && byName.get(below).variables[name]) return below;
  for (const c of collections) if (c.variables[name]) return c.collection;
  return null;
}

const wrongTier = [];
const dangling = [];
const rawValue = [];

for (const c of collections) {
  for (const [name, token] of Object.entries(c.variables)) {
    for (const [mode, value] of Object.entries(token.values)) {
      const isAlias = typeof value === 'string' && value.startsWith('{');

      if (!isAlias) {
        // Primitives are literals by definition; Breakpoint holds real numbers
        // for grid and spacing alongside its aliased type ramp.
        if (c.collection === 'Semantics' || c.collection === 'Interface') {
          rawValue.push(
            `${c.collection}/${name} [${mode}] = ${JSON.stringify(value)}`,
          );
        }
        continue;
      }

      const target = value.slice(1, -1).split('.').join('/');
      const tier = owner(target, c.collection);

      if (tier === null) {
        dangling.push(`${c.collection}/${name} [${mode}] -> ${target}`);
      } else if (c.collection === 'Primitives') {
        wrongTier.push(
          `Primitives/${name} aliases ${tier}/${target} — primitives hold values, not references`,
        );
      } else if (tier !== CHAIN[c.collection]) {
        wrongTier.push(
          `${c.collection}/${name} [${mode}] -> ${tier}/${target}, must be ${CHAIN[c.collection]}`,
        );
      }
    }
  }
}

/** Two tokens producing one CSS custom property. */
const cssNames = new Map();
for (const c of collections) {
  for (const name of Object.keys(c.variables)) {
    const css = '--' + name.split('/').join('-');
    if (!cssNames.has(css)) cssNames.set(css, []);
    cssNames.get(css).push(`${c.collection}/${name}`);
  }
}
const collisions = [...cssNames].filter(([, owners]) => owners.length > 1);

const fail = (label, rows, advice) => {
  if (!rows.length) return 0;
  console.error(`\n${label} — ${rows.length}\n${'='.repeat(60)}`);
  for (const r of rows) console.error(`  ${r}`);
  if (advice) console.error(`\n${advice}`);
  return rows.length;
};

let bad = 0;
bad += fail(
  'WRONG TIER',
  wrongTier,
  'Interface may only alias Semantics; Semantics may only alias Primitives.',
);
bad += fail(
  'DANGLING ALIAS',
  dangling,
  'The target no longer exists. Unbind before deleting — the variable graph needs\n' +
    'the same discipline as the canvas.',
);
bad += fail(
  'RAW VALUE',
  rawValue,
  'Semantics and Interface hold aliases, never literals.',
);
bad += fail(
  'CSS COLLISION',
  collisions.map(([css, owners]) => `${css}  <-  ${owners.join(', ')}`),
  'Two tokens claim one custom property; the CSS build silently drops one.\n' +
    'Usually means a primitive is carrying a role name.',
);

if (bad) process.exit(1);

const total = collections.reduce(
  (n, c) => n + Object.keys(c.variables).length,
  0,
);
console.log(
  `Tier chain: ${total} variables across ${collections.length} collections — ` +
    `Interface -> Semantics -> Primitives intact, no dangling aliases, no CSS collisions`,
);
