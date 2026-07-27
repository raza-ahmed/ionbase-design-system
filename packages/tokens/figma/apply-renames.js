/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Renames variables in Figma. DO NOT run this before
 * `node scripts/verify-renames.mjs` returns "Clean. Safe to apply to Figma."
 *
 * The dry run applies the same map in memory and re-audits. Skipping it risks
 * renaming dozens of variables into a *different* set of violations, in a file
 * where the original names no longer exist to undo from.
 *
 * Paste the `renames` / `delete` sections of renames.json into the constants
 * below, then paste the whole file into `use_figma`.
 *
 * Renaming is non-destructive: aliases and instance bindings are by variable ID,
 * so nothing rebinds and no design work is disturbed.
 */

const RENAMES = {
  // 'old/token/name': 'new/token/name',
};
const DELETE = [
  // 'token/to/remove',
];

const all = await figma.variables.getLocalVariablesAsync();
const byName = new Map(all.map((v) => [v.name, v]));
const renamed = [];
const deleted = [];
const missing = [];
const errors = [];

for (const name of DELETE) {
  const v = byName.get(name);
  if (!v) {
    missing.push(`delete: ${name}`);
    continue;
  }
  v.remove();
  byName.delete(name);
  deleted.push(name);
}

// Figma requires unique names within a collection, so a rename whose target is
// still occupied has to wait for the occupant to move. Repeat until no progress
// — this is what makes swaps (A->B, B->C) work without temp names.
let pending = Object.entries(RENAMES).filter(([from]) => {
  if (byName.has(from)) return true;
  missing.push(`rename: ${from}`);
  return false;
});

while (pending.length) {
  const blocked = [];
  let progressed = false;
  for (const [from, to] of pending) {
    if (byName.has(to)) {
      blocked.push([from, to]);
      continue;
    }
    const v = byName.get(from);
    try {
      v.name = to;
      // codeSyntax must follow the name, or Dev Mode advertises a stale CSS var.
      v.setVariableCodeSyntax('WEB', `var(--${to.split('/').join('-')})`);
      byName.delete(from);
      byName.set(to, v);
      renamed.push(`${from} -> ${to}`);
      progressed = true;
    } catch (e) {
      errors.push(`${from} -> ${to}: ${e.message}`);
    }
  }
  if (!progressed) {
    // A genuine cycle, or a target owned by something not in the map.
    for (const [from, to] of blocked)
      errors.push(`blocked, target occupied: ${from} -> ${to}`);
    break;
  }
  pending = blocked;
}

return {
  renamed: renamed.length,
  deleted: deleted.length,
  missing,
  errors,
  remainingVariables: (await figma.variables.getLocalVariablesAsync()).length,
};
