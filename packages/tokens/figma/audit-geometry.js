/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into the `use_figma` MCP tool with the IonBase file open.
 *
 * Reports geometry on component nodes that is a RAW NUMBER rather than a bound
 * variable: padding, gap, corner radius and stroke weight.
 *
 * WHY THIS IS THE HALF THE REPO CANNOT CHECK
 *
 * `scripts/verify-geometry.mjs` reads `bindings.json`, which records what IS
 * bound. A hard-coded number is the ABSENCE of a binding, so it leaves no trace
 * there — it is invisible to every check that reads the export. It can only be
 * seen here, in the file.
 *
 * That gap has cost real time twice:
 *
 *   - Input and Select shipped a literal 10px padding at Small, off a scale
 *     that runs 8, 12, 16, 20. Found by reading the file by hand.
 *   - Both shipped with every stroke weight unbound, which let Invalid drift to
 *     1px on one and 2px on the other. Found the same way.
 *
 * Run this after any component edit, before trusting a build.
 *
 * THE TRAVERSAL RULES — all three are required
 *
 *   1. `await figma.setCurrentPageAsync(page)` before reading. Instance data is
 *      unreliable on a non-current page.
 *   2. Walk `.children` recursively. `findAll()` does NOT descend into hidden
 *      instance subtrees, and icon slots are routinely hidden.
 *   3. Reveal hidden instances first, repeatedly, then restore them.
 *
 * Getting any of them wrong produces a false all-clear. That is how 407 live
 * bindings were once reported as zero.
 *
 * Set PAGE to a page name, or leave null to sweep the current page only —
 * one `setCurrentPageAsync` per run, so sweep pages one at a time.
 */

const PAGE = null; // e.g. 'Buttons'

// Uniform stroke weight is stored as four per-edge keys, NOT as `strokeWeight`.
// Looking for the wrong key reports a correctly bound node as unbound — that
// misread cost a full round of "fixing" things that were already right.
const STROKE_KEYS = [
  'strokeWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
];

const FIELDS = [
  ['paddingTop', (n) => n.paddingTop],
  ['paddingRight', (n) => n.paddingRight],
  ['paddingBottom', (n) => n.paddingBottom],
  ['paddingLeft', (n) => n.paddingLeft],
  ['itemSpacing', (n) => n.itemSpacing],
  ['topLeftRadius', (n) => n.topLeftRadius],
];

if (PAGE) {
  const target = figma.root.children.find((p) => p.name === PAGE);
  if (!target) throw new Error(`no page named "${PAGE}"`);
  await figma.setCurrentPageAsync(target);
}
const page = figma.currentPage;

function walk(node, acc) {
  acc.push(node);
  if (node.children) for (const c of node.children) walk(c, acc);
  return acc;
}

// Rule 3: reveal, remembering what to put back.
const hidden = [];
for (let round = 0; round < 8; round++) {
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

const unbound = [];
let inspected = 0;

for (const root of roots) {
  for (const n of walk(root, [])) {
    const bv = n.boundVariables || {};
    inspected++;

    /*
     * A COMPONENT_SET node is Figma's variant container — the dashed box drawn
     * around a set. Its radius and stroke are editor furniture, not design, and
     * cannot be bound to anything. Reporting them is noise that trains people
     * to ignore this check.
     */
    if (n.type === 'COMPONENT_SET') continue;

    if (n.layoutMode && n.layoutMode !== 'NONE') {
      for (const [field, read] of FIELDS) {
        const v = read(n);
        if (typeof v !== 'number' || v === 0) continue;
        if (field === 'topLeftRadius') continue; // handled below
        if (!bv[field])
          unbound.push(`${root.name} / ${n.name} :: ${field} = ${v}`);
      }
    }

    if (
      typeof n.topLeftRadius === 'number' &&
      n.topLeftRadius > 0 &&
      !bv.topLeftRadius
    ) {
      unbound.push(
        `${root.name} / ${n.name} :: cornerRadius = ${n.topLeftRadius}`,
      );
    }

    if (n.strokes && n.strokes.length && typeof n.strokeWeight === 'number') {
      const bound = STROKE_KEYS.some((k) => bv[k]);
      if (!bound) {
        unbound.push(
          `${root.name} / ${n.name} :: strokeWeight = ${n.strokeWeight}`,
        );
      }
    }
  }
}

for (let i = hidden.length - 1; i >= 0; i--) hidden[i].visible = false;

return {
  page: page.name,
  componentsChecked: roots.length,
  nodesInspected: inspected,
  revealedInstances: hidden.length,
  unboundCount: unbound.length,
  unbound: unbound.slice(0, 60),
  truncated: unbound.length > 60,
};
