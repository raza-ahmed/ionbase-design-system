#!/usr/bin/env node
/**
 * The description-field half of the free Code Connect replacement.
 *
 * Dev Mode's code panel is Figma's own surface and stays behind an
 * Organization plan. The component DESCRIPTION field does not: any plan can
 * write it, Dev Mode shows it, and `get_design_context` / `get_metadata`
 * return it. So the snippet goes there.
 *
 * Every block is generated from dist/figma-map.json, which is itself verified
 * against the Figma export and the TypeScript API on each build. Nothing here
 * is authored, so nothing here can disagree with the code.
 *
 * APPEND, NEVER REPLACE. Most of these components carry long hand-written
 * descriptions — Link's is nearly 3,000 characters of real design reasoning.
 * The block is fenced by BEGIN/END markers so applying it again replaces only
 * the block and leaves everything a human wrote untouched.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAP = join(PKG, 'dist', 'figma-map.json');
const DOC = join(PKG, 'dist', 'meta', 'components.json');
const FIGMA = join(PKG, 'figma', 'components.json');
const SITE = 'https://raza-ahmed.github.io/ionbase-design-system';

export const BEGIN = '───── CODE · ionbase-ui ─────';
export const END = '───── end code ─────';

if (!existsSync(MAP)) {
  console.error(
    'No dist/figma-map.json — run scripts/verify-figma-map.mjs first.',
  );
  process.exit(1);
}

const map = JSON.parse(readFileSync(MAP, 'utf8'));
const code = JSON.parse(readFileSync(DOC, 'utf8')).components;
const figma = JSON.parse(readFileSync(FIGMA, 'utf8')).components;

/** Does this component's own contract say it needs an accessible name? */
const needsName = (name) =>
  (code[name]?.a11y?.requires ?? []).some((r) =>
    /aria-label|accessible name/i.test(r),
  );

function snippetFor(figmaName, entry) {
  const target = code[entry.component];
  const fig = figma[figmaName];
  const attrs = [];
  let children = null;

  for (const [figProp, claim] of Object.entries(entry.props ?? {})) {
    if (!claim.prop) continue;
    const def = fig.props[figProp];

    // A full variant map: show what the Figma DEFAULT variant produces, so the
    // snippet matches the component as it first appears on the canvas.
    if (claim.values && def?.type === 'VARIANT') {
      const value = claim.values[def.default];
      if (
        value !== undefined &&
        !attrs.some((a) => a.startsWith(`${claim.prop}=`))
      )
        attrs.push(`${claim.prop}="${value}"`);
      continue;
    }
    if (claim.prop === 'children' && def?.type === 'TEXT') children ??= 'Label';
  }

  // Required props the design cannot express — a Modal is nothing without them.
  // `children` is never an attribute: it goes between the tags.
  for (const [pname, p] of Object.entries(target.props ?? {})) {
    if (!p.required || p.origin !== 'own') continue;
    if (pname === 'children') {
      children ??= '…';
      continue;
    }
    if (!attrs.some((a) => a.startsWith(`${pname}=`)))
      attrs.push(`${pname}={…}`);
  }

  // Only when nothing else names it — same rule the eslint plugin applies, so
  // the snippet does not model a violation of our own lint.
  const named =
    children || attrs.some((a) => /^(title|label|aria-label)=/.test(a));
  if (!named && needsName(entry.component)) {
    // Prefer the visible label where the component has one. An aria-label on a
    // field that supports `label` teaches the worse of the two options.
    attrs.push(target.props?.label ? 'label="…"' : 'aria-label="…"');
  }

  // A mapping may override the snippet where the generator cannot infer it —
  // TabItem's API is `key` and `title`, neither of which is a typed prop.
  if (entry.example) return entry.example;

  const open = [entry.component, ...attrs].join(' ');
  return children ? `<${open}>${children}</${entry.component}>` : `<${open} />`;
}

function blockFor(figmaName, entry) {
  const lines = [];
  lines.push(BEGIN);
  lines.push(entry.import);
  lines.push(snippetFor(figmaName, entry));
  lines.push('');

  const mapped = [];
  const notes = [];
  for (const [figProp, claim] of Object.entries(entry.props ?? {})) {
    const label = figProp.split('#')[0];
    if (claim.ignore) {
      notes.push(`${label}: ${claim.ignore}`);
      continue;
    }
    if (!claim.prop) continue;
    const line = claim.values
      ? `${label} → ${claim.prop}: ${Object.entries(claim.values)
          .map(([f, c]) => `${f}=${c}`)
          .join(', ')}`
      : claim.when
        ? `${label} → ${claim.prop} (${Object.keys(claim.when).join(', ')} only)`
        : `${label} → ${claim.prop}`;
    if (!mapped.includes(line)) mapped.push(line);
    if (claim.note) notes.push(`${label}: ${claim.note}`);
  }

  if (mapped.length) {
    lines.push('PROPERTIES');
    for (const m of mapped) lines.push(`  ${m}`);
    lines.push('');
  }
  if (entry.note) {
    lines.push(entry.note);
    lines.push('');
  }
  if (notes.length) {
    lines.push('NOTES');
    for (const n of notes) lines.push(`  ${n}`);
    lines.push('');
  }

  lines.push(`Full contract: ${SITE}/${entry.docs}`);
  lines.push(
    `Generated from ionbase-ui@${map.version}. Edit the code, not this block.`,
  );
  lines.push(END);
  return lines.join('\n');
}

const blocks = {};
for (const [figmaName, entry] of Object.entries(map.byFigmaName))
  blocks[entry.figmaNodeId] = {
    figmaComponent: figmaName,
    component: entry.component,
    block: blockFor(figmaName, entry),
  };

writeFileSync(
  join(PKG, 'dist', 'figma-descriptions.json'),
  `${JSON.stringify({ version: map.version, begin: BEGIN, end: END, blocks }, null, 2)}\n`,
);

const chars = Object.values(blocks).reduce((n, b) => n + b.block.length, 0);
console.log(
  `Figma descriptions: ${Object.keys(blocks).length} blocks, ` +
    `${chars} chars -> dist/figma-descriptions.json`,
);
