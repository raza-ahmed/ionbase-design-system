/**
 * Dry run for renames.json.
 *
 * Applies the rename map to the current export in memory and re-runs the name
 * audit. The map is only safe to push to Figma if this comes back completely
 * clean — otherwise we would be renaming 47 variables into a different set of
 * violations, in a file where the previous names are already gone.
 *
 * Also checks the map itself: stale entries, collisions, unreachable targets.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';
import { auditNames, printFindings } from './audit-names.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(readFileSync(join(here, '..', 'renames.json'), 'utf8'));

const renames = { ...map.primitives, ...map.semantic, ...map.component };
const deletes = new Set(Object.keys(map.delete ?? {}));

const collections = loadCollections();
const existing = new Set(collections.flatMap((c) => Object.keys(c.variables)));

const problems = [];

// Every source name must actually exist, or the map has drifted from the file.
for (const from of Object.keys(renames)) {
  if (!existing.has(from))
    problems.push(`rename source not in export: ${from}`);
}
for (const name of deletes) {
  if (!existing.has(name))
    problems.push(`delete target not in export: ${name}`);
}

// Two variables must not land on one name.
const targets = new Map();
for (const [from, to] of Object.entries(renames)) {
  targets.set(to, [...(targets.get(to) ?? []), from]);
}
for (const [to, froms] of targets) {
  if (froms.length > 1)
    problems.push(
      `${froms.length} variables both rename to ${to}: ${froms.join(', ')}`,
    );
  // Landing on a name that still exists and is not itself being renamed away.
  if (existing.has(to) && !renames[to] && !deletes.has(to)) {
    problems.push(`${froms[0]} renames onto ${to}, which already exists`);
  }
}

// Apply the map to an in-memory copy.
const renamed = collections.map((c) => ({
  ...c,
  variables: Object.fromEntries(
    Object.entries(c.variables)
      .filter(([name]) => !deletes.has(name))
      .map(([name, token]) => [renames[name] ?? name, token]),
  ),
}));

const before = loadCollections().reduce(
  (n, c) => n + Object.keys(c.variables).length,
  0,
);
const after = renamed.reduce((n, c) => n + Object.keys(c.variables).length, 0);
if (after !== before - deletes.size) {
  problems.push(
    `token count changed unexpectedly: ${before} -> ${after} (expected ${before - deletes.size})`,
  );
}

console.log(
  `Rename map: ${Object.keys(renames).length} renames, ${deletes.size} deletions, ` +
    `${before} -> ${after} variables.`,
);

if (problems.length) {
  console.error(`\nMAP PROBLEMS — ${problems.length}\n${'='.repeat(60)}`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('\nPost-rename audit:');
const remaining = printFindings(auditNames(renamed));

if (remaining > 0) {
  console.error(
    '\nMap does not fully resolve the file. Do not apply to Figma.',
  );
  process.exit(1);
}
console.log('\nClean. Safe to apply to Figma.');
