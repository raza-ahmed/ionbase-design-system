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
 * Roles that are deliberately identical in both modes, grouped by the argument
 * that makes them so. A reason is mandatory: an undeclared exemption is
 * indistinguishable from the bug above.
 */
const ACCENTS = ['primary', 'success', 'warning', 'error', 'information'];

const SAME_ON_PURPOSE = [
  {
    roles: ['text/disabled', 'icon/disabled'],
    reason:
      'Disabled is one mid grey in both themes. It has to read as unavailable ' +
      'against a light ground and a dark one, which is why it sits mid-ramp ' +
      'rather than tracking the theme. SC 1.4.3 exempts it from a contrast ' +
      'floor in both directions, and the accepted entries in ' +
      'ionbase-ui/contrast-exceptions.json are written against this one value. ' +
      'The two must also match each other — a disabled control with a themed ' +
      "icon and an unthemed label is this gate's own bug, from the other side.",
  },
  {
    roles: [
      ...ACCENTS.flatMap((a) => [
        `surface/${a}`,
        `surface/${a}/hover`,
        `surface/${a}/pressed`,
      ]),
      'text/on-color',
      'icon/on-color',
    ],
    reason:
      'A solid accent control is the same control in both themes, so it is ' +
      'drawn the same way in both. Dark used to lighten it — the surface at ' +
      '<accent>/500 with the ladder running /400 and /300 on hover and press — ' +
      'and that is the whole reason text/on-color had to be black: white fails ' +
      'AA on four of the five lightened surfaces (success 3.69, warning 3.60, ' +
      'error 4.09, information 4.21). A button with a dark label is not what ' +
      'these controls look like anywhere else, and the lightened fill also left ' +
      'the border darker than the fill it surrounded, on a dark page. Dark now ' +
      'takes the Light ladder exactly, /600 -> /700 -> /800, so white clears ' +
      'every state from 5.24 to 13.23. Hover has to darken rather than lighten: ' +
      'a lighter hover at /500 puts white back under AA on success. ' +
      'WHAT THEMES HERE IS THE RIM, NOT THE FILL — border/<accent>-strong is ' +
      '/700 in Light and /500 in Dark, a rim lighter than its own fill, which ' +
      'carries the control boundary against the dark page at 3.84 to 4.89 and ' +
      'incidentally fixed border/error-strong, which had been failing SC 1.4.11 ' +
      'at 2.96. Those border roles still differ between modes and are not ' +
      'declared here; if one ever stops differing, this gate will say so.',
  },
  {
    roles: ['surface/sheen-subtle'],
    reason:
      'The gloss falloff stop is 5% in both themes because the alpha ramp has ' +
      'no step below it. In Light the sheen peaks at 20% and this is a real ' +
      'falloff; in Dark the peak is already 5%, so the inner 60% is flat and ' +
      'the gloss fades between 60% and the transparent edge instead. Adding an ' +
      'alpha primitive below 5% to give Dark a distinct mid would buy a ' +
      'difference nobody can see at 5% opacity. surface/sheen itself themes ' +
      '20% against 5%, and if that ever stops being true this gate will say so. ' +
      'NOTE: an earlier version of this reason said Dark was forced to 5% ' +
      'because the authored 18% dropped five hues under AA. That was measured ' +
      'by compositing the gloss over the disc top, where it does not reach — ' +
      'verify-contrast evaluates the gradient geometrically now and 18% floors ' +
      'at 5.07. The 5% is a design preference; only the token is a requirement.',
  },
];

/** name -> reason, with a guard against the same role declared twice. */
const declaredReason = new Map();
for (const { roles, reason } of SAME_ON_PURPOSE) {
  for (const r of roles) {
    if (declaredReason.has(r)) {
      console.error(`\n${r} is declared in SAME_ON_PURPOSE more than once.`);
      process.exit(1);
    }
    declaredReason.set(r, reason);
  }
}

const collections = loadCollections();
const byName = new Map(collections.map((c) => [c.collection, c]));
const iface = byName.get('Interface');

if (!iface) {
  console.error(
    '\nNo Interface collection. Expected one with Light and Dark modes.',
  );
  process.exit(1);
}

const modes = iface.modes ?? [];
for (const m of ['Light', 'Dark']) {
  if (!modes.includes(m)) {
    console.error(
      `\nInterface has no "${m}" mode. It has: ${modes.join(', ')}.`,
    );
    console.error(
      'If the theme axis was renamed in Figma, update this gate in the same commit.',
    );
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
  const declared = declaredReason.has(name);

  if (identical && !declared) {
    unthemed.push(
      `${name}  Light ${JSON.stringify(token.values.Light)} and ` +
        `Dark ${JSON.stringify(token.values.Dark)} both resolve to ${light}`,
    );
  }
  if (!identical && declared) {
    staleExemptions.push(
      `${name}  now differs (${light} / ${dark}) — drop it from SAME_ON_PURPOSE`,
    );
  }
}

for (const name of declaredReason.keys()) {
  if (!iface.variables[name]) {
    staleExemptions.push(
      `${name}  is declared here but no longer exists in Interface`,
    );
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
const declared = declaredReason.size;
console.log(
  `Modes: ${total} Interface roles — ${total - declared} theme between Light and Dark, ` +
    `${declared} identical by declaration`,
);
