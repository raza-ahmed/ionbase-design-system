#!/usr/bin/env node
/**
 * Build the context packs the A/B compares, and measure what each costs.
 *
 * The whole agent-readiness plan rests on an unproven claim: that giving an
 * agent structured contracts produces better output than giving it a README.
 * Indeed measured 80% fewer tokens at better accuracy for JSON over Markdown.
 * That is their system, not this one, and nothing here has been checked.
 *
 * This file answers the CHEAP half — what each pack costs — exactly and with no
 * model involved. The expensive half (does accuracy improve) needs generation;
 * see ../run.mjs.
 *
 * Sizes are bytes and characters, which are facts. The token column is an
 * estimate at 4 chars/token and is labelled as such — there is no tokenizer in
 * this repo and inventing precision would undercut the point of measuring.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UI = join(ROOT, 'packages', 'ionbase-ui');
const OUT = join(ROOT, 'evals', 'context', 'packs');

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const readJson = (p) =>
  existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;

const README = read(join(UI, 'README.md'));
const META_DIR = join(UI, 'dist', 'meta');
const index = readJson(join(META_DIR, 'index.json'));
const components = readJson(join(META_DIR, 'components.json'));
const manifest =
  readJson(
    join(
      ROOT,
      'apps',
      'storybook',
      'storybook-static',
      'manifests',
      'components.json',
    ),
  ) ?? null;

if (!README || !index || !components) {
  console.error('Run `pnpm build` first — packs are assembled from dist/meta.');
  process.exit(1);
}

/**
 * The indexed packs are assembled PER TASK, from that task's own expected
 * components — which is what "indexed" was always supposed to mean.
 *
 * They used to ship one hardcoded list of six for all 31 tasks. The cost was
 * invisible and large: a task built on Checkbox and Toggle was graded on
 * contracts for Table, Modal and Badge, so the pack under test frequently did
 * not contain the component the task was about. Every "the contracts did not
 * prevent this" conclusion drawn from such a cell was measuring an absent file.
 *
 * It also understated the packs. They still beat the README 14 tasks to 0 while
 * carrying the wrong contracts much of the time.
 */
const corpus = JSON.parse(
  readFileSync(join(ROOT, 'evals', 'prompts', 'corpus.json'), 'utf8'),
);

/** Contracts for one task, as `meta-<Name>.json` parts. */
const contractsFor = (task) =>
  Object.fromEntries(
    (task?.expects?.components ?? [])
      .filter((c) => existsSync(join(META_DIR, `${c}.json`)))
      .map((c) => [
        `meta-${c}.json`,
        readFileSync(join(META_DIR, `${c}.json`), 'utf8'),
      ]),
  );

const packs = {
  /* What a consumer agent gets from npm today with no extra work. */
  readme: {
    describes: 'The package README alone — the pre-plan baseline.',
    parts: { 'README.md': README },
  },

  /* Phase 0. Every component, every story snippet, no intent. */
  manifest: {
    describes: 'README + the Storybook component manifest (phase 0).',
    parts: manifest
      ? {
          'README.md': README,
          'components-manifest.json': JSON.stringify(manifest),
        }
      : null,
    skipIf: !manifest && 'no built Storybook manifest — run build-storybook',
  },

  /* The naive way to use phase 1: load everything. */
  'contract-all': {
    describes:
      'README + EVERY component contract. The wrong way to use phase 1.',
    parts: {
      'README.md': README,
      'components.json': JSON.stringify(components),
    },
  },

  /* The intended way: cheap index, then only what the task needs. */
  'contract-indexed': {
    describes:
      'README + the contract index + contracts for the components a typical task touches. The intended phase 1 usage.',
    parts: {
      'README.md': README,
      'meta-index.json': JSON.stringify(index),
    },
    perTask: true,
  },

  /* Phase 2 on top: the rules the output will actually be judged by. */
  'contract-indexed-rules': {
    describes:
      'The indexed contract pack plus the lint rules the output is graded against (phase 2).',
    parts: null, // filled below
  },
};

