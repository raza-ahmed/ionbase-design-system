/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into `use_figma` (or a Figma plugin console) with the IonBase file open,
 * then feed the result to the repo:
 *
 *   node scripts/verify-export.mjs --expect <count> <names> <values>
 *
 * TWO hashes, because one of them was never enough:
 *
 *   names   `name|codeSyntax` — catches a rename
 *   values  `name|type|codeSyntax|mode=value` — catches an edited value
 *
 * The name hash is blind to a changed colour by construction. The green ramp was
 * edited in Figma and it kept reading 944350191 against 384 variables, passing,
 * exactly as if nothing had happened; `color/orange/50` drifted the same way
 * later. Every gate in the repo starts from the committed export, so a value
 * that only differs in Figma is invisible to all of them at once.
 *
 * The value rows must be byte-identical to the ones `verify-export.mjs` builds,
 * which means formatting values exactly as `export-variables.js` writes them —
 * `#rrggbb[aa]` for colour, dotted `{a.b.c}` for an alias. THE TWO `hex` AND
 * `value` FUNCTIONS ARE COPIES. If you change one, change the other in the same
 * commit, or every collection will report a mismatch that is not there.
 */

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const all = await figma.variables.getLocalVariablesAsync();

const idToName = {};
for (const v of all) idToName[v.id] = v.name;

const colById = {};
const modeName = {};
for (const c of cols) {
  colById[c.id] = c;
  for (const m of c.modes) modeName[m.modeId] = m.name;
}

// Copied from export-variables.js. Keep them in step.
function hex(c) {
  const p = (n) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');
  let s = '#' + p(c.r) + p(c.g) + p(c.b);
  if (c.a !== undefined && c.a < 1) s += p(c.a);
  return s;
}

function value(v, raw) {
  if (raw && raw.type === 'VARIABLE_ALIAS') {
    return '{' + idToName[raw.id].split('/').join('.') + '}';
  }
  return v.resolvedType === 'COLOR' ? hex(raw) : raw;
}

// djb2 over sorted rows — trivial to reproduce identically in Node.
function djb2(rows) {
  let h = 5381;
  const joined = rows.slice().sort().join('\n');
  for (let i = 0; i < joined.length; i++)
    h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;
  return h;
}

const nameRows = [];
const valueRows = [];
const byCollection = {};

for (const v of all) {
  const syntax = (v.codeSyntax && v.codeSyntax.WEB) || '';
  nameRows.push(`${v.name}|${syntax}`);

  const modes = Object.keys(v.valuesByMode)
    .map((id) => `${modeName[id]}=${value(v, v.valuesByMode[id])}`)
    .sort()
    .join(';');
  const row = `${v.name}|${v.resolvedType}|${syntax}|${modes}`;
  valueRows.push(row);

  // Per collection as well, because when the totals differ the first question
  // is how much moved — and "Primitives alone, the other three identical" is
  // the answer that scopes the blast radius before anything is rebuilt.
  const col = colById[v.variableCollectionId];
  const key = col ? col.name : 'unknown';
  (byCollection[key] = byCollection[key] || []).push(row);
}

const perCollection = {};
for (const key of Object.keys(byCollection).sort())
  perCollection[key] = djb2(byCollection[key]);

return {
  count: all.length,
  collections: cols.map((c) => c.name).sort(),
  checksum: djb2(nameRows),
  values: djb2(valueRows),
  perCollection,
};
