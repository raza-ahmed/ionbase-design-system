/**
 * Proves the committed export still matches the Figma file.
 *
 * TWO checksums, and the second one is why this file was rewritten.
 *
 *   names   `name|codeSyntax` — catches a rename
 *   values  `name|type|codeSyntax|mode=value` — catches an edited value
 *
 * The name hash is blind to a changed colour BY CONSTRUCTION, and that is not a
 * theoretical hole: someone edited the green ramp in Figma and this script went
 * on reading 944350191 against 384 variables, unchanged and passing, exactly as
 * it would have if nothing had been touched. `color/orange/50` drifted the same
 * way later and nothing here noticed either. Every gate in this package starts
 * from the committed export, so a value that differs in Figma is invisible to
 * all of them at once — the repo builds correct CSS from stale numbers.
 *
 * Run the matching snippet in Figma (`figma/checksum.js`, or --snippet here)
 * and pass both results in:
 *
 *   node scripts/verify-export.mjs --expect <count> <names> <values>
 *
 * The value hash is per collection as well as overall, because when it differs
 * the first question is always "how much moved". The green edit showed as
 * Primitives alone with the other three identical, which is what told us the
 * blast radius was one collection before anything was rebuilt.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCollections } from './figma-to-dtcg.mjs';

/** djb2 over sorted rows — trivial to reproduce identically in Figma. */
function djb2(rows) {
  let h = 5381;
  const joined = [...rows].sort().join('\n');
  for (let i = 0; i < joined.length; i++)
    h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;
  return h;
}

export function checksum(collections) {
  const rows = collections.flatMap((c) =>
    Object.entries(c.variables).map(
      ([name, t]) => `${name}|${t.codeSyntax ?? ''}`,
    ),
  );
  return { count: rows.length, checksum: djb2(rows) };
}

/**
 * One row per variable, carrying every mode's value.
 *
 * The mode is in the row rather than the row order, so a mode renamed in Figma
 * moves the hash — which is correct, since `verify-modes.mjs` addresses modes
 * by the names "Light" and "Dark" and would break on a rename it never saw.
 * Values are read back exactly as `figma/export-variables.js` wrote them
 * (`#rrggbb[aa]` for colour, dotted `{a.b.c}` for an alias), so the two sides
 * agree without either needing to re-derive the other's formatting.
 */
function valueRows(c) {
  return Object.entries(c.variables).map(([name, t]) => {
    const modes = Object.entries(t.values)
      .map(([mode, v]) => `${mode}=${v}`)
      .sort()
      .join(';');
    return `${name}|${t.type ?? ''}|${t.codeSyntax ?? ''}|${modes}`;
  });
}

export function valueChecksum(collections) {
  const perCollection = {};
  for (const c of collections) perCollection[c.collection] = djb2(valueRows(c));
  return {
    values: djb2(collections.flatMap(valueRows)),
    perCollection,
  };
}

const SNIPPET = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'figma', 'checksum.js'),
  'utf8',
);

const args = process.argv.slice(2);
const collections = loadCollections();
const local = checksum(collections);
const localValues = valueChecksum(collections);

const perCollectionLines = () =>
  Object.entries(localValues.perCollection)
    .map(([name, h]) => `          ${name.padEnd(11)} ${h}`)
    .join('\n');

if (args[0] === '--snippet') {
  console.log('Run this in the Figma file via use_figma:\n');
  console.log(SNIPPET);
  process.exit(0);
}

if (args[0] === '--expect') {
  const [, count, sum, values] = args;

  // Refusing the two-argument form on purpose. It compared names only, so it
  // passed through the exact drift this script now exists to catch, and a
  // command that reports MATCH while blind to values is worse than no command.
  if (values === undefined) {
    console.error(
      '\n--expect now takes three arguments: <count> <names> <values>.\n' +
        'The name-only form could not see an edited colour. Re-run\n' +
        'figma/checksum.js in Figma — it returns both hashes.',
    );
    process.exit(1);
  }

  const ok =
    Number(count) === local.count &&
    Number(sum) === local.checksum &&
    Number(values) === localValues.values;
  console.log(
    `local:  ${local.count} variables, names ${local.checksum}, values ${localValues.values}`,
  );
  console.log(`figma:  ${count} variables, names ${sum}, values ${values}`);
  if (ok) {
    console.log('\nMATCH — export is in sync with Figma, names and values.');
    process.exit(0);
  }
  if (Number(values) !== localValues.values) {
    console.log(
      `\nlocal per collection:\n${perCollectionLines()}\n\n` +
        'Compare against the perCollection block the Figma snippet returned.\n' +
        'The ones that match are collections nothing touched.',
    );
  }
  console.log('\nMISMATCH — re-export before building.');
  process.exit(1);
}

console.log(
  `local: ${local.count} variables, names ${local.checksum}, values ${localValues.values}`,
);
console.log(`\nper collection (values):\n${perCollectionLines()}`);
console.log(
  '\nPass --expect <count> <names> <values> to compare against Figma,\n' +
    'or --snippet for the Figma-side code.',
);
