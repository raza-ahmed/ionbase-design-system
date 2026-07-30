/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into `use_figma` with the IonBase file open. Produces the raw SVG for
 * `packages/react/src/Logo.tsx` — the mark, and the Small and Large outlined
 * wordmarks. Re-run this and paste the output back in whenever the Logo
 * artwork changes in Figma; never hand-edit the paths in the component.
 *
 * WHAT THIS DOES NOT COVER
 *
 * Figma's `Property=Name` variants (wordmark only, no mark) currently render
 * the placeholder text "raza" in an unbound raw colour — not real "IonBase"
 * artwork. That is leftover debug content. This script does not export it,
 * and `Logo.tsx` does not implement it; clean up those two variants in Figma
 * before adding a wordmark-only mode.
 *
 * ONE MARK, NOT TWO
 *
 * Large's mark measures ~4/3 of Small's (19x20 -> 25x27, matching 24 -> 32),
 * not an independently drawn asset, so only the Small mark is exported; the
 * component renders it at both 24px and 32px via the SVG viewBox.
 */

const page = figma.root.children.find((p) => p.name === 'Logo');
await figma.setCurrentPageAsync(page);

function walk(node, acc) {
  acc.push(node);
  if (node.children) for (const c of node.children) walk(c, acc);
  return acc;
}

const set = walk(page, []).find((n) => n.type === 'COMPONENT_SET');
if (!set)
  throw new Error('No Logo-Ionbase component set found on the Logo page.');

const logoSm = set.children.find(
  (c) => c.name === 'Type=Logo, Size=Small, Property=Default',
);
const logoLg = set.children.find(
  (c) => c.name === 'Type=Logo, Size=Large, Property=Default',
);

const mark = logoSm.children.find((c) => c.name === 'ionbase_logo');
const wordmarkSm = logoSm.children.find((c) => c.name === 'IonBase');
const wordmarkLg = logoLg.children.find((c) => c.name === 'Union');

const markSvg = await mark.exportAsync({ format: 'SVG_STRING' });
const wordmarkSmSvg = await wordmarkSm.exportAsync({ format: 'SVG_STRING' });
const wordmarkLgSvg = await wordmarkLg.exportAsync({ format: 'SVG_STRING' });

// Strip Figma's redundant clip-path-to-viewBox wrapper and swap the baked
// light-mode hex for currentColor, so the output can be pasted straight into
// Logo.tsx without further hand-editing.
function clean(svg) {
  return svg
    .replace(/<g clip-path="[^"]*">/, '')
    .replace(/<\/g>\s*<defs>[\s\S]*?<\/defs>/, '')
    .replace(/fill="#[0-9a-fA-F]{6,8}"/g, 'fill="currentColor"');
}

return {
  mark: {
    w: Math.round(mark.width),
    h: Math.round(mark.height),
    svg: clean(markSvg),
  },
  wordmarkSm: {
    w: Math.round(wordmarkSm.width),
    h: Math.round(wordmarkSm.height),
    svg: clean(wordmarkSmSvg),
  },
  wordmarkLg: {
    w: Math.round(wordmarkLg.width),
    h: Math.round(wordmarkLg.height),
    svg: clean(wordmarkLgSvg),
  },
};
