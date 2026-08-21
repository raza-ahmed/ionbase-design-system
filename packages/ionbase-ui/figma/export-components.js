/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into the `use_figma` MCP tool, or a Figma plugin console, with the
 * IonBase file open. Returns the exact contents of `figma/components.json`;
 * save the output over that file verbatim.
 *
 * WHY THIS EXISTS
 *
 * Code Connect — Figma's own answer to "make Dev Mode emit the real component"
 * — requires a Dev or Full seat on an Organization or Enterprise plan. IonBase
 * is not for people who can afford that and nobody else, so the mapping is kept
 * here instead: exported once, committed, and verified against both sides in
 * CI. Everything Code Connect stores in Figma, this stores in git, where it is
 * reviewable and free.
 *
 * WHAT IT TAKES, AND WHAT IT SKIPS
 *
 * Every COMPONENT_SET and every standalone COMPONENT that is not a variant of
 * a set. Variants inside a set are not listed separately — the set already
 * carries their axes in `componentPropertyDefinitions`.
 *
 * Skipped, and each for a reason rather than by accident:
 *   Icons- Lucide   1,753 icon components, all the same shape
 *   Icon            the icon frame page
 *   Dev             .Designer / .Status Design scratch components
 *   🖌️ Design       working page
 *   Font Playground working page
 *
 * setCurrentPageAsync before reading each page: the same rule the bindings
 * exporter needs. Component property definitions read reliably only on a loaded
 * page, and a silently empty `props` object here would produce a mapping file
 * that claims full coverage of nothing.
 */

const SKIP_PAGES = [
  /icon/i, // "Icon" and "Icons- Lucide"
  /^Dev$/,
  /Design$/,
  /Playground$/,
];

const components = {};

for (const page of figma.root.children) {
  if (SKIP_PAGES.some((re) => re.test(page.name))) continue;
  await figma.setCurrentPageAsync(page);

  const take = (n, kind) => {
    const defs = n.componentPropertyDefinitions || {};
    const props = {};
    // Sorted so a re-export diffs cleanly against the committed file.
    for (const key of Object.keys(defs).sort()) {
      const d = defs[key];
      props[key] =
        d.type === 'VARIANT'
          ? {
              type: 'VARIANT',
              options: d.variantOptions,
              default: d.defaultValue,
            }
          : { type: d.type };
    }
    components[n.name] = { page: page.name, id: n.id, kind, props };
  };

  const walk = (n) => {
    if (n.type === 'COMPONENT_SET') return take(n, 'SET');
    if (n.type === 'COMPONENT') {
      // A variant inside a set — the set already describes it.
      if (n.parent && n.parent.type === 'COMPONENT_SET') return;
      return take(n, 'COMPONENT');
    }
    if ('children' in n) n.children.forEach(walk);
  };

  page.children.forEach(walk);
}

const sorted = {};
for (const k of Object.keys(components).sort()) sorted[k] = components[k];

return {
  $comment: [
    'What the Figma components ARE — their variant axes and property slots.',
    'Produced by figma/export-components.js. Checked by scripts/verify-figma-map.mjs.',
    '',
    'This is the free half of Code Connect: Figma stores the mapping for',
    'Organization and Enterprise customers, and this repo stores it for',
    'everyone else. See figma/mapping.json for the mapping itself.',
    '',
    'Do not hand-edit. Re-export when the Figma components change.',
  ],
  file: figma.fileKey || 'gaLbGd0QNb1fUl6BjSpfBA',
  exported: new Date().toISOString().slice(0, 10),
  components: sorted,
};
