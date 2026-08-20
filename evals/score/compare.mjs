#!/usr/bin/env node
/**
 * Compare packs over the generations already on disk.
 *
 *   node score/compare.mjs [--dir results/generated]
 *
 * Re-scores from the files rather than reading results.json, so the scorer can
 * be sharpened after a run without paying to generate again. That separation is
 * the reason generation and scoring are different steps.
 *
 * Only tasks present in EVERY pack are compared. A pack that generated more
 * tasks than another would otherwise look better or worse for a reason that has
 * nothing to do with its contents.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score, lint, typecheck } from './score.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argDir = process.argv.indexOf('--dir');
const DIR = resolve(
  argDir > -1
    ? process.argv[argDir + 1]
    : join(HERE, '..', 'results', 'generated'),
);

if (!existsSync(DIR)) {
  console.error(`No generations at ${DIR}`);
  process.exit(1);
}

const packs = readdirSync(DIR).filter((d) => !d.startsWith('.'));
const byPack = {};
for (const p of packs) {
  byPack[p] = readdirSync(join(DIR, p))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => f.replace(/\.tsx$/, ''));
}

const common = Object.values(byPack).reduce((a, b) =>
  a.filter((t) => b.includes(t)),
);
console.log(`Packs: ${packs.join(', ')}`);
console.log(
  `Tasks generated: ${packs.map((p) => `${p}=${byPack[p].length}`).join('  ')}`,
);
console.log(`Comparing the ${common.length} task(s) present in every pack.\n`);
if (!common.length) process.exit(0);

const rows = {};
const perCheck = {};
for (const pack of packs) {
  rows[pack] = [];
  for (const task of common) {
    const file = join(DIR, pack, `${task}.tsx`);
    const s = score(file, task);
    const messages = lint(file);
    const tc = typecheck(file);
    const entries = Object.entries(s.checks);
    for (const [name, c] of entries) {
      (perCheck[name] ??= {})[pack] ??= { pass: 0, total: 0 };
      perCheck[name][pack].total++;
      if (c.pass) perCheck[name][pack].pass++;
    }
    rows[pack].push({
      task,
      passed: entries.filter(([, c]) => c.pass).length,
      total: entries.length,
      lint: messages.filter((m) => m.severity === 2).length,
      compiles: tc.pass,
      failed: entries.filter(([, c]) => !c.pass).map(([n]) => n),
    });
  }
}

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(0)}%` : '—');

console.log(
  `  ${'pack'.padEnd(26)} ${'checks'.padStart(9)} ${'compiles'.padStart(9)} ${'lint errs'.padStart(10)}`,
);
for (const pack of packs) {
  const r = rows[pack];
  const p = r.reduce((a, x) => a + x.passed, 0);
  const t = r.reduce((a, x) => a + x.total, 0);
  console.log(
    `  ${pack.padEnd(26)} ${pct(p, t).padStart(9)} ${pct(r.filter((x) => x.compiles).length, r.length).padStart(9)} ${String(r.reduce((a, x) => a + x.lint, 0)).padStart(10)}`,
  );
}

console.log('\n  per check (pass rate):');
console.log(
  `    ${'check'.padEnd(24)} ${packs.map((p) => p.slice(0, 16).padStart(17)).join('')}`,
);
for (const [name, byP] of Object.entries(perCheck)) {
  const cells = packs.map((p) => {
    const v = byP[p];
    return (v ? `${v.pass}/${v.total}` : '—').padStart(17);
  });
  const values = packs.map((p) => (byP[p] ? byP[p].pass / byP[p].total : null));
  const differs = new Set(values.filter((v) => v !== null)).size > 1;
  console.log(
    `    ${name.padEnd(24)}${cells.join('')}${differs ? '   <-- differs' : ''}`,
  );
}

console.log('\n  per task (checks passed):');
console.log(
  `    ${'task'.padEnd(22)} ${packs.map((p) => p.slice(0, 16).padStart(17)).join('')}`,
);
for (const task of common) {
  const cells = packs.map((p) => {
    const r = rows[p].find((x) => x.task === task);
    return `${r.passed}/${r.total}`.padStart(17);
  });
  const uniq = new Set(
    packs.map((p) => rows[p].find((x) => x.task === task).passed),
  );
  console.log(
    `    ${task.padEnd(22)}${cells.join('')}${uniq.size > 1 ? '   <-- differs' : ''}`,
  );
}
console.log('');
