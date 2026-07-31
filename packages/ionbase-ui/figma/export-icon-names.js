/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into `use_figma` with the IonBase file open, then feed the result to:
 *
 *   pnpm --filter @ionbase-ui/icons icons:verify -- --expect <count> <checksum>
 *
 * Returns a checksum rather than 1,753 names on purpose: the whole list is a
 * ~35KB payload to move and read every time, and the only question worth asking
 * is "is the set still identical", which a checksum answers exactly.
 *
 * Names are normalised to Lucide's kebab id first — the Figma layers are named
 * `Icons/ a-arrow-down 1`, carrying a leading space and a ` 1` suffix from the
 * bulk import, neither of which is part of the icon's identity.
 */

const page = figma.root.children.find((p) => p.name === 'Icons- Lucide');
if (!page) throw new Error('No page named "Icons- Lucide"');
await figma.setCurrentPageAsync(page);

const comps = page.findAllWithCriteria({ types: ['COMPONENT'] });

const unparsable = [];
const ids = [];
for (const c of comps) {
  const m = /^Icons\/\s*(.+?)(?:\s+\d+)?$/.exec(c.name);
  if (!m) {
    unparsable.push(c.name);
    continue;
  }
  ids.push(m[1].trim());
}
ids.sort();

let h = 5381;
const joined = ids.join('\n');
for (let i = 0; i < joined.length; i++)
  h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;

return {
  count: ids.length,
  checksum: h,
  unparsable: unparsable.slice(0, 10),
  sample: ids.slice(0, 5),
};
