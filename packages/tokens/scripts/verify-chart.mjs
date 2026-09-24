/**
 * Chart colour is measured here, because nothing else measures it.
 *
 * The contrast gate in ionbase-ui measures pairings a component's CSS writes,
 * and no component draws a chart — so `chart/1…8` shipped with no
 * dark values at all, "readable on the current dark surfaces" by eye and never
 * by number. A chart is a product's data, drawn by the product; the only place
 * the system can hold the line is the tokens themselves.
 *
 * Two checks, in both modes:
 *
 *   categorical  every `chart/<n>` clears 3:1 against each ground a chart sits
 *                on — SC 1.4.11, a series mark is a graphical object needed to
 *                understand the content.
 *
 *   sequential   `chart/sequential-<n>` moves away from the ground at every
 *                step, and each step is visibly distinct from the one before —
 *                starting from `surface/sunken`, the empty cell. A ramp that
 *                reverses, or two steps that read as one, draws a heatmap that
 *                says the wrong thing without looking broken.
 */
import { loadCollections } from './figma-to-dtcg.mjs';

/** Where charts are drawn: a card, the page, and a raised panel. */
const GROUNDS = ['surface/default', 'surface/page', 'surface/raised'];
/** The empty cell a sequential ramp starts from. */
const EMPTY = 'surface/sunken';
const NON_TEXT = 3;
/**
 * Not a WCAG number — there is none for "two fills are different". 1.3 is
 * below every adjacent pair the ramp was chosen with (1.38 lowest) and above
 * what two neighbouring rungs of one hue give (blue 200→300 is 1.19, which
 * was rejected for exactly that).
 */
const STEP = 1.3;

const collections = loadCollections();
const iface = collections.find((c) => c.collection === 'Interface');

function resolve(value, mode, seen = new Set()) {
  if (typeof value !== 'string' || !value.startsWith('{')) return value;
  const name = value.slice(1, -1).split('.').join('/');
  if (seen.has(name)) throw new Error(`alias cycle at ${name}`);
  seen.add(name);
  for (const c of collections) {
    const token = c.variables[name];
    if (!token) continue;
    const v = token.values[mode] ?? Object.values(token.values)[0];
    return resolve(v, mode, seen);
  }
  throw new Error(`dangling alias ${name}`);
}

const role = (name, mode) => {
  const token = iface.variables[name];
  if (!token) throw new Error(`Interface has no ${name}`);
  return resolve(token.values[mode], mode);
};

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) =>
    x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const names = Object.keys(iface.variables);
const series = names.filter((n) => /^chart\/\d+$/.test(n));
const ramp = names
  .filter((n) => /^chart\/sequential-\d+$/.test(n))
  .sort((a, b) => Number(a.split('-').pop()) - Number(b.split('-').pop()));

const failures = [];
if (series.length === 0 || ramp.length === 0) {
  failures.push(
    `expected chart/<n> and chart/sequential-<n> in Interface, found ${series.length} and ${ramp.length}`,
  );
}

let measured = 0;
for (const mode of ['Light', 'Dark']) {
  const grounds = GROUNDS.map((g) => [g, role(g, mode)]);

  for (const s of series) {
    const hex = role(s, mode);
    for (const [g, ground] of grounds) {
      measured++;
      const r = ratio(hex, ground);
      if (r < NON_TEXT)
        failures.push(
          `${mode}  ${s} ${hex} on ${g} ${ground}: ${r.toFixed(2)}:1, needs ${NON_TEXT}:1`,
        );
    }
  }

  let prev = role(EMPTY, mode);
  let prevName = EMPTY;
  const groundLum = luminance(role('surface/default', mode));
  let prevDist = Math.abs(luminance(prev) - groundLum);
  for (const s of ramp) {
    measured++;
    const hex = role(s, mode);
    const dist = Math.abs(luminance(hex) - groundLum);
    const r = ratio(hex, prev);
    if (dist <= prevDist)
      failures.push(
        `${mode}  ${s} ${hex} is no further from the ground than ${prevName} — the ramp turns back`,
      );
    if (r < STEP)
      failures.push(
        `${mode}  ${s} ${hex} vs ${prevName} ${prev}: ${r.toFixed(2)}:1, steps need ${STEP}:1`,
      );
    prev = hex;
    prevName = s;
    prevDist = dist;
  }
}

if (failures.length) {
  console.error(
    `\nCHART COLOUR — ${failures.length} failing\n${'='.repeat(60)}`,
  );
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    '\nFix the value in Figma (Interface chart/*) and re-export. Do not relax the threshold here.',
  );
  process.exit(1);
}

console.log(
  `Chart: ${series.length} series + ${ramp.length}-step ramp, ${measured} measurements across Light and Dark — all clear`,
);
