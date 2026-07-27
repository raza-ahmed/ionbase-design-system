/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into `use_figma` with the IonBase file open. Returns the contents of
 * `src/figma/text-styles.json`; save the output over that file verbatim.
 *
 * Text styles are NOT variables — `getLocalVariablesAsync` never sees them, so
 * export-variables.js does not cover them. They are exported separately.
 *
 * Every field is captured as the *bound variable name*, not the resolved value.
 * A style bound to `type/h1` stays responsive across breakpoints; baking in 48px
 * would freeze it at the desktop size. An unbound field comes back as null,
 * which the generator treats as a hard error rather than guessing a literal.
 */

const styles = await figma.getLocalTextStylesAsync();
const all = await figma.variables.getLocalVariablesAsync();
const idToName = {};
for (const v of all) idToName[v.id] = v.name;

const resolve = (binding) => {
  if (!binding) return null;
  const one = Array.isArray(binding) ? binding[0] : binding;
  return one && one.id ? idToName[one.id] || `UNKNOWN:${one.id}` : null;
};

const textStyles = {};
for (const s of styles) {
  const b = s.boundVariables || {};
  textStyles[s.name] = {
    fontFamily: resolve(b.fontFamily),
    fontWeight: resolve(b.fontStyle),
    fontSize: resolve(b.fontSize),
    lineHeight: resolve(b.lineHeight),
    // Literals, for the generator to warn about. Non-zero letter spacing or a
    // textCase other than ORIGINAL would need a token before it can be emitted.
    letterSpacing: s.letterSpacing,
    textCase: s.textCase,
    textDecoration: s.textDecoration,
  };
}

return { source: 'figma-text-styles', count: styles.length, textStyles };
