# IonBase evals

Phase 5 of [the agent-readiness plan](../docs/agent-readiness-plan.md).

Everything in phases 0–2 rests on one assumption: **that giving an agent the
contracts and the rules produces better output than giving it the README.**
Nothing had tested it. Indeed measured 80% fewer tokens at better accuracy for
structured data over prose, but that was their design system, not this one.

## What is proven, and what is not

**Proven.** The harness runs end to end. The scorer separates a deliberately
bad implementation from a good one — 2/7 checks and 5 lint errors against 10/10
and 0 — and the pipeline carries that through to a per-pack report.

## Clean run — 30 Sep to 5 Oct 2026

The first run with no access to the repo. Setup:

- `claude-opus-5-5` through `--provider claude-cli`, under the fixed harness.
- 31 tasks × 3 packs × 3 samples: all 279 cells, none rejected.
- Every saved stream was audited: no `tool_use` block, one turn each, and each
  session started with no tools and no MCP servers.

| pack                    | checks | all checks pass | compiles | compiles by sample | lint errors |
| ----------------------- | ------ | --------------- | -------- | ------------------ | ----------- |
| `readme`                | 81%    | 6/93            | 17%      | 19 / 19 / 13%      | 10          |
| `contract-indexed`      | 96%    | 62/93           | 92%      | 94 / 97 / 87%      | 5           |
| `contract-indexed-lean` | 96%    | 67/93           | 89%      | 87 / 90 / 90%      | 4           |

Per task, on the median of three samples:

| comparison                                    | checks better | worse | tied | compiles more often | less often |
| --------------------------------------------- | ------------- | ----- | ---- | ------------------- | ---------- |
| `contract-indexed` vs `readme`                | 27            | 0     | 4    | 26                  | 2          |
| `contract-indexed-lean` vs `contract-indexed` | 3             | 1     | 27   | 4                   | 6          |

**Question 1 — does the contract pack beat the README? Yes, and widely.**

- It was better on 27 tasks and worse on none, and the gap holds in every
  sample.
- The checks it wins are the ones contracts are for. The README pack misses
  an expected component 84 times, against 11 with contracts, and hand-builds
  one the system provides 63 times, against 14.
- **The compile gap is mostly one line of the package README.** Its quick
  start shows `<Button intent="primary">`, but the prop is `variant`, and
  `primary` is not one of its values. 75 of the README pack's 77 failing
  files have that error. The 14 Sep run reported the same error, and the
  README was not fixed.

**Question 2 — the rules brief — was not re-run.** Its earlier answer came
from a run with repo access, so it is open again. It is cheap to leave open:
the brief is 1% of a pack, and the same rules ship as lint.

**Question 3 — keep the inherited props.**

- Removing them gives the same checks (96%) and a pack 40% smaller on the
  contracts these tasks use, but it compiles less often: 89% against 92%,
  and worse on 6 tasks, better on 4.
- **Every failure unique to the lean pack has one cause.** `spellCheck` on
  Input and Textarea is an inherited React Aria prop typed `string`, where
  React's own DOM typing is a boolean. With the full contract, generations
  write `spellCheck="false"` (14 files). Without it they write
  `spellCheck={false}` (5 lean files, all failing; the README pack does it in
  25 files).
- The inherited block carries exactly the types an agent cannot guess, so
  trimming it saves size and costs correctness.

**Question 4 — what fails most, given contracts.**

| failure                                                | count               |
| ------------------------------------------------------ | ------------------- |
| hand-building a component the system provides          | 14                  |
| missing an expected component                          | 11                  |
| a state not handled                                    | 9 in each pack      |
| `JSX.Element` with no `JSX` namespace (React 19 types) | most `tsc` failures |
| imports of `lucide-react`, which is not a dependency   | most of the rest    |

None of those last two is about IonBase.

**Harness notes from this run:**

- A resume re-scores every finished cell before generating anything. That
  took about 10 minutes each time, and made progress look as though it had
  started again.
- When a session limit stops the run, its "remaining" count misses the cells
  that were cut off: it said 3 when 5 were left.

## Until 30 Sep 2026 the generator could read this repo

