/**
 * The Component tier holds geometry. Nothing else.
 *
 * This is the gate for spec section 6, Rule 06 — the rule that decides whether
 * this system is manageable at 100 components or not.
 *
 * WHY COLOUR CANNOT LIVE HERE
 *
 * Two rules the spec already states, taken together, leave no room for a
 * component colour token:
 *
 *   1. "Never skip a tier for colour" (section 14). A component colour token
 *      must alias a semantic token — it may not reach past it to a primitive
 *      or hold a literal.
 *   2. "Don't create a token you use once" (Rule 07). A token that only
 *      forwards another token adds a name, not a value.
 *
 * A component colour token can therefore only ever be a 1:1 forward, which
 * Rule 07 forbids. Bind the semantic token directly instead — in Figma and in
 * CSS. There is no legal exception, which is why this check takes none.
 *
 * That layer was 70 of 89 tokens (79% of the tier) and bought nothing except
 * the desyncs: `badge/neutral/border` existed while Figma bound
 * `border/neutral/default` straight past it, and `tabs/underline/item/*` moved
 * in code while Figma stayed on `radius/8`. One less indirection is one less
 * thing that can disagree.
 *
 * GEOMETRY IS DIFFERENT, and that is not an inconsistency. A geometry token
 * can hold a value nothing else offers — Tabs' 20px icon where the control
 * scale says 24. It earns its place by diverging. Colour never diverges,
 * because its value is always some semantic token's value.
 *
 * Existing violations are grandfathered in tier-baseline.json, which only ever
 * shrinks. New ones fail the build.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(
  readFileSync(join(here, '..', 'tier-baseline.json'), 'utf8'),
);
const grandfathered = new Set(baseline.colourTokens);

const component = loadCollections().find((c) => c.collection === 'Component');
const tokens = Object.entries(component.variables);

const errors = [];

// -- Rule 06: no colour in the Component tier -------------------------------
const colour = tokens.filter(([, t]) => t.type === 'COLOR').map(([n]) => n);
const newColour = colour.filter((n) => !grandfathered.has(n));

for (const name of newColour) {
  const target = component.variables[name].values.Value;
  errors.push({
    rule: 'R06',
    name,
    detail: `component colour token forwarding ${target}`,
    fix: `bind ${String(target).replace(/[{}]/g, '').split('.').join('/')} directly in Figma and in CSS, and create nothing`,
  });
}

// -- The ratchet: a baseline entry that no longer violates is dead weight ----
const stale = [...grandfathered].filter(
  (n) => !component.variables[n] || component.variables[n].type !== 'COLOR',
);

// -- Budget: geometry per component -----------------------------------------
const perComponent = new Map();
for (const [name, token] of tokens) {
  if (token.type === 'COLOR') continue;
  const root = name.split('/')[0];
  perComponent.set(root, (perComponent.get(root) || 0) + 1);
}

const overBudget = [];
for (const [root, count] of perComponent) {
  const allowed = baseline.budgetExceptions[root]?.actual ?? baseline.budget;
  if (count > allowed) overBudget.push({ root, count, allowed });
}

// A budget exception that has been earned back must be removed, same ratchet.
const staleBudget = Object.entries(baseline.budgetExceptions)
  .filter(([root, e]) => (perComponent.get(root) ?? 0) < e.actual)
  .map(([root, e]) => ({
    root,
    was: e.actual,
    now: perComponent.get(root) ?? 0,
  }));

// -- Report ------------------------------------------------------------------
if (errors.length) {
  console.error(
    `\nRule 06 — ${errors.length} token(s) put colour in the Component tier:\n`,
  );
  for (const e of errors) {
    console.error(`  ${e.name}`);
    console.error(`      ${e.detail}`);
    console.error(`      -> ${e.fix}`);
  }
  console.error(
    '\nThe Component tier is geometry-only. A colour token here can only forward\n' +
      'a semantic token, which Rule 07 forbids. There is no exceptions file for\n' +
      'this one on purpose.',
  );
}

if (stale.length) {
  console.error(
    `\n${stale.length} stale entr(ies) in tier-baseline.json — the token is gone or is no longer colour. Remove:`,
  );
  for (const s of stale) console.error(`  ${s}`);
}

if (overBudget.length) {
  console.error(`\nBudget — ${overBudget.length} component(s) over:\n`);
  for (const o of overBudget) {
    console.error(
      `  ${o.root}: ${o.count} geometry tokens, budget ${o.allowed}`,
    );
  }
  console.error(
    '\nMove the shared ones into the control scale, or record the overage in\n' +
      'tier-baseline.json under budgetExceptions with a reason.',
  );
}

if (staleBudget.length) {
  console.error(
    `\nBudget exception(s) no longer needed — remove from tier-baseline.json:`,
  );
  for (const s of staleBudget) {
    console.error(`  ${s.root}: recorded ${s.was}, now ${s.now}`);
  }
}

if (errors.length || stale.length || overBudget.length || staleBudget.length) {
  process.exit(1);
}

const geometry = tokens.length - colour.length;
console.log(
  `Tier: ${geometry} geometry tokens across ${perComponent.size} components, ` +
    `${colour.length} colour token(s) grandfathered and shrinking, budget ${baseline.budget}`,
);
