/**
 * Checks the Figma icon page and the installed lucide-react describe the same set.
 *
 * This is the one thing worth automating about icons. The failure it catches is
 * mundane and expensive: a designer picks an icon that exists on the Figma page
 * but not in the version of lucide-react we ship, and nobody finds out until an
 * engineer tries to import it.
 *
 *   node figma/export-icon-names.js          (in Figma, via use_figma)
 *   node scripts/verify-icons.mjs --expect <count> <checksum>
 *
 * Run with no arguments to just print the local side.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** `AArrowDown` -> `a-arrow-down`, matching Lucide's own icon ids. */
function toKebab(pascal) {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const lucide = await import('lucide-react');

/**
 * lucide-react exports icons alongside helpers, aliases and the `Icon` factory.
 * An icon is a component whose name is PascalCase; the `LucideX` aliases and
 * the `XIcon` duplicates are filtered out so both sides count the same things.
 */
const names = Object.keys(lucide)
  .filter((k) => /^[A-Z][A-Za-z0-9]*$/.test(k))
  .filter((k) => !k.startsWith('Lucide'))
  .filter((k) => !k.endsWith('Icon') || k === 'Icon')
  .filter((k) => k !== 'Icon' && k !== 'IconNode' && k !== 'LucideProps');

const ids = [...new Set(names.map(toKebab))].sort();

let h = 5381;
const joined = ids.join('\n');
for (let i = 0; i < joined.length; i++)
  h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;

const version = require('lucide-react/package.json').version;
const args = process.argv.slice(2);

if (args[0] === '--expect') {
  const [, count, sum] = args;
  const figmaCount = Number(count);
  const ok = figmaCount === ids.length && Number(sum) === h;

  console.log(`lucide-react ${version}: ${ids.length} icons, checksum ${h}`);
  console.log(`figma:                   ${figmaCount} icons, checksum ${sum}`);

  if (ok) {
    console.log('\nMATCH — Figma and lucide-react describe the same icon set.');
    process.exit(0);
  }

  // The direction of the gap decides who is at risk, so say which it is rather
  // than just reporting a mismatch.
  const delta = ids.length - figmaCount;
  console.error('\nMISMATCH.');
  if (delta > 0) {
    console.error(
      `  lucide-react has ${delta} icon(s) Figma does not.\n` +
        '  The Figma page predates the installed Lucide release. Engineers can\n' +
        '  import icons that have no counterpart in the design file — designs and\n' +
        '  code will disagree about what exists. Low risk, but re-import the\n' +
        '  Lucide Figma kit when convenient.',
    );
  } else if (delta < 0) {
    console.error(
      `  Figma has ${-delta} icon(s) lucide-react does not.\n` +
        '  This is the dangerous direction: a designer can specify an icon that\n' +
        '  cannot be imported at all. Upgrade lucide-react, or remove them from\n' +
        '  the Figma page.',
    );
  } else {
    console.error(
      '  Same count, different contents — an icon was renamed on one side.',
    );
  }
  process.exit(1);
}

console.log(`lucide-react ${version}: ${ids.length} icons, checksum ${h}`);
console.log(`sample: ${ids.slice(0, 5).join(', ')}`);
console.log(
  '\nPass --expect <count> <checksum> from figma/export-icon-names.js to compare.',
);
