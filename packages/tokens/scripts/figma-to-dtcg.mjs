/**
 * Figma flat export -> DTCG.
 *
 * The Figma variables in `src/figma/*.json` are a faithful, flat mirror of the
 * file: keys are the exact Figma variable names (`bg/brand/hover`). DTCG is
 * nested, so this converts one to the other.
 *
 * The interesting problem is that Figma lets a name be both a token and a
 * folder — `bg/brand` is a real variable AND the parent of `bg/brand/hover`.
 * DTCG has no way to express that: a group cannot also hold a $value. We park
 * the leaf under a `DEFAULT` child and strip that segment back off when
 * generating CSS names, so `--bg-brand` survives the round trip untouched.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FIGMA_DIR = join(here, '..', 'src', 'figma');
const DTCG_DIR = join(here, '..', 'src', 'dtcg');

export const DEFAULT_KEY = 'DEFAULT';

/** Figma FLOAT scopes whose values are real lengths and want a `px` unit. */
const DIMENSION_SCOPES = new Set([
  'WIDTH_HEIGHT',
  'GAP',
  'CORNER_RADIUS',
  'STROKE_FLOAT',
  'FONT_SIZE',
  'LINE_HEIGHT',
]);

/**
 * Repo-owned build hints, kept outside src/figma/ so a re-export cannot wipe
 * them. Figma has no way to say "this number is a count, not a length" —
 * `grid/columns` is scoped WIDTH_HEIGHT like every other FLOAT, so without this
 * it would ship as `12px`.
 */
const overrides = JSON.parse(
  readFileSync(join(here, '..', 'token-overrides.json'), 'utf8'),
);
const UNITLESS = new Set(overrides.unitless.tokens);

export function loadCollections() {
  return readdirSync(FIGMA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(FIGMA_DIR, f), 'utf8')));
}

/**
 * Names that are simultaneously a leaf token and a group prefix. Computed
 * across every collection at once — Component tokens alias Semantic ones, so a
 * collision in one file changes how references resolve in another.
 */
export function findCollisions(collections) {
  const leaves = new Set();
  const groups = new Set();
  for (const c of collections) {
    for (const name of Object.keys(c.variables)) {
      leaves.add(name);
      const segs = name.split('/');
      for (let i = 1; i < segs.length; i++)
        groups.add(segs.slice(0, i).join('/'));
    }
  }
  return new Set([...leaves].filter((n) => groups.has(n)));
}

/** Figma name -> DTCG path segments, inserting DEFAULT where a leaf is also a group. */
export function toPath(name, collisions) {
  const segs = name.split('/');
  return collisions.has(name) ? [...segs, DEFAULT_KEY] : segs;
}

function dtcgType(name, token) {
  if (token.type === 'COLOR') return 'color';
  if (token.type === 'STRING') {
    if (token.scopes.includes('FONT_FAMILY')) return 'fontFamily';
    if (token.scopes.includes('FONT_STYLE')) return 'fontWeight';
    return 'string';
  }
  if (UNITLESS.has(name)) return 'number';
  return token.scopes.some((s) => DIMENSION_SCOPES.has(s))
    ? 'dimension'
    : 'number';
}

/**
 * Rewrites `{bg.brand}` -> `{bg.brand.DEFAULT}` when the target is a colliding
 * leaf. Without this every alias pointing at a "both" name would resolve to a
 * group and silently produce an unresolved reference.
 */
function rewriteAlias(value, collisions) {
  if (typeof value !== 'string' || !value.startsWith('{')) return value;
  const figmaName = value.slice(1, -1).split('.').join('/');
  return `{${toPath(figmaName, collisions).join('.')}}`;
}

function setDeep(tree, path, leaf) {
  let node = tree;
  for (const seg of path.slice(0, -1)) {
    node[seg] ??= {};
    node = node[seg];
  }
  node[path.at(-1)] = leaf;
}

/** Builds one DTCG document per (collection, mode). */
export function toDtcg(collection, mode, collisions) {
  const tree = {};
  for (const [name, token] of Object.entries(collection.variables)) {
    const leaf = {
      $type: dtcgType(name, token),
      $value: rewriteAlias(token.values[mode], collisions),
    };
    if (token.description) leaf.$description = token.description;
    setDeep(tree, toPath(name, collisions), leaf);
  }
  return tree;
}

function main() {
  mkdirSync(DTCG_DIR, { recursive: true });
  const collections = loadCollections();
  const collisions = findCollisions(collections);
  const written = [];

  for (const c of collections) {
    for (const mode of c.modes) {
      // Single-mode collections don't need the mode in the filename.
      const slug =
        c.modes.length === 1
          ? c.collection.toLowerCase()
          : `${c.collection.toLowerCase()}.${mode.toLowerCase()}`;
      const file = join(DTCG_DIR, `${slug}.json`);
      writeFileSync(
        file,
        JSON.stringify(toDtcg(c, mode, collisions), null, 2) + '\n',
      );
      written.push(`${slug}.json`);
    }
  }

  const total = collections.reduce(
    (n, c) => n + Object.keys(c.variables).length,
    0,
  );
  console.log(
    `DTCG: ${written.length} files, ${total} variables, ${collisions.size} leaf/group collisions parked under ${DEFAULT_KEY}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
