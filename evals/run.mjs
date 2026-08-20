#!/usr/bin/env node
/**
 * Run the A/B: for each task x context pack, generate a candidate and score it.
 *
 *   node run.mjs --provider files --dir ./candidates       # score what exists
 *   node run.mjs --provider api --packs readme,contract-indexed-rules
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
import { execFileSync } from 'node:child_process';
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
const candidateDir = arg('dir', join(HERE, 'candidates'));
const model = arg('model', 'claude-opus-5');

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

    let raw;
    try {
      raw = execFileSync(
        'claude',
        ['-p', '--model', model, '--allowedTools', ''],
        {
          input: prompt,
          encoding: 'utf8',
          maxBuffer: 32 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
    } catch (e) {
      // execFileSync's message is just the command line. The reason — a usage
      // limit, a rate limit, an auth failure — is on stderr, and without it a
      // failed run is undiagnosable.
      const why = String(e.stderr || e.stdout || e.message)
        .trim()
        .slice(0, 400);
      throw new Error(why || 'claude exited non-zero with no output');
    }

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
const results = [];

const jobs = [];
for (const pack of packNames)
  for (const task of tasks) jobs.push({ pack, task });

/** Generation dominates the wall clock; scoring is local and fast. */
async function runJob({ pack, task }) {
  let produced;
  try {
    produced = await provider(task, pack);
  } catch (e) {
    process.stdout.write('x');
    return { pack, task: task.id, error: String(e.message).slice(0, 300) };
  }
  if (produced.skipped)
    return { pack, task: task.id, skipped: produced.skipped };

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
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      results.push(await runJob(job));
    }
  }),
);
process.stdout.write('\n\n');

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

const skipped = results.filter((r) => r.skipped);
if (skipped.length)
  console.log(`\n  ${skipped.length} skipped (no candidate on disk)`);

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

writeFileSync(
  join(outDir, 'results.json'),
  `${JSON.stringify({ model, provider: providerName, packs: packNames, results }, null, 2)}\n`,
);
console.log(`\n  -> ${join(outDir, 'results.json')}\n`);
