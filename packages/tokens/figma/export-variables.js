/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into the `use_figma` MCP tool, or into a Figma plugin console, with the
 * IonBase file open. Returns the exact contents of one `src/figma/<name>.json`
 * file; save the output over that file verbatim.
 *
 * Run it once per collection: set COLLECTION below to each of
 * Primitives · Semantics · Interface · Breakpoint, saving each over the
 * matching `src/figma/<lowercase name>.json`.
 *
 * One collection at a time because the combined payload is large enough to be
 * truncated in transit — a silently half-written token file is worse than four
 * deliberate runs.
 *
 * THESE NAMES ARE v2 AND THEY CHANGED. This header used to read
 * "Primitives · Semantic · Breakpoint · Component", naming two collections
 * that no longer exist and defaulting to one of them, so the script threw on
 * every run until someone edited it. If the token architecture moves again,
 * fix this line in the same commit — the failure below now names what it
 * actually found, but a wrong default still costs the next person a run.
 */

const COLLECTION = 'Primitives'; // <- Primitives | Semantics | Interface | Breakpoint

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const all = await figma.variables.getLocalVariablesAsync();
const idToName = {};
for (const v of all) idToName[v.id] = v.name;

const col = cols.find((c) => c.name === COLLECTION);
if (!col)
  throw new Error(
    `No collection named "${COLLECTION}". This file has: ` +
      cols.map((c) => c.name).join(', '),
  );

const modeName = {};
for (const m of col.modes) modeName[m.modeId] = m.name;

function hex(c) {
  const p = (n) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');
  let s = '#' + p(c.r) + p(c.g) + p(c.b);
  if (c.a !== undefined && c.a < 1) s += p(c.a); // keep alpha only when meaningful
  return s;
}

function value(v, raw) {
  // Aliases become DTCG-style dotted refs so the repo never stores Figma IDs.
  if (raw && raw.type === 'VARIABLE_ALIAS') {
    return '{' + idToName[raw.id].split('/').join('.') + '}';
  }
  return v.resolvedType === 'COLOR' ? hex(raw) : raw;
}

const variables = {};
for (const id of col.variableIds) {
  const v = all.find((x) => x.id === id);
  const values = {};
  for (const modeId of Object.keys(v.valuesByMode)) {
    values[modeName[modeId]] = value(v, v.valuesByMode[modeId]);
  }
  const token = {
    type: v.resolvedType,
    scopes: v.scopes,
    codeSyntax: (v.codeSyntax && v.codeSyntax.WEB) || null,
    values,
  };
  if (v.description) token.description = v.description;
  variables[v.name] = token;
}

return {
  collection: col.name,
  figmaCollectionId: col.id,
  modes: col.modes.map((m) => m.name),
  defaultMode: modeName[col.defaultModeId],
  variables,
};
