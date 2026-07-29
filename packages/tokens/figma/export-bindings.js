/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into the `use_figma` MCP tool with the IonBase file open. Produces the
 * whole of `src/figma/bindings.json` in one run.
 *
 * WHY THIS EXISTS
 *
 * Every other export reads `getLocalVariablesAsync`, which answers "what
 * variables exist". Nothing answered "what do the components actually bind",
 * and the gap between those two questions is where the expensive defects live:
 *
 *   - A variable deleted from a collection stays bound on every node that used
 *     it. Figma keeps resolving it, so the component renders correctly and the
 *     export reconciles perfectly.
 *   - A token can exist and be bound by nobody, because the component reaches
 *     past it to the tier underneath.
 *
 * THE TRAVERSAL RULES — all three are required
 *
 * These are not style preferences. Getting any of them wrong produces a false
 * all-clear, which is how 407 live bindings were once reported as zero and a
 * collection was deleted on the strength of it.
 *
 *   1. `await figma.setCurrentPageAsync(page)` before reading or writing.
 *      Instance-override data is unreliable on a non-current page — writes
 *      silently no-op and reads come back incomplete.
 *   2. Walk `.children` recursively. `findAll()` does NOT descend into hidden
 *      instance subtrees, and component icon slots are routinely hidden.
 *   3. Reveal hidden instances first, repeatedly — revealing one exposes more
 *      nested inside it — then restore their visibility exactly as found.
 */

const PAGES = null; // null = every page, or ["0:1", "152:42", ...]

const locals = new Set(
  (await figma.variables.getLocalVariablesAsync()).map((v) => v.id),
);
const nameCache = new Map();
async function describe(id) {
  if (nameCache.has(id)) return nameCache.get(id);
  const v = await figma.variables.getVariableByIdAsync(id);
  let info = { name: '<unresolvable>', collection: null, local: false };
  if (v) {
    const c = await figma.variables.getVariableCollectionByIdAsync(
      v.variableCollectionId,
    );
    info = {
      name: v.name,
      collection: c ? c.name : null,
      local: locals.has(id),
    };
  }
  nameCache.set(id, info);
  return info;
}

function walk(node, acc) {
  acc.push(node);
  if (node.children) for (const child of node.children) walk(child, acc);
  return acc;
}

const pages = {};
for (const page of figma.root.children) {
  if (PAGES && PAGES.indexOf(page.id) === -1) continue;
  await figma.setCurrentPageAsync(page);

  // Rule 3: reveal, remembering what to put back.
  const hidden = [];
  for (let round = 0; round < 6; round++) {
    let found = 0;
    for (const n of walk(page, [])) {
      if (n.type === 'INSTANCE' && n.visible === false) {
        hidden.push(n);
        n.visible = true;
        found++;
      }
    }
    if (!found) break;
  }

  const roots = walk(page, []).filter(
    (n) =>
      (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') &&
      !(n.parent && n.parent.type === 'COMPONENT_SET'),
  );

  const components = {};
  for (const root of roots) {
    const seen = new Map();
    for (const n of walk(root, [])) {
      const bv = n.boundVariables;
      if (!bv) continue;
      for (const value of Object.values(bv)) {
        for (const a of Array.isArray(value) ? value : [value]) {
          if (!a || !a.id) continue;
          seen.set(a.id, (seen.get(a.id) || 0) + 1);
        }
      }
    }
    const bindings = {};
    for (const [id, count] of seen) {
      const info = await describe(id);
      bindings[info.name] = {
        collection: info.collection,
        local: info.local,
        count,
      };
    }
    components[root.name] = Object.fromEntries(
      Object.entries(bindings).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  for (let i = hidden.length - 1; i >= 0; i--) hidden[i].visible = false;
  if (Object.keys(components).length) {
    pages[page.name] = { id: page.id, components };
  }
}

return { file: figma.fileKey || null, pages };
