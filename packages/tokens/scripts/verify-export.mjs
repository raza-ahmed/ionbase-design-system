/**
 * Proves the committed export still matches the Figma file.
 *
 * Compares a checksum over every `name|codeSyntax` pair. Run the matching
 * snippet in Figma (printed below with --snippet) and pass the result in:
 *
 *   node scripts/verify-export.mjs --expect <count> <checksum>
 *
 * Cheap enough to run on every export, and it catches the failure mode that
 * matters: someone renames a variable in Figma and the repo silently keeps
 * generating CSS from the old name.
 */
import { loadCollections } from './figma-to-dtcg.mjs';

export function checksum(collections) {
  const rows = collections
    .flatMap((c) =>
      Object.entries(c.variables).map(
        ([name, t]) => `${name}|${t.codeSyntax ?? ''}`,
      ),
    )
    .sort();
  let h = 5381;
  const joined = rows.join('\n');
  for (let i = 0; i < joined.length; i++)
    h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;
  return { count: rows.length, checksum: h };
}

const SNIPPET = `
const all = await figma.variables.getLocalVariablesAsync();
const rows = all.map(v => \`\${v.name}|\${(v.codeSyntax && v.codeSyntax.WEB) || ''}\`).sort();
let h = 5381;
const joined = rows.join('\\n');
for (let i = 0; i < joined.length; i++) h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;
return { count: all.length, checksum: h };
`.trim();

const args = process.argv.slice(2);
const local = checksum(loadCollections());

if (args[0] === '--snippet') {
  console.log('Run this in the Figma file via use_figma:\n');
  console.log(SNIPPET);
  process.exit(0);
}

if (args[0] === '--expect') {
  const [, count, sum] = args;
  const ok = Number(count) === local.count && Number(sum) === local.checksum;
  console.log(`local:  ${local.count} variables, checksum ${local.checksum}`);
  console.log(`figma:  ${count} variables, checksum ${sum}`);
  console.log(
    ok
      ? '\nMATCH — export is in sync with Figma.'
      : '\nMISMATCH — re-export before building.',
  );
  process.exit(ok ? 0 : 1);
}

console.log(`local: ${local.count} variables, checksum ${local.checksum}`);
console.log(
  'Pass --expect <count> <checksum> to compare against Figma, or --snippet for the Figma-side code.',
);
