/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into `use_figma` (or a Figma plugin console) with the IonBase file open,
 * then feed the result to the repo:
 *
 *   node scripts/verify-export.mjs --expect <count> <checksum>
 *
 * Catches the failure that otherwise goes unnoticed: someone renames a variable
 * in Figma and the repo keeps generating CSS from the old name.
 */

const all = await figma.variables.getLocalVariablesAsync();
const rows = all
  .map((v) => `${v.name}|${(v.codeSyntax && v.codeSyntax.WEB) || ''}`)
  .sort();

// djb2 — trivial to reproduce identically in Node.
let h = 5381;
const joined = rows.join('\n');
for (let i = 0; i < joined.length; i++)
  h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;

return { count: all.length, checksum: h };
