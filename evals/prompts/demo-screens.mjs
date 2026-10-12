#!/usr/bin/env node
/**
 * The real screen's components, for each task in demo-screens.json.
 *
 *   node prompts/demo-screens.mjs           # check: exit 1 if any task drifted
 *   node prompts/demo-screens.mjs --write   # rewrite expects.components
 *
 * A screen's reference is every name it imports from 'ionbase-ui' that has a
 * contract in dist/meta. Hooks and type-only imports such as `TableSortProps`
 * have none, so they are left out. It is read from the screen's own source,
 * not written by hand, because a hand-kept list is one the screen moves away
 * from without anyone noticing.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SCREENS = join(ROOT, 'apps', 'demo', 'src', 'screens');
const META = join(
  ROOT,
  'packages',
  'ionbase-ui',
  'dist',
  'meta',
  'components.json',
);
const FILE = join(HERE, 'demo-screens.json');

const contracted = new Set(
  Object.keys(JSON.parse(readFileSync(META, 'utf8')).components),
);

const sources = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

/** Every contracted component a screen imports from 'ionbase-ui'. */
export function screenComponents(screen) {
  const names = new Set();
  for (const file of sources(join(SCREENS, screen))) {
    const code = readFileSync(file, 'utf8');
    for (const [, list] of code.matchAll(
      /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'ionbase-ui'/g,
    ))
      for (const raw of list.split(',')) {
        const name = raw
          .replace(/^\s*type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        if (contracted.has(name)) names.add(name);
      }
  }
  return [...names].sort();
}

/** Each task whose recorded components no longer match its screen. */
export function drifted(doc) {
  return doc.tasks
    .map((task) => ({ task, real: screenComponents(task.screen) }))
    .filter(
      ({ task, real }) =>
        JSON.stringify(real) !== JSON.stringify(task.expects.components),
    );
}

if (process.argv[1] !== fileURLToPath(import.meta.url)) {
  // Imported by build-packs for drifted() — not run.
} else {
  const doc = JSON.parse(readFileSync(FILE, 'utf8'));
  const drift = [];
  for (const task of doc.tasks) {
    const real = screenComponents(task.screen);
    if (JSON.stringify(real) !== JSON.stringify(task.expects.components)) {
      drift.push(
        `${task.id}: the ${task.screen} screen now uses ${real.join(', ')}`,
      );
      task.expects.components = real;
    }
  }

  if (process.argv.includes('--write')) {
    writeFileSync(FILE, `${JSON.stringify(doc, null, 2)}\n`);
    console.log(`demo-screens.json: ${doc.tasks.length} screens written`);
  } else if (drift.length) {
    console.error(
      `demo-screens.json is out of date with the screens. Run node prompts/demo-screens.mjs --write\n\n${drift.join('\n')}`,
    );
    process.exit(1);
  } else {
    console.log(
      `demo-screens.json: ${doc.tasks.length} screens match their source`,
    );
  }
}
