#!/usr/bin/env node
/**
 * Run the A/B: for each task x context pack, generate a candidate and score it.
 *
 *   node run.mjs --provider files --dir ./candidates       # score what exists
 *   node run.mjs --provider api --packs readme,contract-indexed-rules
 *   node run.mjs --provider claude-cli --limit 10           # one chunk, then stop
 *
 * A run is resumable and chunkable, because the first real one was not: it hit a
 * session limit two thirds of the way through a 93-cell grid, recorded the
 * remaining 70 cells as errors, and overwrote the results file with them.
 * Generations already on disk are reused, `--limit` caps how many new ones an
 * invocation pays for, a usage limit stops the queue instead of draining it, and
 * results are merged into the existing file after every job.
 *
 * The question this exists to answer is the one the whole agent-readiness plan
 * assumes: does handing an agent the contracts and rules actually produce better
 * output than handing it the README? Nothing so far has tested that, and Indeed's
 * numbers are their design system, not this one.
 *
 * Two providers, because the interesting half costs money:
 *
 *   files  Score candidates already on disk, laid out as <dir>/<pack>/<task>.tsx.
 *          No model, no cost, fully deterministic. Use this to develop the
 *          scorer and to grade output from any tool.
 *
 *   api    Generate with the Anthropic SDK. Needs `@anthropic-ai/sdk` installed
 *          and credentials — an ANTHROPIC_API_KEY, or an `ant auth login`
 *          profile, which the zero-arg client picks up on its own.
 *
 * The SDK is imported lazily and is NOT a dependency of this repo. Nothing here
 * costs anything until someone chooses the api provider.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { execFile } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score, lint, typecheck } from './score/score.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKS = join(HERE, 'context', 'packs');
const corpus = JSON.parse(
  readFileSync(join(HERE, 'prompts', 'corpus.json'), 'utf8'),
);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const providerName = arg('provider', 'files');
const concurrency = Number(arg('concurrency', '4'));
const packNames = arg('packs', 'readme,contract-indexed-rules').split(',');
const taskFilter = arg('tasks', null)?.split(',') ?? null;
const outDir = resolve(arg('out', join(HERE, 'results')));
// Resolved, not raw. The scorer runs eslint and tsc with cwd at the repo root,
// so a relative --dir resolved against the wrong directory and every candidate
// came back "No files matching the pattern" — a lint pass of zero files, which
// scores as zero lint errors rather than as an error.
const candidateDir = resolve(arg('dir', join(HERE, 'candidates')));
const model = arg('model', 'claude-opus-5');
// A chunk is measured in GENERATIONS, not jobs: a resumed candidate costs
// nothing and must not count against the budget, or a mostly-resumed run would
// stop having done almost no new work. Workers check the budget before pulling,
// so a chunk can overshoot by at most concurrency-1.
const limit = Number(arg('limit', 'Infinity'));

const tasks = corpus.tasks.filter(
  (t) => !taskFilter || taskFilter.includes(t.id),
);

/* ------------------------------------------------------------------ prompts */

function packContext(pack) {
  const dir = join(PACKS, pack);
  if (!existsSync(dir)) {
    throw new Error(`No pack "${pack}". Run: node context/build-packs.mjs`);
  }
  return readdirSync(dir)
    .filter((f) => f !== 'PACK.json')
    .map(
      (f) =>
        `<file name="${f}">\n${readFileSync(join(dir, f), 'utf8')}\n</file>`,
    )
    .join('\n\n');
}

const SYSTEM = `You are building UI for an enterprise SaaS application that uses the IonBase design system.

Reference material about the design system is provided below. Use it.

Return ONE TypeScript React component file and nothing else — no prose, no
markdown fences, no explanation. It must compile under strict TypeScript.`;

const userPrompt = (task) =>
  `${task.prompt}\n\nReturn a single .tsx file implementing this.`;

/* ---------------------------------------------------------------- providers */

/**
 * The CLI, run without blocking the event loop, prompt on stdin.
 *
 * On failure execFile's own message is just the command line. The reason — a
 * usage limit, a rate limit, an auth failure — is on stderr, and without it a
 * failed run is undiagnosable.
 */