const RULES_BRIEF = `# Rules your output will be checked against

These are enforced by \`ionbase-ui/eslint-plugin\` and \`ionbase-ui/stylelint-config\`.

- no-deprecated-props — never use a prop marked deprecated in a contract.
- no-known-contrast-failure — never use a prop combination listed under
  a11y.knownIssues in a contract.
- no-raw-style-values — no raw colours or spacing in inline styles. Use the
  custom properties from ionbase-ui/tokens.
- needs-accessible-name — an icon-only control needs aria-label.
- one-primary-action — at most one primary Button per Modal. Button's default
  variant IS primary, so an unlabelled <Button> counts.

Import components from 'ionbase-ui'. Import the stylesheet once at the app entry
with \`import 'ionbase-ui/styles'\`. Do not hand-roll a component the system
already provides.
`;

packs['contract-indexed-rules'].parts = {
  ...packs['contract-indexed'].parts,
  'RULES.md': RULES_BRIEF,
};
packs['contract-indexed-rules'].perTask = true;

mkdirSync(OUT, { recursive: true });

const rows = [];
for (const [name, pack] of Object.entries(packs)) {
  if (!pack.parts) {
    rows.push({ name, skipped: pack.skipIf ?? 'not available' });
    continue;
  }
  const dir = join(OUT, name);
  // Rebuilt from scratch: a pack that used to ship fixed contracts would
  // otherwise keep them on disk forever, and a stale meta-*.json in the shared
  // directory is invisible — it just quietly joins every task's prompt.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let chars = 0;
  for (const [file, content] of Object.entries(pack.parts)) {
    writeFileSync(join(dir, file), content);
    chars += content.length;
  }
  writeFileSync(
    join(dir, 'PACK.json'),
    `${JSON.stringify({ name, describes: pack.describes, files: Object.keys(pack.parts) }, null, 2)}\n`,
  );
  // Per-task contracts live in tasks/<id>/ beside the shared files. run.mjs
  // concatenates the shared directory with the one for the task it is running.
  let perTaskAvg = null;
  if (pack.perTask) {
    let total = 0;
    for (const task of corpus.tasks) {
      const tdir = join(dir, 'tasks', task.id);
      mkdirSync(tdir, { recursive: true });
      let tchars = 0;
      for (const [file, content] of Object.entries(contractsFor(task))) {
        writeFileSync(join(tdir, file), content);
        tchars += content.length;
      }
      total += tchars;
    }
    perTaskAvg = Math.round(total / corpus.tasks.length);
  }

  rows.push({
    name,
    files: Object.keys(pack.parts).length,
    chars: chars + (perTaskAvg ?? 0),
    describes: pack.describes,
    perTaskAvg,
  });
}

const est = (c) => Math.round(c / 4);
const fmt = (n) => n.toLocaleString('en-US');

console.log('Context packs\n');
const live = rows.filter((r) => !r.skipped);
const base = live.find((r) => r.name === 'contract-all')?.chars ?? 0;
console.log(
  `  ${'pack'.padEnd(24)} ${'files'.padStart(5)} ${'chars'.padStart(10)} ${'est. tokens'.padStart(12)}  vs contract-all`,
);
for (const r of live) {
  const rel = base ? `${((r.chars / base) * 100).toFixed(0)}%` : '—';
  console.log(
    `  ${r.name.padEnd(24)} ${String(r.files).padStart(5)} ${fmt(r.chars).padStart(10)} ${fmt(est(r.chars)).padStart(12)}  ${rel.padStart(6)}`,
  );
}
for (const r of rows.filter((x) => x.skipped)) {
  console.log(`  ${r.name.padEnd(24)} skipped — ${r.skipped}`);
}

const indexed = live.find((r) => r.name === 'contract-indexed');
const all = live.find((r) => r.name === 'contract-all');
if (indexed && all) {
  console.log(
    `\n  Indexed vs load-everything: ${fmt(all.chars - indexed.chars)} fewer chars, ` +
      `${(100 - (indexed.chars / all.chars) * 100).toFixed(0)}% smaller, ` +
      `averaged over the ${corpus.tasks.length} tasks — each carries only its own contracts.`,
  );
}
console.log(
  '\n  Token counts are estimates at 4 chars/token. Bytes are exact.',
);

writeFileSync(
  join(OUT, 'sizes.json'),
  `${JSON.stringify({ generated: 'by evals/context/build-packs.mjs', rows }, null, 2)}\n`,
);
