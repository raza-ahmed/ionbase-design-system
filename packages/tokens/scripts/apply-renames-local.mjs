/**
 * Applies renames.json to the committed export in src/figma/.
 *
 * Run *after* the same map has been applied in Figma, so the repo mirrors the
 * file without a full re-export. `verify-export.mjs` then diffs the resulting
 * name list against Figma to prove they actually match — this script is a
 * shortcut, not a substitute for that check.
 *
 * codeSyntax is regenerated from the new path for every token, because that is
 * exactly what was written into Figma.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FIGMA_DIR = join(here, '..', 'src', 'figma');
const map = JSON.parse(readFileSync(join(here, '..', 'renames.json'), 'utf8'));

const renames = { ...map.primitives, ...map.semantic, ...map.component };
const deletes = new Set(Object.keys(map.delete ?? {}));

let renamed = 0;
let deleted = 0;
let resynced = 0;

for (const file of readdirSync(FIGMA_DIR).filter((f) => f.endsWith('.json'))) {
  const path = join(FIGMA_DIR, file);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const next = {};

  for (const [name, token] of Object.entries(doc.variables)) {
    if (deletes.has(name)) {
      deleted++;
      continue;
    }
    const newName = renames[name] ?? name;
    if (newName !== name) renamed++;

    const expected = `var(--${newName.replace(/\//g, '-')})`;
    if (token.codeSyntax !== expected) resynced++;

    // Drop $defect markers — they describe defects this migration just fixed.
    const rest = { ...token };
    delete rest.$defect;
    next[newName] = { ...rest, codeSyntax: expected };
  }

  doc.variables = next;
  writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
}

// Aliases reference other tokens by dotted path — repoint any that moved.
const aliasMap = new Map(
  Object.entries(renames).map(([f, t]) => [
    `{${f.split('/').join('.')}}`,
    `{${t.split('/').join('.')}}`,
  ]),
);
let repointed = 0;

for (const file of readdirSync(FIGMA_DIR).filter((f) => f.endsWith('.json'))) {
  const path = join(FIGMA_DIR, file);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  for (const token of Object.values(doc.variables)) {
    for (const [mode, value] of Object.entries(token.values)) {
      const next = aliasMap.get(value);
      if (next) {
        token.values[mode] = next;
        repointed++;
      }
    }
  }
  writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
}

console.log(
  `Local export updated: ${renamed} renamed, ${deleted} deleted, ` +
    `${resynced} codeSyntax resynced, ${repointed} aliases repointed.`,
);