const claude = (args, input) =>
  new Promise((ok, fail) => {
    const child = execFile(
      'claude',
      args,
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
      (e, stdout, stderr) => {
        if (!e) return ok(stdout);
        const why = String(stderr || stdout || e.message)
          .trim()
          .slice(0, 400);
        fail(new Error(why || 'claude exited non-zero with no output'));
      },
    );
    child.stdin.end(input);
  });

const providers = {
  /** Score candidates already written to disk. */
  async files(task, pack) {
    const p = join(candidateDir, pack, `${task.id}.tsx`);
    if (!existsSync(p)) return { skipped: `no candidate at ${p}` };
    return { file: p };
  },

  /**
   * Generate with the `claude` CLI in headless mode.
   *
   * Uses whatever credentials Claude Code already has, so it needs no API key —
   * which is why it exists: this machine has no ANTHROPIC_API_KEY and no `ant`
   * profile, and an eval that cannot be run is not an eval.
   *
   * The tradeoff is real and worth stating: every invocation is a FRESH session,
   * so the pack is re-read from scratch each time and there is no prompt cache
   * across tasks. A run costs roughly (pack size x tasks) input tokens. The `api`
   * provider caches the pack and is much cheaper per task at scale.
   *
   * Tools are disabled. The task is pure generation, and a model that goes off
   * to read files would be scored on something other than what it was given.
   */
  async claudeCli(task, pack) {
    const dir = join(outDir, 'generated', pack);
    const file = join(dir, `${task.id}.tsx`);
    // Resume. A generation that already succeeded is not re-run — a usage limit
    // or a network blip part-way through a run should cost the remaining work,
    // not all of it. Pass --force to regenerate.
    if (existsSync(file) && !process.argv.includes('--force')) {
      return { file, resumed: true };
    }

    const prompt = [
      SYSTEM,
      '',
      'Reference material about the design system:',
      '',
      packContext(pack),
      '',
      `TASK: ${task.prompt}`,
      '',
      'Return a single .tsx file implementing this.',
    ].join('\n');

    // MUST NOT be execFileSync. The runner spawns `concurrency` async workers,
    // but a synchronous child blocks the single event loop, so all of them
    // queue behind one call and --concurrency silently means 1. Measured at
    // 7.4 minutes per generation serially: 11 hours for a 93-job run that takes
    // under two when the flag does what it says.
    const raw = await claude(
      ['-p', '--model', model, '--allowedTools', ''],
      prompt,
    );

    const code = raw
      .replace(/^```(?:tsx?|typescript|jsx?)?\n/, '')
      .replace(/\n```\s*$/, '')
      .trim();

    mkdirSync(dir, { recursive: true });
    writeFileSync(file, `${code}\n`);
    return { file, promptChars: prompt.length };
  },

  /** Generate with the Anthropic SDK. Lazily imported so the SDK stays optional. */
  async api(task, pack) {
    let Anthropic;
    try {
      ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
    } catch {
      throw new Error(
        'The api provider needs the SDK: pnpm --filter @ionbase-ui/evals add -D @anthropic-ai/sdk',
      );
    }
    // Zero-arg client: picks up ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an
    // `ant auth login` profile. An unset key does not mean no credentials.
    const client = new Anthropic();

    const stream = client.messages.stream({
      model,
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: [
        // The pack is the same for every task in a run, so it goes first and is
        // cached; the task varies and goes after the breakpoint.
        { type: 'text', text: SYSTEM },
        {
          type: 'text',
          text: packContext(pack),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt(task) }],
    });
    const message = await stream.finalMessage();
    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Models sometimes fence anyway. Strip it rather than fail the candidate for
    // a formatting slip that says nothing about design-system knowledge.
    const code = text
      .replace(/^```(?:tsx?|typescript)?\n/, '')
      .replace(/\n```\s*$/, '');

    const dir = join(outDir, 'generated', pack);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${task.id}.tsx`);
    writeFileSync(file, code);
    return { file, usage: message.usage };
  },
};

/* --------------------------------------------------------------------- main */

const provider =
  providers[providerName === 'claude-cli' ? 'claudeCli' : providerName];
if (!provider) {
  console.error(
    `Unknown provider "${providerName}". Use: ${Object.keys(providers).join(', ')}`,
  );
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const resultsPath = join(outDir, 'results.json');

/**
 * A usage limit is not a per-job failure, it is the end of the run.
 *
 * Every remaining job hits the same wall in milliseconds, so a queue with 70
 * jobs left in it drains into 70 identical error rows and the report reads as
 * though the model failed 70 tasks. That is exactly what the 3 Sep 2026 run
 * recorded: 23 of 93 cells scored, the other 70 marked errored, none of them
 * ever attempted against a working session. Stop pulling work instead.
 */
const isLimit = (m) =>
  /usage limit|session limit|rate limit|quota|overloaded|too many requests|529/i.test(
    m,
  );

/**
 * Prior results are MERGED, not overwritten.
 *
 * The file was written once at the end from this invocation's array alone, so
 * running a single pack silently dropped every other pack's rows — the opposite
 * of what chunking needs. Rows are keyed by pack+task and the newer row wins,
 * so re-running a cell replaces it and leaves the rest standing. `--fresh`
 * starts over.
 */
const key = (r) => `${r.pack}\u0000${r.task}`;
const merged = new Map();
const knownPacks = new Set(packNames);
if (existsSync(resultsPath) && !process.argv.includes('--fresh')) {
  const prior = JSON.parse(readFileSync(resultsPath, 'utf8'));
  for (const pack of prior.packs ?? []) knownPacks.add(pack);
  for (const r of prior.results ?? []) {
    // A limit row is not a result, it is the mark where a run stopped. Keeping
    // it would make the cell look permanently failed when nothing was ever
    // generated for it, and would hide it from the remaining-work count.
    if (r.error && isLimit(r.error)) continue;
    if (r.skipped) continue;
    merged.set(key(r), r);
  }
}

const flush = () =>
  writeFileSync(
    resultsPath,
    `${JSON.stringify(
      {
        model,
        provider: providerName,
        packs: [...knownPacks],
        results: [...merged.values()],
      },
      null,
      2,
    )}\n`,
  );

// Task-major, NOT pack-major. The grid is an A/B, so a run that stops early is
// only readable if every cell it did finish has its counterparts: generating one
// task across all packs before moving on means a half-finished run compares
// like with like. Pack-major ordering is what left `contract-indexed-rules` with
// zero rows on 3 Sep while `readme` had nineteen.
const jobs = [];
for (const task of tasks)
  for (const pack of packNames) jobs.push({ pack, task });

let halted = null;
let generated = 0;
const skippedNow = [];

/** Generation dominates the wall clock; scoring is local and fast. */
async function runJob({ pack, task }) {
  let produced;
  try {
    produced = await provider(task, pack);
  } catch (e) {
    const why = String(e.message).slice(0, 300);
    if (isLimit(why)) {
      halted ??= why;
      process.stdout.write('!');
      // Not recorded as a result — see isLimit. The cell is left unattempted so
      // the next chunk picks it up.
      return { pack, task: task.id, error: why, halted: true };
    }
    process.stdout.write('x');
    return { pack, task: task.id, error: why };
  }
  if (produced.skipped)
    return { pack, task: task.id, skipped: produced.skipped };
  // Only a real generation spends budget. `resumed` costs nothing.
  if (!produced.resumed) generated += 1;

  const s = score(produced.file, task.id);
  const messages = lint(produced.file);
  const tc = typecheck(produced.file);
  const checks = Object.values(s.checks);
  process.stdout.write('.');

  return {
    pack,
    task: task.id,
    checksPassed: checks.filter((c) => c.pass).length,
    checksTotal: checks.length,
    lintErrors: messages.filter((m) => m.severity === 2).length,
    lintByRule: messages.reduce((a, m) => {
      if (m.ruleId) a[m.ruleId] = (a[m.ruleId] ?? 0) + 1;
      return a;
    }, {}),
    compiles: tc.pass,
    failed: Object.entries(s.checks)
      .filter(([, c]) => !c.pass)
      .map(([n]) => n),
    componentsUsed: s.componentsUsed,
    ...(produced.promptChars ? { promptChars: produced.promptChars } : {}),
    ...(produced.usage ? { usage: produced.usage } : {}),
  };
}

let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (cursor < jobs.length && !halted && generated < limit) {
      const job = jobs[cursor++];
      const r = await runJob(job);
      if (r.halted) continue;
      // A skip is an absence, not a result: the candidate was never on disk.
      // Persisting it would let a cell that has produced nothing count as a row
      // in a file that is meant to hold measurements.
      if (r.skipped) {
        skippedNow.push(r);
        continue;
      }
      merged.set(key(r), r);
      // Written after every job, not once at the end. Scoring is local and
      // cheap; losing an hour of it to a Ctrl-C is not.
      flush();
    }
  }),
);
process.stdout.write('\n\n');

const results = [...merged.values()];

/* ------------------------------------------------------------------- report */

const live = results.filter((r) => !r.skipped && !r.error);
const byPack = {};
for (const r of live) (byPack[r.pack] ??= []).push(r);

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(0)}%` : '—');
console.log(
  `  ${'pack'.padEnd(26)} ${'tasks'.padStart(5)} ${'checks'.padStart(8)} ${'compiles'.padStart(9)} ${'lint errs'.padStart(10)}`,
);
for (const [pack, rows] of Object.entries(byPack)) {
  const cp = rows.reduce((a, r) => a + r.checksPassed, 0);
  const ct = rows.reduce((a, r) => a + r.checksTotal, 0);
  const comp = rows.filter((r) => r.compiles).length;
  const lintErrs = rows.reduce((a, r) => a + r.lintErrors, 0);
  console.log(
    `  ${pack.padEnd(26)} ${String(rows.length).padStart(5)} ${pct(cp, ct).padStart(8)} ${pct(comp, rows.length).padStart(9)} ${String(lintErrs).padStart(10)}`,
  );
}

if (skippedNow.length)
  console.log(`\n  ${skippedNow.length} skipped (no candidate on disk)`);

// Which checks fail most — this is what tells you what to fix in the system.
const failCounts = {};
for (const r of live)
  for (const f of r.failed) failCounts[f] = (failCounts[f] ?? 0) + 1;
if (Object.keys(failCounts).length) {
  console.log('\n  most-failed checks:');
  for (const [name, n] of Object.entries(failCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${String(n).padStart(3)}  ${name}`);
  }
}

flush();

// What is left, stated in cells rather than percentages — the number that says
// whether a pack's result can be read yet. `contract-indexed` scored 4 of 31 on
// 3 Sep and the report said nothing about the other 27, which is how a run
// missing two thirds of its grid gets quoted as a finding.
// Skipped and errored rows are not scored cells. Counting them as scored is how
// a grid with nothing in it reports itself complete.
const scored = new Set(
  [...merged.values()].filter((r) => !r.skipped && !r.error).map(key),
);
const outstanding = jobs.filter(
  (j) => !scored.has(key({ pack: j.pack, task: j.task.id })),
);
console.log(
  `\n  ${jobs.length - outstanding.length}/${jobs.length} cells scored for this invocation's packs`,
);
if (outstanding.length) {
  const byPackLeft = {};
  for (const j of outstanding)
    byPackLeft[j.pack] = (byPackLeft[j.pack] ?? 0) + 1;
  console.log(
    `  ${outstanding.length} remaining: ${Object.entries(byPackLeft)
      .map(([p, n]) => `${p} ${n}`)
      .join(', ')}`,
  );
}

console.log(`\n  -> ${resultsPath}\n`);

if (halted) {
  console.error(`  STOPPED: ${halted}`);
  console.error(
    '  Nothing was recorded for the unattempted cells. Re-run the same command\n' +
      '  when the limit resets; completed generations are resumed, not repaid.\n',
  );
  // EX_TEMPFAIL. A wrapper chunking through the grid needs to tell "come back
  // later" apart from "the run finished", and an exit code is the only channel
  // that survives being piped.
  process.exit(75);
}
if (generated >= limit) {
  console.log(
    `  Chunk budget of ${limit} generation(s) reached. Re-run to continue.\n`,
  );
}
