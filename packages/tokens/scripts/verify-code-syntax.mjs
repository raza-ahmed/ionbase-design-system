/**
 * The Figma<->code contract check.
 *
 * Every Figma variable carries a `codeSyntax.WEB` string that designers see in
 * Dev Mode. That string is a promise about what the CSS variable is called. This
 * asserts we keep it: the name we generate must equal the name Figma advertises.
 *
 * Known-bad entries live in `known-defects.json` rather than being skipped
 * silently. They fail loudly once fixed in Figma, which is the point — a defect
 * that quietly stays green is a defect nobody removes.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const defects = JSON.parse(
  readFileSync(join(here, '..', 'known-defects.json'), 'utf8'),
);
const excused = new Map(defects.codeSyntax.map((d) => [d.variable, d]));

const expectedVar = (name) => `var(--${name.replace(/\//g, '-')})`;

const collections = loadCollections();
const unexpected = [];
const stale = [];
const duplicates = new Map();
let checked = 0;

for (const c of collections) {
  for (const [name, token] of Object.entries(c.variables)) {
    checked++;
    const expected = expectedVar(name);
    const actual = token.codeSyntax;

    // Track collisions on the *advertised* name — two variables claiming one
    // CSS custom property is the failure mode that actually loses data.
    duplicates.set(actual, [...(duplicates.get(actual) ?? []), name]);

    if (actual === expected) {
      if (excused.has(name)) stale.push({ name, defect: excused.get(name).id });
      continue;
    }
    if (excused.has(name)) continue;
    unexpected.push({ collection: c.collection, name, expected, actual });
  }
}

const collided = [...duplicates.entries()].filter(
  ([, names]) => names.length > 1,
);

let failed = false;

if (unexpected.length) {
  failed = true;
  console.error(
    `\n${unexpected.length} variable(s) have codeSyntax that does not match their path:`,
  );
  for (const u of unexpected) {
    console.error(
      `  [${u.collection}] ${u.name}\n    expected ${u.expected}\n    figma has ${u.actual}`,
    );
  }
  console.error('\nFix in Figma, or add to known-defects.json with a reason.');
}

if (stale.length) {
  failed = true;
  console.error(
    `\n${stale.length} known defect(s) are now fixed in Figma — remove them from known-defects.json:`,
  );
  for (const s of stale) console.error(`  ${s.name} (${s.defect})`);
}

if (collided.length) {
  console.warn(
    `\n${collided.length} CSS variable name(s) claimed by more than one Figma variable:`,
  );
  for (const [varName, names] of collided) {
    console.warn(`  ${varName}  <-  ${names.join(', ')}`);
  }
  console.warn(
    '  Generation uses the token path, so no value is lost — but Dev Mode shows the wrong name.',
  );
}

if (failed) process.exit(1);

console.log(
  `codeSyntax: ${checked} variables checked, ${checked - excused.size} exact match, ${excused.size} known defects pending fix in Figma`,
);
