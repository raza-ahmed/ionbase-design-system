/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into the `use_figma` MCP tool with the IonBase file open. Run it once
 * per component page and merge each result into `src/figma/bindings.json`
 * under `pages`.
 *
 * WHY THIS EXISTS
 *
 * Every other export reads `getLocalVariablesAsync`, which answers "what
 * variables exist". Nothing answered "what do the components actually bind",
 * and the gap between those two questions is where the expensive defects live:
 *
 *   - A variable deleted from a collection stays bound on every node that used
 *     it. Figma keeps resolving it, so the component renders correctly and the
 *     export — which only sees live variables — reconciles perfectly. The
 *     Button carried 100+ bindings to four deleted `button/<size>/font-size`
 *     variables while all four token checks reported green.
 *   - A component token can exist and be bound by nobody, because the Figma
 *     component reaches past it to the semantic or primitive underneath. That
 *     is the `tabs/underline/item/radius/focus` case: the token moves, the
 *     design does not.
 *
 * Neither is visible from the repo alone. This export is the missing half.
 *
 * Set PAGE_ID from `figma.root.children` — one page per run, because a script
 * may only call setCurrentPageAsync once.
 */

const PAGE_ID = '0:1'; // <- the component page to scan

const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);

// `local` is the whole point: a binding that resolves but is absent from this
// set points at a deleted variable.
const locals = new Set(
  (await figma.variables.getLocalVariablesAsync()).map((v) => v.id),
);

// Variants are scanned through their parent set, never as roots of their own.
const roots = page
  .findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })
  .filter((r) => !(r.parent && r.parent.type === 'COMPONENT_SET'));

const components = {};
for (const r of roots) {
  const seen = new Map();
  for (const n of [r, ...r.findAll(() => true)]) {
    const bv = n.boundVariables;
    if (!bv) continue;
    for (const val of Object.values(bv)) {
      for (const a of Array.isArray(val) ? val : [val]) {
        if (!a || !a.id) continue;
        seen.set(a.id, (seen.get(a.id) || 0) + 1);
      }
    }
  }

  const bindings = {};
  for (const [id, count] of seen) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (!v) {
      // Not even resolvable — worse than a ghost, and rarer.
      bindings['<unresolvable:' + id + '>'] = {
        collection: null,
        local: false,
        count,
      };
      continue;
    }
    const c = await figma.variables.getVariableCollectionByIdAsync(
      v.variableCollectionId,
    );
    bindings[v.name] = {
      collection: c ? c.name : null,
      local: locals.has(id),
      count,
    };
  }
  components[r.name] = Object.fromEntries(
    Object.entries(bindings).sort(([a], [b]) => a.localeCompare(b)),
  );
}

return { page: page.name, pageId: page.id, components };