**Read every result below with this in mind.** `--provider claude-cli` passed
`--allowedTools ''`. That flag lists the tools allowed _without prompting_; it
disables none. Each generation ran in `evals/` with read access to the whole
repo: the real `ionbase-ui` type definitions and every full contract, whatever
pack it had been given.

- **How it surfaced:** three lean-pack generations on 29 Sep began with
  prose, such as "I checked the Combobox, Button and Stack type definitions"
  and "The API is confirmed".
- **The proof:** a probe asked to read `packages/ionbase-ui/package.json`
  answered `0.137.0`.
- **What it means:** there is no record of which generations looked, so the
  14 Sep and 29 Sep runs don't measure what their packs contain. The fixed
  harness re-runs both.

**The fix:**

- `--tools ""` removes every built-in tool, and `--strict-mcp-config` removes
  MCP servers.
- Each generation runs in an empty temporary directory.
- The eval's own system prompt replaces Claude Code's. Claude Code's prompt
  describes an agent with tools, and with the tools switched off the model
  still reached for one on the bigger tasks. The CLI then failed the cell with
  "The model's tool call could not be parsed".
- The full message stream is read, and saved under `streams/`. A generation
  with any `tool_use` block is rejected, not scored. Counting turns is not the
  same test: the failed retries above reported 2 turns with no tool at all.

### 29 Sep 2026 run — with repo access, kept for the record

`claude-opus-5-5`, 31 tasks × 3 packs × 3 samples, all 279 cells. The new
`contract-indexed-lean` pack is the question 3 pack.

| pack                    | checks | all pass | compiles | compiles by sample |
| ----------------------- | ------ | -------- | -------- | ------------------ |
| `readme`                | 79%    | 12/93    | 17%      | 16 / 16 / 19%      |
| `contract-indexed`      | 95%    | 54/93    | 91%      | 94 / 90 / 90%      |
| `contract-indexed-lean` | 95%    | 56/93    | 82%      | 84 / 74 / 87%      |

**Its one finding that holds regardless** is a gap in the contracts, not a
comparison. No contract says `useToast()` returns `{ toast, dismiss }`, and
generations guessed `show`.

## First full run — 14 Sep 2026 — with repo access

`claude-opus-5` via `--provider claude-cli`, 31 tasks x 3 packs, every cell
scored. One model, one sample per cell.

| pack                     | checks | all checks pass | compiles                                                                     | lint errors |
| ------------------------ | ------ | --------------- | ---------------------------------------------------------------------------- | ----------- |
| `readme`                 | 90%    | 15/31           | 20/31                                                                        | 2           |
| `contract-indexed`       | 97%    | 25/31           | 23/31                                                                        | 1           |
| `contract-indexed-rules` | 95%    | 21/31           | 21/31                                                                        | 0           |
| `contract-indexed-lean`  | 67,227 | 8%              | the indexed pack with every inherited (React Aria) prop removed — question 3 |

Per task, against `readme`: `contract-indexed` scored higher on 14, lower on
**0**, tied 17. `contract-indexed-rules` scored higher on 13, lower on 3.

**Question 1 — does the contract pack beat the README? Yes.** Never worse on a
single task, and the gap is where the contracts should help: `readme` missed an
expected component on 13 tasks against 4, and hand-rolled one the system
provides on 10 against 2.

**Question 2 — does the rules brief add anything? Not here.** It lost to
`contract-indexed` 5 tasks to 1. The rules also ship as lint, which catches the
same things after generation; a 1% brief that does not move the result is not
yet earning its place in the prompt.

**Not answered.** Question 3 (inherited ARIA props) was not tested. And a
quarter to a third of every pack fails `tsc`, contracts included — the largest
defect in the output, and not one any pack fixed. Look there next.

**A scorer bug was fixed before these numbers were taken.**
`noInventedComponents` counted every component a candidate declared for itself
as a hallucinated system component. Unfixed, it was the most-failed check at 34,
all false, and it hit the contract packs hardest because they produce more
helpers — a bug in the grader that ran against the hypothesis under test. The
pre-fix run is kept for comparison; generations were not repeated.

## Three parts

### Context packs — `context/build-packs.mjs`

Assembles the six variants the A/B compares and measures each exactly. This is
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
