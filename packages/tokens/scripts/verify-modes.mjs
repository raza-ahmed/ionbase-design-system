/**
 * Every Interface role must actually change between Light and Dark.
 *
 * Interface is the only collection with a Light/Dark axis — Semantics and
 * Primitives each hold a single mode. So a role whose two modes resolve to the
 * same value is not "the same on purpose" by default: it is a role that does
 * not theme, and every component binding it renders a light-mode colour in the
 * dark theme.
 *
 * THIS HAPPENED, AND NOTHING CAUGHT IT. `icon/on-color` was `base/white` in
 * both modes while `text/on-color` was white in Light and black in Dark. Button
 * and Alert bind both, so a solid button in the dark theme had a black label
 * beside a white icon; Icon Button binds only the icon role, so it rendered a
 * white glyph while the Button next to it rendered a black label. Two controls
 * that are the same control, drawn two ways.
 *
 * The contrast gate could not see it. It measures text pairings, and an icon is
 * an empty aria-hidden element — `icon/on-color` produced zero pairings out of
 * 892. A role can be wrong in every component that uses it and still not appear
 * in a single measurement.
 *
 * White on those same Dark surfaces also clears the 3:1 that non-text needs
 * (3.6 to 4.59), so even a gate that did measure icons would have passed it.
 * The defect is incoherence, not contrast, and incoherence is not a ratio.
 *
 * An identical pair is allowed, but it has to be declared and argued here.
 */
import { loadCollections } from './figma-to-dtcg.mjs';

/**
 * Roles that are deliberately identical in both modes. A reason is mandatory:
 * an undeclared exemption is indistinguishable from the bug above.
 */
const SAME_ON_PURPOSE = {
  'text/disabled':
    'Disabled text is one mid grey in both themes. It has to read as ' +
    'unavailable against a light ground and a dark one, which is why it sits ' +
    'mid-ramp rather than tracking the theme. SC 1.4.3 exempts it from a ' +
    'contrast floor in both directions, and the accepted entries in ' +
    'ionbase-ui/contrast-exceptions.json are written against this single value.',
  'icon/disabled':
    'The same argument as text/disabled, and it must match it — a disabled ' +
    'control with a themed icon and an unthemed label is the incoherence this ' +
    'gate exists to catch, arrived at from the other side.',
};

const collections = loadCollections();
const byName = new Map(collections.map((c) => [c.collection, c]));
const iface = byName.get('Interface');

if (!iface) {
  console.error('\nNo Interface collection. Expected one with Light and Dark modes.');
  process.exit(1);
}

const modes = iface.modes ?? [];
for (const m of ['Light', 'Dark']) {
  if (!modes.includes(m)) {
    console.error(`\nInterface has no "${m}" mode. It has: ${modes.join(', ')}.`);
    console.error('If the theme axis was renamed in Figma, update this gate in the same commit.');
    process.exit(1);
  }
}

/** Follow an alias down the tier chain to the literal it ends at. */
function resolve(value, seen = new Set()) {
  if (typeof value !== 'string' || !value.startsWith('{')) return value;
  const name = value.slice(1, -1).split('.').join('/');
  if (seen.has(name)) return `<cycle:${name}>`;
  seen.add(name);
  for (const c of collections) {
    const token = c.variables[name];
    if (!token) continue;
    const vals = Object.values(token.values);
    if (vals.length !== 1) return `<ambiguous:${name}>`;
    return resolve(vals[0], seen);
  }
  return `<dangling:${name}>`;
}

const unthemed = [];
const staleExemptions = [];

for (const [name, token] of Object.entries(iface.variables)) {
  const light = resolve(token.values.Light);
  const dark = resolve(token.values.Dark);
  const identical = light === dark;
  const declared = Object.hasOwn(SAME_ON_PURPOSE, name);

  if (identical && !declared) {
    unthemed.push(
      `${name}  Light ${JSON.stringify(token.values.Light)} and ` +
        `Dark ${JSON.stringify(token.values.Dark)} both resolve to ${light}`,
    );
  }
  if (!identical && declared) {
    staleExemptions.push(`${name}  now differs (${light} / ${dark}) — drop it from SAME_ON_PURPOSE`);
  }
}

for (const name of Object.keys(SAME_ON_PURPOSE)) {
  if (!iface.variables[name]) {
    staleExemptions.push(`${name}  is declared here but no longer exists in Interface`);
  }
}

const fail = (label, rows, advice) => {
  if (!rows.length) return 0;
  console.error(`\n${label} — ${rows.length}\n${'='.repeat(60)}`);
  for (const r of rows) console.error(`  ${r}`);
  if (advice) console.error(`\n${advice}`);
  return rows.length;
};

let bad = 0;
bad += fail(
  'ROLE DOES NOT THEME',
  unthemed,
  'This role renders the same colour in both themes. Either give it a Dark\n' +
    'value in Figma and re-export, or add it to SAME_ON_PURPOSE in this file\n' +
    'with the argument for why one value is correct in both.',
);
bad += fail(
  'STALE EXEMPTION',
  staleExemptions,
  'A declared exemption that no longer applies. Remove it — otherwise this\n' +
    'list becomes a place bugs go to be permitted.',
);

if (bad) process.exit(1);

const total = Object.keys(iface.variables).length;
const declared = Object.keys(SAME_ON_PURPOSE).length;
console.log(
  `Modes: ${total} Interface roles — ${total - declared} theme between Light and Dark, ` +
    `${declared} identical by declaration`,
);
