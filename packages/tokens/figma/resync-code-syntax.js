/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Rewrites every variable's `codeSyntax.WEB` from its own path, so Dev Mode
 * shows engineers the CSS variable the build actually emits.
 *
 * Run this when `node scripts/verify-code-syntax.mjs` reports mismatches that
 * are Figma's fault rather than intentional. It also reports any CSS variable
 * name claimed by more than one token — the failure mode that silently loses a
 * value, since two tokens cannot both own `--bg-brand`.
 */

const all = await figma.variables.getLocalVariablesAsync();
const changed = [];

for (const v of all) {
  const expected = `var(--${v.name.split('/').join('-')})`;
  const actual = (v.codeSyntax && v.codeSyntax.WEB) || null;
  if (actual === expected) continue;
  v.setVariableCodeSyntax('WEB', expected);
  changed.push({ name: v.name, was: actual, now: expected });
}

// Uniqueness is the property that matters; report it explicitly.
const seen = new Map();
for (const v of all) {
  const cssName = `var(--${v.name.split('/').join('-')})`;
  seen.set(cssName, [...(seen.get(cssName) || []), v.name]);
}
const collisions = [...seen.entries()].filter(([, names]) => names.length > 1);

return {
  total: all.length,
  rewritten: changed.length,
  collisions, // must be empty
  changed: changed.slice(0, 20),
};
