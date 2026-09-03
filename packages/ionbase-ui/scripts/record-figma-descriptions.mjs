#!/usr/bin/env node
/**
 * Countersign the descriptions: record that the generated blocks are now in
 * the Figma file.
 *
 * Run this ONLY after actually applying them — paste figma/apply-descriptions.js
 * into `use_figma`, then re-read the file and confirm every mapped node carries
 * a block. This script records a claim about a file it cannot see; running it
 * without doing the apply produces a green gate over a false statement, which
 * is worse than the silence it replaced.
 *
 *   node scripts/record-figma-descriptions.mjs --verified <n>
 *
 * `--verified` is the number of components the audit found carrying a block.
 * It must equal the number of blocks recorded, so a partial apply cannot be
 * signed off as a complete one.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = join(PKG, 'dist', 'figma-descriptions.json');
const OUT = join(PKG, 'figma', 'descriptions-applied.json');
const FIGMA = join(PKG, 'figma', 'components.json');

if (!existsSync(GEN)) {
  console.error(
    'No dist/figma-descriptions.json — run the build before recording.',
  );
  process.exit(1);
}

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const gen = JSON.parse(readFileSync(GEN, 'utf8'));
const ids = Object.keys(gen.blocks);
const verified = Number(arg('verified') ?? ids.length);

if (!Number.isInteger(verified) || verified !== ids.length) {
  console.error(
    `--verified is ${arg('verified')}, but the build generates ${ids.length} blocks.\n` +
      `Every generated block must be present in Figma before this is recorded.\n` +
      `Re-run the audit; if some are missing, apply them rather than lowering this number.`,
  );
  process.exit(1);
}

const stable = (block) =>
  block
    .split('\n')
    .filter((l) => !l.startsWith('Generated from ionbase-ui@'))
    .join('\n');

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;

const applied = {};
for (const [id, b] of Object.entries(gen.blocks))
  applied[id] = {
    figmaComponent: b.figmaComponent,
    component: b.component,
    hash: createHash('sha256')
      .update(stable(b.block))
      .digest('hex')
      .slice(0, 16),
  };

const out = {
  $comment: previous?.$comment ?? [
    'WHAT WAS ACTUALLY WRITTEN INTO THE FIGMA FILE.',
    '',
    'dist/figma-descriptions.json is what the build GENERATES. This file records',
    'what was APPLIED. Written by scripts/record-figma-descriptions.mjs, checked',
    'by scripts/verify-figma-descriptions.mjs on every build.',
  ],
  file: JSON.parse(readFileSync(FIGMA, 'utf8')).file,
  appliedOn: new Date().toISOString().slice(0, 10),
  verifiedInFigma: verified,
  applied,
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);

const changed = previous
  ? Object.entries(applied).filter(
      ([id, r]) => previous.applied?.[id]?.hash !== r.hash,
    ).length
  : ids.length;

console.log(
  `Recorded ${ids.length} applied descriptions (${changed} changed since the last record) ` +
    `-> figma/descriptions-applied.json`,
);
