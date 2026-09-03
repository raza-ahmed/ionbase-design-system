#!/usr/bin/env node
/**
 * Did the snippets actually reach Figma?
 *
 * The build GENERATES a code block for every mapped component and writes them
 * to dist/figma-descriptions.json. Nothing checked whether any of them were
 * ever written into the file — and on 3 Sep 2026 that gap had a body:
 * `Avatar Gradient` was mapped, generated a block, and sat in Figma with a
 * completely empty description. The map gate passed. The description generator
 * passed. Both were reporting on their own output.
 *
 * A generator that reports its own success is not a check. This one compares
 * two different claims:
 *
 *   dist/figma-descriptions.json     what the build produces now
 *   figma/descriptions-applied.json  what a human confirmed is in the file
 *
 * The hash ignores the `Generated from ionbase-ui@<version>` line. That line
 * changes on every release, and a gate that demands 38 re-applications to
 * update one number is a gate that gets skipped — and one that is skipped is
 * worse than none, because it still reports green. What remains is the part a
 * reader acts on: the import, the JSX, the property mapping. A mismatch means
 * Figma is showing a snippet the code no longer honours.
 *
 * CI cannot read Figma, so this cannot verify the file itself — it verifies
 * that someone did, and that nothing has drifted since. `verifiedInFigma` is
 * that person's countersignature.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = join(PKG, 'dist', 'figma-descriptions.json');
const APPLIED = join(PKG, 'figma', 'descriptions-applied.json');

for (const [label, path] of [
  ['dist/figma-descriptions.json', GEN],
  ['figma/descriptions-applied.json', APPLIED],
]) {
  if (!existsSync(path)) {
    console.error(`Missing ${label}.`);
    process.exit(1);
  }
}

const gen = JSON.parse(readFileSync(GEN, 'utf8'));
const rec = JSON.parse(readFileSync(APPLIED, 'utf8'));
const applied = rec.applied ?? {};

/** The block minus its version line — see the header. */
const stable = (block) =>
  block
    .split('\n')
    .filter((l) => !l.startsWith('Generated from ionbase-ui@'))
    .join('\n');

const hash = (block) =>
  createHash('sha256').update(stable(block)).digest('hex').slice(0, 16);

const errors = [];
const err = (c, m) => errors.push(`${c}: ${m}`);

/* 1. Every generated block has been applied. This is the Avatar Gradient
 * case: a component mapped and generated, never written to Figma. */
for (const [id, b] of Object.entries(gen.blocks)) {
  const record = applied[id];
  if (!record) {
    err(
      b.figmaComponent,
      `generates a code block that has never been applied to Figma (node ${id}) — ` +
        `run figma/apply-descriptions.js, then pnpm --filter ionbase-ui figma:applied`,
    );
    continue;
  }

  /* 2. ...and what was applied is still what the code says. */
  const now = hash(b.block);
  if (record.hash !== now)
    err(
      b.figmaComponent,
      `the snippet changed since it was applied (${record.hash} -> ${now}). ` +
        `Figma is showing a reader something the code no longer honours — re-apply it`,
    );

  if (record.component !== b.component)
    err(
      b.figmaComponent,
      `applied record maps to "${record.component}", the build now maps to "${b.component}"`,
    );
}

/* 3. Nothing claims to have been applied for a component that is no longer
 * mapped — a stale record is a claim about a file nobody is checking. */
for (const [id, r] of Object.entries(applied))
  if (!gen.blocks[id])
    err(
      r.figmaComponent ?? id,
      `recorded as applied but the build generates no block for node ${id} — ` +
        `it was unmapped or removed; drop the record`,
    );

/* 4. The countersignature must match what it signs. */
const count = Object.keys(applied).length;
if (rec.verifiedInFigma !== count)
  errors.push(
    `descriptions-applied.json: "verifiedInFigma" says ${rec.verifiedInFigma}, ` +
      `but the file records ${count} — the audit and the record disagree`,
  );

if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\nFigma descriptions: ${errors.length} errors`);
  process.exit(1);
}

console.log(
  `Figma descriptions: ${count} blocks applied and unchanged since ` +
    `${rec.appliedOn}, verified in the file — 0 errors`,
);
