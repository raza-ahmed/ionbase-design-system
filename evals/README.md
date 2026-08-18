# IonBase evals

Phase 5 of [the agent-readiness plan](../docs/agent-readiness-plan.md).

Everything in phases 0–2 rests on one assumption: **that giving an agent the
contracts and the rules produces better output than giving it the README.**
Nothing had tested it. Indeed measured 80% fewer tokens at better accuracy for
structured data over prose, but that was their design system, not this one.

## What is proven, and what is not

**Proven.** The harness runs end to end. The scorer separates a deliberately
bad implementation from a good one — 1/7 checks and 5 lint errors against 7/7
and 0 — and the pipeline carries that through to a per-pack report.

**Not proven, and not claimed anywhere.** No model has generated anything here.
The only candidates so far are two fixtures written by hand, which measure the
scorer and nothing else. **Do not read `14% vs 100%` from a fixture run as a
result about context packs.** The accuracy half needs the `api` provider and
costs money to run.

## Three parts

### Context packs — `context/build-packs.mjs`

Assembles the five variants the A/B compares and measures each exactly. This is
the cheap half of the answer and needs no model:

| pack                     | chars   | vs contract-all | what it is                                                  |
| ------------------------ | ------- | --------------- | ----------------------------------------------------------- |
| `readme`                 | 10,073  | 7%              | the package README alone — the pre-plan baseline            |
| `manifest`               | 180,369 | 125%            | README + the phase-0 Storybook manifest                     |
| `contract-all`           | 144,613 | 100%            | README + every contract. The wrong way to use phase 1.      |
| `contract-indexed`       | 79,331  | 55%             | README + the index + the 6 contracts a typical task touches |
| `contract-indexed-rules` | 80,135  | 55%             | the above plus the lint rules the output is graded against  |

Two things fall out of that table before any model runs:

- **The phase-0 manifest is larger than all 35 contracts combined.** It carries
  249 story snippets and prop tables that are mostly empty (see phase 0's
  findings), and it costs more than the artifact that replaced it.
- **The index tier earns its keep.** Loading only what a task touches is 45%
  smaller than loading everything, and the rules brief costs 804 chars — 1% —
  on top.

Token counts in that file are estimates at 4 chars/token and are labelled as
such. Bytes are exact. There is no tokenizer in this repo and inventing
precision would undercut the point of measuring.

### Corpus — `prompts/corpus.json`

32 enterprise SaaS tasks: a user table with bulk actions, a billing cancel flow,
SSO configuration, an audit log, a CSV import with per-row validation. Not "make
a button".

Each task carries `expects` (machine-checkable) and `traps` — 89 of them — which
is what an unhelped model is expected to get wrong. A corpus of vague asks
measures nothing, because every grader disagrees about what good looks like.

Coverage is deliberately skewed toward what agents omit: empty, loading and
error states, and choices that type-check either way.

### Scorer — `score/score.mjs`

Runs the same tooling a consumer would, rather than a bespoke rubric — a grader
that invents its own standard measures the grader.

| check                  | how                                                    |
| ---------------------- | ------------------------------------------------------ |
| compiles               | `tsc --noEmit` against the real `ionbase-ui` types     |
| lint                   | the shipped `ionbase-ui/eslint-plugin`                 |
| importsIonbase         | AST                                                    |
| noHandRolled           | `<table>` where `Table` exists, and so on              |
| noInventedComponents   | every JSX component exists in the contracts            |
| expectedComponents     | the task's `expects.components`                        |
| statesHandled          | **heuristic** — greps for empty/loading/error branches |
| noRawStyleValues       | AST                                                    |
| noKnownContrastFailure | matches against `a11y.knownIssues` from the contracts  |

`statesHandled` is labelled a heuristic in the code and in the output because it
is one: a variable named `error` that renders nothing will fool it. It is
directional, not a proof. Overstating what a check knows is how an eval becomes
theatre.

Note that the bad fixture **compiles**. Plain HTML type-checks fine — which is
exactly why the other eight checks exist.

## Running it

```bash
node context/build-packs.mjs                      # measure the packs
node score/score.mjs <file.tsx> --task users-table
node run.mjs --provider files --dir ./candidates  # grade files on disk
```

`--provider files` reads `<dir>/<pack>/<task>.tsx`, needs no model, and grades
output from any tool.

`--provider api` generates with Claude. It needs `@anthropic-ai/sdk`, which is
**deliberately not a dependency of this repo** — nothing here costs anything
until someone opts in:

```bash
pnpm --filter @ionbase-ui/evals add -D @anthropic-ai/sdk
node run.mjs --provider api --packs readme,contract-indexed-rules
```

Credentials come from `ANTHROPIC_API_KEY` or an `ant auth login` profile; the
zero-arg client finds either. The pack goes in a cached system block and the
task after it, so a full run pays for the pack once per pack rather than once
per task.

## What a real run should answer

1. **Does the contract pack beat the README?** If not, phases 1 and 2 did not
   earn their keep and should be reconsidered rather than defended.
2. **Does the rules brief add anything over the contracts alone?** It costs 1%.
3. **Do the inherited ARIA props help or hurt?** 86% of Button's props block is
   39 inherited props; a lean contract would be 42% smaller. Trimming them on a
   hunch is exactly what this harness exists to prevent — test it.
4. **Which check fails most?** That is the list of what to fix in the system,
   and it is more useful than the aggregate score.
