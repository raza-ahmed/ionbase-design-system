#!/usr/bin/env node
/**
 * Each generated demo screen against the real one.
 *
 *   node score/demo-compare.mjs --out results/<run>
 *
 * Reads that run's results.json, written by run.mjs with
 * `--corpus prompts/demo-screens.json`. For every pack and screen it reports,
 * as the median over samples:
 *
 *   recall   the share of the real screen's IonBase components it used
 *   extra    IonBase components it used that the real screen does not
 *   compiles how many samples type-check
 *   states   how many samples handle every state the brief requires
 *
 * Recall is a comparison between packs, not a grade: each brief describes the
 * screen as a product would, and leaves out some of what the real screen
 * does, such as New agent's phone field. Both packs get the same brief.
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--out');
if (i < 0) {
  console.error('Usage: node score/demo-compare.mjs --out results/<run>');
  process.exit(1);
}
const out = resolve(process.argv[i + 1]);
const { results } = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8'));
const { tasks } = JSON.parse(
  readFileSync(join(HERE, '..', 'prompts', 'demo-screens.json'), 'utf8'),
);

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (x) => `${Math.round(100 * x)}%`;

const packs = [...new Set(results.map((r) => r.pack))].sort();
const rows = [];
const totals = Object.fromEntries(
  packs.map((p) => [p, { recall: [], compiles: 0, states: 0, n: 0 }]),
);

for (const task of tasks) {
  const real = new Set(task.expects.components);
  for (const pack of packs) {
    const cells = results.filter(
      (r) => r.pack === pack && r.task === task.id && 'checksPassed' in r,
    );
    if (!cells.length) continue;
    const recall = cells.map(
      (r) =>
        (r.componentsUsed ?? []).filter((c) => real.has(c)).length / real.size,
    );
    const extra = cells.map(
      (r) => (r.componentsUsed ?? []).filter((c) => !real.has(c)).length,
    );
    const compiles = cells.filter((r) => r.compiles).length;
    const states = cells.filter(
      (r) => !r.failed.includes('statesHandled'),
    ).length;
    const t = totals[pack];
    t.recall.push(...recall);
    t.compiles += compiles;
    t.states += states;
    t.n += cells.length;
    rows.push({
      screen: task.id.replace(/^demo-/, ''),
      pack,
      recall: pct(median(recall)),
      extra: median(extra),
      compiles: `${compiles}/${cells.length}`,
      states: `${states}/${cells.length}`,
    });
  }
}

console.table(rows);
console.log('\nOverall, per pack:');
console.table(
  packs.map((p) => ({
    pack: p,
    recall: pct(median(totals[p].recall)),
    compiles: `${totals[p].compiles}/${totals[p].n}`,
    states: `${totals[p].states}/${totals[p].n}`,
  })),
);
