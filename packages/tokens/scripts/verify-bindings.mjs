/**
 * Does Figma bind what the repo says exists?
 *
 * Every other check reads the variable export, which answers "what exists".
 * None of them could see what the components actually BIND, and that gap hid
 * the two most expensive defects in the file:
 *
 *   GHOSTS — a variable deleted from a collection stays bound on every node
 *   that used it. Figma keeps resolving it, so the component renders correctly
 *   and the export reconciles perfectly. The Button carried 100+ bindings to
 *   deleted `button/<size>/font-size` variables while all four token checks
 *   were green. A ghost is never grandfathered: it is always a defect, and is
 *   always invisible without this check.
 *
 *   UNBOUND — a component token exists, ships in CSS, and Figma reaches past
 *   it to the semantic or primitive underneath. `tabs/underline/item/radius/
 *   focus` is bound by nothing; change it and the code moves while the design
 *   does not. This is the "agree only by coincidence" failure.
 *
 * Input is src/figma/bindings.json, produced by figma/export-bindings.js. It
 * is a snapshot, so it is only as fresh as its last run — re-export it after
 * any Figma component edit, exactly as with the variable export.
 *
 * Ghost identity is not stable between reads (see the note in bindings.json),
 * so this fails on the PRESENCE of a non-local binding, never on a name.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

const snapshot = read(join(here, '..', 'src', 'figma', 'bindings.json'));
const baseline = read(join(here, '..', 'tier-baseline.json'));
const excusedUnbound = new Set(baseline.unboundInFigma);

const component = loadCollections().find((c) => c.collection === 'Component');

/** Every (component, variable) pair Figma actually binds. */
const bound = new Map(); // variable name -> [component names]
const ghosts = [];
for (const [pageName, page] of Object.entries(snapshot.pages)) {
  for (const [compName, bindings] of Object.entries(page.components)) {
    for (const [variable, info] of Object.entries(bindings)) {
      if (!bound.has(variable)) bound.set(variable, []);
      bound.get(variable).push(compName);
      if (!info.local) {
        ghosts.push({
          page: pageName,
          component: compName,
          variable,
          count: info.count,
        });
      }
    }
  }
}

// -- Which components are covered by the snapshot at all? -------------------
// A component token whose component was never scanned cannot be judged unbound.
const scanned = new Set();
for (const page of Object.values(snapshot.pages)) {
  for (const bindings of Object.values(page.components)) {
    for (const v of Object.keys(bindings)) scanned.add(v.split('/')[0]);
  }
}

const unbound = Object.keys(component.variables).filter(
  (name) =>
    scanned.has(name.split('/')[0]) &&
    !bound.has(name) &&
    !excusedUnbound.has(name),
);

// Ratchet: an excused token that is now bound (or deleted) must leave the list.
const staleExcuse = [...excusedUnbound].filter(
  (name) => !component.variables[name] || bound.has(name),
);

// -- Bound in Figma but dead in code ----------------------------------------
const stylesDir = join(here, '..', '..', 'styles', 'src');
let unusedInCss = [];
if (existsSync(stylesDir)) {
  const css = readdirSync(stylesDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(stylesDir, f), 'utf8'))
    .join('\n')
    // Comments name retired tokens on purpose; they are not usage.
    .replace(/\/\*[\s\S]*?\*\//g, '');
  unusedInCss = Object.keys(component.variables).filter(
    (name) =>
      scanned.has(name.split('/')[0]) &&
      bound.has(name) &&
      !css.includes('--' + name.split('/').join('-')),
  );
}

// -- Report ------------------------------------------------------------------
if (ghosts.length) {
  console.error(
    `\nGHOST BINDINGS — ${ghosts.length}. A deleted variable is still driving the design:\n`,
  );
  for (const g of ghosts) {
    console.error(`  ${g.component} (${g.page})  ->  ${g.variable}`);
    console.error(
      `      ${g.count} node binding(s) to a variable in no collection`,
    );
  }
  console.error(
    '\nRebind those nodes to a live token, or clear the binding so the text style\n' +
      'or explicit value owns the property. Deleting the variable did not unbind it.',
  );
}

if (unbound.length) {
  console.error(
    `\nUNBOUND — ${unbound.length} component token(s) exist but no Figma component binds them:\n`,
  );
  for (const name of unbound) console.error(`  ${name}`);
  console.error(
    '\nEither bind it in Figma, or delete it. A token nothing binds cannot move\n' +
      'the design, and code that reads it agrees with Figma only by coincidence.',
  );
}

if (staleExcuse.length) {
  console.error(
    `\n${staleExcuse.length} stale entr(ies) in tier-baseline.json "unboundInFigma" — now bound or deleted. Remove:`,
  );
  for (const s of staleExcuse) console.error(`  ${s}`);
}

if (unusedInCss.length) {
  console.error(
    `\nBOUND BUT UNUSED — ${unusedInCss.length} token(s) Figma binds that no stylesheet reads:\n`,
  );
  for (const name of unusedInCss) console.error(`  ${name}`);
  console.error(
    '\nThe design moves and the code does not. Consume it or retire it.',
  );
}

if (
  ghosts.length ||
  unbound.length ||
  staleExcuse.length ||
  unusedInCss.length
) {
  process.exit(1);
}

console.log(
  `Bindings: ${bound.size} variables bound across ${scanned.size} scanned component(s), ` +
    `no ghosts, ${excusedUnbound.size} unbound token(s) on the record`,
);
