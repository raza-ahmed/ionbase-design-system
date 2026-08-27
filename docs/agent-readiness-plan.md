# Making IonBase agent-first

_Proposal, 18 Aug 2026. Not yet a decision — nothing here has been implemented._

A design system used to be a contract between a design team and a development
team. IonBase is now being authored on the assumption that **the thing consuming
it is an agent**, and in some products there is no developer downstream at all.
That changes what the system has to ship, and it changes what "done" means for a
component.

This document is the plan for that shift: where IonBase already stands, what is
missing, and the order to close it in.

---

## 1. The reframe: three audiences, not one

The single most useful move is to stop saying "agents" as one word. IonBase
serves three different consumers with almost no overlap in what they need.

| Audience                 | Who it is                                                                               | Reads                                                                | State today                                          |
| ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| **A. Contributor agent** | works _inside_ this repo — changes tokens, adds components, edits Figma                 | [`AGENTS.md`](../AGENTS.md), the gates, `packages/tokens/figma/*.js` | **Strong.** Genuinely ahead of the field.            |
| **B. Consumer agent**    | builds an enterprise SaaS app _with_ `ionbase-ui`, and may never see this repo          | the npm package, the README, the Storybook site                      | **Weak.** A prose README and a human-facing website. |
| **C. Product agent**     | the agent that ships _inside_ the app IonBase builds — the copilot, the workflow runner | components that do not exist yet                                     | **Absent.**                                          |

Everything below is organised by which of these it serves. The bulk of the work
is **B**, because that is the audience the whole premise of "the agent builds the
product" depends on, and it is currently served worst.

---

## 2. Honest scorecard — what IonBase already gets right

Worth stating plainly, because several of these are things the published field
guidance is still telling teams to go build, and they are already here:

- **`AGENTS.md` as the canonical, vendor-neutral entry point**, with `CLAUDE.md`
  as a pointer holding no content. This is exactly the convention that
  consolidated across the industry in 2026, and the "one source, many pointers"
  rule is the part most teams get wrong.
- **Deterministic gates rather than prose rules.** `tokens:audit`, `tokens:tier`,
  `tokens:verify`, `tokens:bindings`, `tokens:geometry`. An agent cannot be
  trusted to _remember_ a constraint; it can be stopped by one. This is the
  single most important structural property an agent-first system can have, and
  IonBase has five of them.
- **Stylelint `declaration-strict-value` + `color-no-hex`.** A compliance linter
  that catches the exact failure mode agents have — inventing a plausible hex
  instead of reaching for a token.
- **A layered architecture that matches what Spotify rebuilt Encore into.**
  react-aria supplies behaviour, tokens supply foundation, the CSS files supply
  style. Spotify's stated reason was that "smaller, clearly separated context
  units are significantly easier for language models to process than nested
  component bundles" — IonBase arrived there for maintainability reasons and got
  the agent benefit free.
- **A single source of truth with drift detection.** Figma owns names and values;
  checksums and per-collection counts catch divergence. The `surface/success-strong`
  incident recorded in `AGENTS.md` is a case study in why count-diffing matters.
- **Anti-patterns written down with their cost.** The hover-is-a-pulse section
  saves an agent a full debugging cycle. Documentation of _failed_ approaches is
  disproportionately valuable to an agent, which otherwise re-derives them.
- **`@storybook/addon-mcp@0.7.0` is already installed.** It is not yet doing
  anything (see 4.1) but the dependency is there.

The gap is not competence. It is that all of this points inward, at audience A.

---

## 3. The gaps

### For the consumer agent (B)

1. **No component manifest.** `experimentalComponentsManifest` is not enabled in
   [`.storybook/main.ts`](../apps/storybook/.storybook/main.ts), so the installed
   MCP addon has nothing structured to serve. An agent building with IonBase must
   read `.tsx` source or guess.
2. **No intent metadata anywhere.** Prop types say `variant?: 'primary-brand' |
'destructive' | …`. Nothing says _when_ `destructive` is correct, that
   `primary-soft` and `secondary` are near-substitutes, that `Link` — not
   `Button` — is what navigates, or that there must be one primary action per
   view. Docgen gives an agent the API. It does not give it judgement.
3. **No `llms.txt`, no markdown mirrors.** Cloudscape (AWS), Nord (Nordhealth),
   and Ant Design all serve `/llms.txt` plus `<page>/index.html.md` and
   `<page>/index.html.json`. The IonBase Storybook site serves neither, so an
   agent pointed at the docs gets a JS-rendered app it cannot read.
4. **Token values are not queryable.** `ionbase-ui/tokens-js` exports
   `var(--…)` _references_ — perfect for code, useless for the decision that
   precedes it. An agent choosing a surface for an error banner cannot ask what
   `surface/error-subtle` resolves to in dark, or what text roles are legible on
   it.
5. **The guardrails do not travel.** `stylelint.config.js` and the five token
   gates live in this repo. The consumer app — the one the agent is actually
   writing — inherits none of them. **If there is no developer downstream, the
   only thing standing between the agent and drift is a gate that shipped in the
   package.**
6. **Contrast is still unchecked**, and `AGENTS.md` says so. Two AA failures
   reached production once. Two more pairings are knowingly unfixed
   (`surface/success` + `text/on-color` at 3.69:1 Light; `surface/information` +
   `text/on-color` at 3.44:1 Dark). An agent has no way to learn this and will
   compose both — they are the obvious combinations.
7. **No deprecation data.** `disabled` → `isDisabled` and the `xs` icon rung
   moving 12 → 14 are both recorded in prose. An agent working from pre-0.7
   training data will emit the old API, and `size="xs"` still type-checks.
8. **No Code Connect.** Zero `.figma.ts` files, despite a mature Figma pipeline
   and MCP access to the file. Figma's own position is that Code Connect is the
   highest-leverage thing for design-to-code accuracy, because it lets the agent
   pull the _real_ component instead of generating a lookalike.
9. **26 components, zero patterns.** Enterprise SaaS agents do not fail at
   "render a button". They fail at "build the users table with filters, bulk
   select, empty state, loading skeleton, and a destructive confirm" — the screen
   level. There is nothing above the component tier to compose from.

### For the product agent (C)

10. **No components for AI features.** Enterprise SaaS in 2026 ships agents
    _inside_ the product, and those need UI: streaming output, tool-use
    disclosure, citations, confidence, an approval gate for actions above a risk
    threshold, a plain-language activity log, and a visible stop control. If
    IonBase does not have these, every product built on it invents them, and they
    will be inconsistent and — for the approval and stop controls — unsafe.

---

## 4. The plan

Five phases. Phase 0 and 1 are where nearly all the return is; do not start at
phase 3 because it is more interesting.

### Phase 0 — DONE, 18 Aug 2026

Enabled in [`.storybook/main.ts`](../apps/storybook/.storybook/main.ts):

```ts
features: {
  componentsManifest: true,
  experimentalCodeExamples: true,
},
```

**The flag is `componentsManifest`, not `experimentalComponentsManifest`.** It
graduated in the 10.5 line, which is what this repo has installed. `addon-mcp`
still accepts the old spelling as a fallback, so getting it wrong fails silently
— verify at `/manifests/components.html`, never by reading the config.

Result: `/manifests/components.json`, 188KB, **26 components and 249 stories**,
every one carrying an import statement and a real JSX snippet. It ships with the
GitHub Pages build, so it is public at a stable URL, and `@storybook/addon-mcp`
— which was already installed and inert — now has something to serve.

#### What Phase 0 did not deliver, and why it changes Phase 1

**Prop tables are empty for 19 of 26 components.** Docgen reads the file a
component is _defined_ in; the stories import `ionbase-ui`, a workspace link to
`dist`, so react-docgen gets handed compiled JavaScript with the types erased.
It reports success and emits `props: []`.

Three fixes were measured, and all three are worse:

| attempt                                                        | result                                                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features.experimentalReactComponentMeta` (TS LanguageService) | 0/26                                                                                                                                               |
| `typescript.reactDocgen: 'react-docgen-typescript'`            | 0/26, and `reactDocgen` empties entirely — the vite docgen plugin only processes this project's own `.tsx`, never a linked package's `dist/*.d.ts` |
| alias `ionbase-ui` → `../src`                                  | works, **rejected** — the interaction tests deliberately exercise the built package, and this would quietly stop testing what ships                |

So the conclusion is structural, not a misconfiguration: **in a monorepo that
ships a built package, the Storybook manifest is the wrong home for the prop
table.** It is the right home for story snippets and import statements, which is
what it now provides.

Phase 1 absorbs the prop table: generate it in `packages/ionbase-ui` from its own
source `.tsx`, where docgen is trivial, and merge it into the meta artifact. That
was already the plan's rule — _props are generated, never authored_ — this just
fixes where the generator runs. It also means the meta artifact ships **inside
the npm package**, which is where the consumer agent can actually reach it,
rather than only on a docs site.

### Phase 1 — DONE. Core 18 Aug 2026, intent completed 21 Aug 2026

Shipped as `ionbase-ui/meta`. Three files per build:

| artefact                    | size    | what it is                                          |
| --------------------------- | ------- | --------------------------------------------------- |
| `dist/meta/index.json`      | 12KB    | every component, its summary and its variant unions |
| `dist/meta/<Name>.json`     | ~5–20KB | one component's full contract                       |
| `dist/meta/components.json` | 242KB   | all of them; for tooling, not for agents            |

The index tier was not in the original plan and turned out to matter most: it is
15x smaller than the full document and answers the question an agent actually
asks first. Same two-tier split Nord and Cloudscape use for `llms.txt`.

**Authored** in `packages/ionbase-ui/meta/<Name>.json` — judgement only.
**Generated** by `scripts/build-meta.mjs` — props, tokens, source, import,
and the component's own JSDoc.

**All 35 carry full intent as of 0.19.0.** The first six — `Button`, `Input`,
`Select`, `Modal`, `Table`, `Alert` — shipped in 0.16.0; the remaining 29 landed
together, written from each component's own source rationale rather than
invented, which is why they took an afternoon rather than the 1–2 hours each the
plan budgeted. The rationale was already in the files; it was not machine
readable.

#### What changed from the plan

**The prop table is generated by the TypeScript checker, not react-docgen.**
These interfaces extend `Omit<>`, `AriaButtonProps<'button'>`, `InputDOMProps`;
only real type resolution sees through that. It is also the only way to learn
_where_ a prop was declared, which is what makes the filtering possible: `Badge`
inherits **277** HTML attributes, all dropped, keeping the four that matter,
while `Button` keeps `onPress` and `isDisabled` because they come from
react-aria rather than the DOM.

That resolution also recovers things the plan did not ask for and should have:
destructuring defaults read straight out of the component body
(`variant = 'primary-brand'`), `@deprecated` tags, and clean string-literal
unions listed as `values`.

**`tokens` is generated too**, from the component's stylesheet, rather than
hand-listed as the plan proposed. A hand-kept token list is a list that goes
stale. Shared stylesheets resolve by longest kebab-prefix, so `AvatarGroup`
correctly reports `avatar.css`.

#### The gate

`pnpm --filter ionbase-ui meta:verify`. Ten checks, and **every one was
confirmed to fail on a deliberate break before being trusted** — per this repo's
own rule that a gate which cannot fail is worse than no gate:

| check                             | catches                                         |
| --------------------------------- | ----------------------------------------------- |
| variant value in union            | documenting a variant that does not exist       |
| union member documented           | a new variant added in code and never explained |
| slots are real props              | a renamed slot                                  |
| deprecations name real props      | a stale deprecation                             |
| `@deprecated` in source ⇒ in meta | a deprecation the contract never mentions       |
| ...and the reverse                | a deprecation claim with nothing behind it      |
| replacement prop exists           | pointing at a prop that was itself removed      |
| generated fields not overridden   | an intent file quietly setting `props`          |
| stylesheet tokens are defined     | a custom property no token layer provides       |
| missing intent file               | a component shipped with API and no judgement   |

The last one was a warning until 0.19.0 and is now an **error**, since every
exported component has an intent file.

#### What the intent files turned on

Two of the five lint rules read their data straight out of these files, so
writing intent is what switches the guardrails on for a component:

| rule                    | 0.18.1 | 0.19.0 |
| ----------------------- | ------ | ------ |
| `no-deprecated-props`   | 4      | 11     |
| `needs-accessible-name` | 5      | 12     |

That is the argument for the format over a docs site: prose cannot enforce.

It also produced one false positive worth recording. `needsAccessibleName` is
extracted by matching `/aria-label|accessible name/` against `a11y.requires`, so
`TableRow` documenting "every row-selection Checkbox needs a name" made the rule
demand a name on the `<tr>`. The heuristic is blunt by design; the fix is to
write each requirement on the component that actually carries it.

#### Still open

- `since` is omitted where it could not be established from the CHANGELOG. It
  was not invented.
- The a11y `knownIssues` field designed in this plan has no entries, because the
  one defect it was designed for — Button `success` at 3.69:1 — got fixed the
  same day. `surface/information` in Dark is still 3.44:1 but no component uses
  it yet. The field stays; the contrast gate in phase 2c should populate it.

### Phase 2 — Ship the guardrails, do not just keep them

The premise is that no developer reviews the output. Then the review has to be in
the package.

**2a. `ionbase-ui/stylelint-config` — DONE, 18 Aug 2026.** The rules were
_moved_ into the package rather than copied: the repo's own
`stylelint.config.js` now extends the published file. Copying would have created
the exact drift this plan warns about everywhere else.

**2b. `ionbase-ui/eslint-plugin` — DONE, 18 Aug 2026.** Five rules:
`no-deprecated-props` (with an autofix), `no-known-contrast-failure`,
`no-raw-style-values`, `needs-accessible-name`, `one-primary-action`.

Every rule's data comes from `dist/meta/components.json` — deprecations,
measured contrast ratios, which components require an accessible name, the
spacing scale, even Button's default variant. Nothing is hardcoded, so a defect
fixed in Figma stops being linted without the plugin being touched. That is
phase 1 and 2c paying for phase 2b: the contract and the measurements were the
prerequisite for rules that maintain themselves.

Messages name the fix rather than the principle. A raw `13px` reports that it is
not on the scale and that the neighbouring rungs are `var(--spacing-12)` and
`var(--spacing-14)`.

**Two rules from this plan were not built.** `destructive-needs-confirm` and
`no-nested-interactive` both need to know what _wraps_ a component, which is
usually another file; under ESLint's per-file model they would be
false-positive generators. They belong in the eval harness (phase 5).

**The packaging nearly ate both.** `files` was `["dist"]`, so the first working
version of all of this would have published an exports map pointing at paths the
tarball did not contain — and `npm publish` would not have complained. Verified
with `pnpm pack` instead.

**Honest gap:** this repo has no consumer app code, so `no-raw-style-values` —
the rule most aimed at generated UI — is not exercised by `pnpm lint`. Its
coverage is the plugin's own fixtures. Storybook runs three of the five rules;
the other two are off for reasons that do not generalise to an app, recorded in
`eslint.config.js`.

**2c. `verify-contrast.mjs` — DONE, 18 Aug 2026.** Shipped as
`pnpm --filter ionbase-ui contrast`.

It does **not** walk `interface.json` as this plan proposed. That approach was
tried and abandoned within the hour: crossing every text role with every surface
role produces 53 failures for `text/on-color` alone, nearly all meaningless,
because nothing puts on-colour text on `surface/default`. The question is not
which tokens contrast, it is **which pairs the components actually create**, and
only the shipped CSS answers that. So the gate lives in `packages/ionbase-ui`,
which has the component stylesheets and the resolved token CSS side by side.

It resolves the cascade properly — BEM blocks, compound modifiers
(`.ion-alert--solid.ion-alert--information` is its own context), state
inheritance (a hover rule overriding only the background still pairs against the
base rule's text colour), component-local `--ion-*` indirection, and alpha
compositing for translucent hover overlays. 250 pairings, 17 stylesheets, zero
skipped.

**It found three outstanding defects, two of them unknown** — all three in Dark, which is now deferred until the theme is settled in Figma (see AGENTS.md); Light has zero — and disproved a
documented assumption: `surface/information` was recorded in AGENTS.md as "not
yet used" while Alert's own stylesheet comment said it shipped. Two documents in
this repo disagreed, neither was checked, and both were partly wrong.

Accepted results carry a `kind`: `wcag-exempt` (SC 1.4.3 exempts inactive
controls — correct, will never need fixing) or `defect` (real, unfixed, reported
on every build). Collapsing those two would make the gate lie.

Results are copied into each component's `a11y.knownIssues`, which is what
finally populates the field designed in phase 1 — a contrast defect in a build
log teaches nobody; one in the contract is read by whatever is about to ship it.

Negative-tested on five deliberate breaks, **one of which it initially missed**:
renaming a token in `base.css` left `theme-dark.css` still defining it, so a
mode-agnostic coverage check saw it as covered. Coverage is per (role, mode) now,
and an unresolved token is an error rather than a quiet skip — otherwise a
renamed token just shrinks the pairing count and still exits 0.

> Phase 2 complete.

### Phase 3 — Distribution: make IonBase findable by an agent that has never seen it

**3a. `llms.txt` + markdown mirrors.** Follow the Cloudscape shape exactly, since
it is the most complete public implementation and agents are increasingly trained
to expect it:

```
https://raza-ahmed.github.io/ionbase-design-system/llms.txt         index
  …/components/button/index.html.md                                 guidance
  …/components/button/index.html.json                               API + meta
```

Generate all three from `meta/*.json` and the Storybook manifest in the existing
deploy workflow. Nothing new to maintain.

Also ship a short `llms.txt` **inside the npm tarball**. An agent working offline
in a repo that has `ionbase-ui` in `node_modules` should find the contract without
a network call — that is the single most common real situation and the one the
hosted-docs approach misses.

#### 3a — DONE, 21 Aug 2026

`packages/ionbase-ui/scripts/build-llms.mjs`, one generator with two outputs:

| artefact                                   | where           | committed |
| ------------------------------------------ | --------------- | --------- |
| `llms.txt`                                 | package root    | yes       |
| `llms.txt`                                 | Pages root      | at deploy |
| `components/<slug>/index.html.md`          | Pages, 35 pages | at deploy |
| `components/<slug>/index.html.json`        | Pages, 35 files | at deploy |
| `meta/index.json` + `meta/components.json` | Pages           | at deploy |

The markdown is a **rendering** of `dist/meta`, never a second source. Nothing
in it is authored: change `meta/<Name>.json` and the page changes. A hand-kept
mirror drifts, and a drifted mirror is worse than none.

**The two llms.txt files are deliberately different.** The hosted one links
absolute URLs, because an agent fetches it out of context. The tarball one names
local paths — `dist/meta/index.json` — because an agent that finds it already has
the package on disk and does not need the network. Shipping the hosted copy in
the tarball would send an offline agent to a URL it cannot reach, for a file
sitting two directories away.

Both say the same thing about `components.json`: do not load it. It is 242KB and
will bury the one component you need.

The generator fails the build if any link in the hosted `llms.txt` does not
resolve to a file it just wrote. That is the one failure nobody would notice —
a 404 in a file no human opens, found by an agent that cannot tell a broken link
from a component that does not exist. Negative-tested by making the emitted
directory names disagree with the linked ones: 35 broken links, exit 1.

Not done, and deliberately: a tokens page, a patterns page, and `llms-full.txt`.
The first two have nothing to render yet (phase 4a), and the third is the
"one big file" this whole tier argues against.

**3b. Code Connect — BLOCKED, not deferred. Checked 21 Aug 2026.**

> `You need a Dev or Full seat on an Organization or Enterprise plan to use Code
Connect.`

That is the answer from `list_file_components_for_code_connect` against the real
file key. It is a plan gate, not a configuration problem, and it is the same
boundary that keeps the Variables REST API out of reach — which is why
`packages/tokens/figma/export-variables.js` is a plugin script rather than an
API client.

Nothing about the design below is wrong; it simply cannot be executed on this
plan. When an Org seat exists, note that the MCP bridge writes **parserless
`.figma.ts` templates** using `figma.code` — not the `.figma.tsx` /
`figma.connect()` format most examples online show.

#### 3b′ — the free replacement, DONE 21 Aug 2026

Being unable to use Code Connect is not a reason to ship without the capability.
IonBase is meant to be usable by anyone, and gating design-to-code behind an
Enterprise seat would contradict that at the level of the product, not just the
tooling. So the mapping was rebuilt in the repo:

```
figma/export-components.js    paste into use_figma, exactly like the token exports
figma/components.json         35 Figma components, their variant axes and slots
figma/mapping.json            28 mapped, 7 explicitly unmapped with reasons
scripts/verify-figma-map.mjs  9 checks against BOTH sides
dist/figma-map.json           keyed by node id AND by Figma name
```

Published at `/figma-map.json` and as `ionbase-ui/figma-map`, so an agent holding
a Figma node id — from a URL, from `get_design_context`, from a Dev Mode
selection — resolves the real component and its real props instead of inferring
them from a screenshot.

**It is better than Code Connect in the way that matters.** Code Connect stores a
snippet in Figma and cannot tell you when the prop it names is renamed, or when a
variant is added and never mapped. This is verified on every build against the
Figma export on one side and the TypeScript API on the other. It rejected two of
its author's own claims on the first run — `Select.children` and `TabItem.title`,
neither of which exists.

What it does NOT do is render inside Dev Mode's code panel. That surface is
Figma's and stays paywalled. The free substitute is the component `description`
field, which any plan can write and which Dev Mode and the MCP tools both
surface — deliberately not done yet, because it writes to the design file.

156 Figma properties are checked. Coverage is complete by construction: a Figma
component that is neither mapped nor explicitly unmapped fails the build.

Add `.figma.ts` files mapping each Figma component to its
React counterpart. The Figma pipeline and MCP bridge already exist; this is the
missing link that makes design-to-code produce _your_ Button instead of a
lookalike. Start with the ten components that appear most in real screens.

**3c. A published MCP server — last, and only if 3a is not enough.**
`@storybook/addon-mcp` is scoped to a running dev server, which serves audience A
and not B. A real one would be `ionbase-ui-mcp` on npm, exposing:
`search_components`, `get_component(name)`, `get_token(role, mode)`,
`check_contrast(fg, bg, mode)`, `get_pattern(name)`.

Deliberately deferred: for a system this size, static JSON at a stable URL plus a
tarball copy gets most of the benefit at a fraction of the cost. Spotify's own
advice to smaller teams was semantic naming, machine-readable specs and output
review — **not** a custom MCP server. Build it when you can point at a specific
thing static files cannot do.

> Expected effort: 3a ~2 days. 3b ~2–3 days. 3c ~1 week, deferred.

### Phase 4 — The two missing tiers

**4a. Patterns.** The tier between components and screens, where enterprise SaaS
agents actually fail. Ship as composed, documented recipes with their own meta
entries:

| Pattern              | Composes                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| `DataTablePattern`   | Table + toolbar + filters + bulk-select + pagination + empty + loading + error    |
| `FormPattern`        | Input/Select/Checkbox/Radio + validation + inline errors + error summary + submit |
| `PageShell`          | Header + side nav + content region + breadcrumb                                   |
| `WizardPattern`      | Tabs/stepper + per-step validation + save-and-exit                                |
| `DestructiveConfirm` | Modal + destructive Button + typed confirmation                                   |
| `SettingsPanel`      | grouped Toggles + dirty-state + save bar                                          |

Note the recurring content of that table: **empty, loading and error states.**
Those are what agents omit most reliably, because prop types do not mention them
and no type check misses them.

#### 4a — the contract tier is DONE, 21 Aug 2026

Six recipes in `packages/ionbase-ui/patterns/`, built and verified into
`dist/meta/patterns/` and published as markdown pages beside the components:
`DataTable`, `Form`, `PageShell`, `DestructiveConfirm`, `SettingsPanel`,
`Wizard`.

**No React code, and that is the point.** A pattern is a documented composition,
so nothing here ships a component or a token of its own. The `control/<size>/*`
deletion in `AGENTS.md` is the precedent — a tier that grows its own tokens has
stopped composing the tier below it and started forking it.

Every recipe answers `loading`, `empty` and `error`, each with a `must` and a
`why`, and most also answer `partial` — the state that appears when a bulk
operation half-succeeds and which nothing else in the system names.

`scripts/build-patterns.mjs` is the gate, and it is what stops this being prose.
Seven checks, all negative-tested on a deliberate break:

| check                                  | catches                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `composes` names real components       | a recipe for a component that does not exist         |
| `propsUsed` names real props           | a prop renamed out from under the recipe             |
| ...on a component it actually composes | a recipe quietly depending on something undocumented |
| `variantsUsed` values are in the union | `intent="critical"` — plausible, and not real        |
| the three states are present           | the omission this whole tier exists to prevent       |
| every state has a `why`                | a rule with no reason, which gets ignored            |
| pattern cross-references resolve       | "use the Undo pattern" when there is no Undo pattern |

Still open in 4a: no worked TSX example per pattern. The composition is
described and every name in it is verified, but an agent still writes the JSX.
Whether a full example earns its maintenance cost is a question for the eval
harness, not an assumption to build on.

Follow Brad Frost's distinction — a pattern is a documented composition of
components, not a new component. It must not acquire tokens of its own; the
`control/<size>/*` deletion recorded in `AGENTS.md` is the precedent, and the
same failure mode applies one tier up.

**4b. AI-feature components** for audience C. The set the field has converged on:

| Component             | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `StreamingText`       | token-by-token output, with a stable-height container            |
| `AgentActivity`       | plain-language step log — planning, tool use, result             |
| `Citation`            | source attribution, inline and as a footer list                  |
| `ApprovalGate`        | blocks an action above a risk threshold; approve / reject / edit |
| `ConfidenceIndicator` | calibrated, not a fake percentage                                |
| `AgentStop`           | always-visible cancel. Not optional, not behind a menu.          |

#### 4b — the two that matter are DONE, 28 Aug 2026

`AgentStop` and `ApprovalGate` ship in 0.24.0. Both pass every existing gate on
their own terms: 154 enforced contrast pairings with zero defects, client
boundaries verified, full intent contracts, and interaction tests that assert
the behaviour rather than the markup — that the stop control survives its own
press, that Escape inside a dialog does not cancel a background run, that
neither approval button holds focus on mount.

They are the first components here with **no Figma counterpart**. Measurements
are borrowed from Button and Alert rather than invented, so the design can
arrive later and change values instead of structure.

The defining constraint: **neither enforces anything.** AgentStop reports intent;
the caller aborts. ApprovalGate renders a decision; the caller gates execution by
not acting until `onApprove` fires. Shipping something that _looked_ like it
enforced a policy would be worse than shipping nothing, because teams would rely
on a guarantee living entirely in their own call site.

One test caught a bad assertion rather than a bad component:
`expect(document.activeElement).not.toHaveTextContent('Approve')` passes
trivially, since `document.activeElement` is `<body>` and body contains the word.
Asserting `.not.toHaveFocus()` on the button is the real check.

Still open in 4b: `StreamingText`, `AgentActivity`, `Citation` and
`ConfidenceIndicator`. Not started, and not blocked — they are the four where
the field has converged least, and none of them carries the compliance weight
that made these two non-negotiable.

`ApprovalGate` and `AgentStop` are the two that matter. Human-in-the-loop
controls and a visible kill switch are treated as non-negotiable in regulated
enterprise contexts, and the EU AI Act's August 2026 enforcement makes
demonstrable human oversight a compliance surface, not a UX preference. A design
system that ships these as first-class components is doing risk work, not
decoration.

> Expected effort: 4a ~1–2 weeks. 4b ~2–3 weeks, and it is a product decision
> about IonBase's positioning as much as an engineering one.

### Phase 5 — HARNESS DONE, 18 Aug 2026. The A/B itself is unrun.

Built in [`evals/`](../evals/). Three parts, and it matters which are verified:

**Context packs** (`context/build-packs.mjs`) — the cheap half of the answer,
measured exactly, no model involved:

| pack                     | chars   | vs contract-all |
| ------------------------ | ------- | --------------- |
| `readme`                 | 10,073  | 7%              |
| `manifest` (phase 0)     | 180,369 | **125%**        |
| `contract-all`           | 144,613 | 100%            |
| `contract-indexed`       | 79,331  | 55%             |
| `contract-indexed-rules` | 80,135  | 55%             |

Two findings before any model ran. **The phase-0 Storybook manifest is larger
than all 35 contracts combined** — it carries 249 story snippets and prop tables
that are mostly empty, and costs more than the artifact that replaced it. And
the index tier earns its keep: loading only what a task touches is 45% smaller
than loading everything, with the rules brief adding 1%.

**Corpus** (`prompts/corpus.json`) — 32 enterprise SaaS tasks with 89 named
traps. Each task carries machine-checkable `expects` and the specific mistakes
an unhelped model is expected to make. A corpus of vague asks measures nothing.

**Scorer** (`score/score.mjs`) — nine checks, all running the tooling a consumer
would run rather than a bespoke rubric: `tsc` against the real types, the
shipped ESLint plugin, the contracts for invented components and known contrast
failures. Verified in both directions on hand-written fixtures: 1/7 checks and 5
lint errors for a bad implementation, 7/7 and 0 for a good one.

Note the bad fixture **compiles**. Plain HTML type-checks fine, which is exactly
why the other eight checks exist.

#### What is NOT done

**No model has generated anything.** The only candidates so far are two
fixtures, which measure the scorer and nothing else. The headline question —
does the contract pack beat the README — is still open, and the fixture run
must not be quoted as if it answered it.

Running it needs `--provider api`, `@anthropic-ai/sdk` (deliberately not a
dependency of this repo), and money. The wiring, prompt, caching and reporting
are in place; `--provider files` grades output from any tool with no model at
all.

#### What a real run should settle

1. Does the contract pack beat the README? If not, phases 1 and 2 did not earn
   their keep and should be reconsidered rather than defended.
2. Does the rules brief add anything over the contracts alone? It costs 1%.
3. Do the inherited ARIA props help or hurt? 86% of Button's props block is 39
   inherited props and a lean contract would be 42% smaller — the harness exists
   precisely so that is tested rather than guessed.
4. Which check fails most? That list is more useful than the aggregate score.

## 5. Sequencing

```
Phase 0  ▓  DONE                                  manifest live: 26 components, 249 stories
Phase 1  ▓▓▓▓▓▓▓▓▓▓  DONE                          ionbase-ui/meta, 35 of 35 with intent
Phase 2c ▓▓  DONE                                 250 pairings; found 3 defects, 2 unknown
Phase 5  ▓▓▓▓▓▓  HARNESS DONE, A/B UNRUN          32 tasks, 9 checks, 5 context packs
Phase 2  ▓▓▓▓▓▓  DONE                             5 lint rules + stylelint config, shipped
Phase 3a ▓▓▓▓  DONE                                llms.txt + 35 mirrors, hosted + in-tarball
Phase 3b ▓▓▓▓  REPLACED                            figma-map.json — Code Connect without the plan
Phase 4a ▓▓▓▓▓  CONTRACTS DONE                     6 recipes, 7-check gate; no TSX examples yet
Phase 4b ▓▓▓▓  2 of 6 DONE                         AgentStop + ApprovalGate shipped
Phase 3c ░░░░                                     MCP server — only if measured need
```

---

## 6. What not to do

- **Do not hand-write prop tables.** Generate them. `AGENTS.md`'s argument about
  vendor files applies unchanged: a second copy is worse than none, because the
  two drift and neither announces it.
- **Do not convert `AGENTS.md` to JSON.** It is instructions to an agent, and
  markdown is right for that. JSON is for data the agent _looks up_. The
  distinction is the whole point of the token-efficiency finding, and getting it
  backwards loses the reasoning that makes that file valuable.
- **Do not let patterns grow their own tokens.** See the `control/<size>/*`
  deletion. Semantics holds ladders, not recipes — one tier up, the same rule.
- **Do not build the MCP server first.** It is the most visible item and the
  least load-bearing. Static JSON at a stable URL, plus the copy in the tarball,
  covers the common case.
- **Do not weaken a gate to let an agent through.** The gates are the reason an
  agent can be trusted here at all. If a gate blocks something legitimate, the
  gate is wrong and gets fixed deliberately — it does not get relaxed in passing.
- **Do not skip Phase 5 because the earlier phases feel obviously right.** Indeed
  found the format choice worth 5× in cost; that is not a thing intuition
  returns.

---

## 7. What the field is doing

Gathered 18 Aug 2026. Weighted toward large enterprise systems over blog posts
about landing pages.

| Who                           | What they built                                                                                                                                                                                                                                                                                                                            | Takeaway for IonBase                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spotify (Encore)**          | Split components into foundation / style / behaviour layers to create "smaller context bubbles"; headless behaviour via React ARIA and Base UI; custom MCP server; a bespoke eval framework comparing generated components to real ones on lint errors, similarity and visual output. 220k+ shared style uses, 93% developer satisfaction. | IonBase already has this architecture. Copy the **eval framework**, not the layering — you have that. Their advice to smaller teams: semantic naming, machine-readable specs, output review; skip the custom MCP. |
| **Indeed**                    | 77 components parsed to JSON; 8 MCP configurations benchmarked over 1,056 prompts. JSON beat markdown on accuracy with ~80% fewer tokens — $300/yr vs $1,500.                                                                                                                                                                              | The strongest published evidence for Phase 1's format choice, and for Phase 5 existing at all.                                                                                                                    |
| **GitHub (Primer)**           | Public MCP plus instruction files. Workflow runs Storybook → preview environment → sub-agent review, with a dedicated accessibility reviewer kept in its own context. Daily QA agents have "safe outputs" — restricted to opening issues, nothing else.                                                                                    | The **trust boundary** pattern: an agent's blast radius is a design decision. Relevant to Phase 2 and to how you let agents touch this repo.                                                                      |
| **AWS (Cloudscape)**          | The most complete public docs-for-agents implementation. `/llms.txt` index, plus `index.html.md` (guidance, testing specs, a11y) and `index.html.json` (types, props, events, functions) appended to _every_ docs URL.                                                                                                                     | Copy this shape wholesale in Phase 3a. It is a solved problem; do not design a new one.                                                                                                                           |
| **Nordhealth (Nord)**         | Two-tier `llms.txt` (~5k tokens, an index) and `llms-full.txt` (1M+).                                                                                                                                                                                                                                                                      | The two-tier split matters: agents need a cheap index before an expensive fetch.                                                                                                                                  |
| **Ant Design, Nuxt UI**       | `llms.txt` shipped as standard.                                                                                                                                                                                                                                                                                                            | This is now table stakes for a published component library, not a differentiator.                                                                                                                                 |
| **Figma**                     | Position: Code Connect is the highest-leverage MCP-readiness work, because it makes the agent pull the real component rather than generate a lookalike. Plus auto-generated rules files from a codebase scan.                                                                                                                              | Was read as direct support for Phase 3b. It is — but only on an Organization or Enterprise seat, which this account does not have. See the block note above.                                                      |
| **Storybook**                 | `componentsManifest` + `@storybook/addon-mcp`. Manifest carries id, import, JSDoc tags, prop table and a JSX snippet per story. Pre-stable and React-only as of 10.5.                                                                                                                                                                      | Phase 0, now done. Note the prop table does not survive a monorepo that ships a built package — see Phase 0's findings.                                                                                           |
| **New York State**            | Lit + TypeScript components documented in JSDoc; generated a full multi-step form from a PDF in 13 minutes.                                                                                                                                                                                                                                | Public-sector, accessibility-constrained, and it worked because the JSDoc was thorough. Cheap metadata beats no metadata.                                                                                         |
| **Brad Frost / Southleft**    | FigmaLint scores component hygiene (their demo: 26/100 → 100/100); a design-systems MCP covering Carbon, Polaris and Atlassian.                                                                                                                                                                                                            | **Scoring** as a mechanism — a number that moves is what gets a design system's agent-readiness maintained. Feeds Phase 5.                                                                                        |
| **Enterprise agent-UX field** | Convergent pattern set for agents inside products: live run view, approval queue above a risk threshold, plain-language activity log, confidence indicators, one-tap correction, always-visible kill switch. AG-UI / A2UI emerging as protocols.                                                                                           | Phase 4b. Note how much of it is about **stopping and reviewing**, not about output.                                                                                                                              |
| **Regulatory**                | EU AI Act enforcement from August 2026: lineage-backed auditability and demonstrable human oversight for high-risk systems.                                                                                                                                                                                                                | `ApprovalGate` and `AgentStop` are compliance surfaces. That is the argument for shipping them in the design system rather than leaving them to each product.                                                     |

### The pattern across all of them

Three things recur in every serious implementation, and none of them is "we built
an MCP server":

1. **Structured data beats prose**, measurably, for anything the agent looks up.
2. **Deterministic gates beat instructions.** Every team that succeeded made the
   rule enforceable rather than documented.
3. **Nobody trusts the output.** Every one of them built a review mechanism —
   evals, visual diffing, sub-agent review, scoring, trust levels.

IonBase is already strong on (2) for its own repo. The work is extending (2) to
the apps built with it, and adding (1) and (3) from scratch.

---

## Sources

- [Agentic Design Systems: The Complete Guide — Into Design Systems](https://www.intodesignsystems.com/agentic-design-systems)
- [Your Design System Is Not Ready for AI Agents — Into Design Systems](https://www.intodesignsystems.com/blog/design-system-not-ready-for-ai-agents)
- [How Spotify Is Redesigning Its Design System for AI Agents](https://www.layreight.de/en-us/posts/spotify-design-system-ai-agents)
- [How Spotify is Making Their Design System AI-Ready](https://www.intodesignsystems.com/blog/how-spotify-design-system-ai-ready)
- [AI Metadata: Powering a Design System MCP — Diana Wolosin, Indeed](https://www.designsystemscollective.com/ai-metadata-powering-a-design-system-mcp-b5deafcae8f5)
- [Your Design System Needs to Be Machine-Readable First — Brent Haskins](https://brenthaskins.com/blog/design-system-machine-readable)
- [Supercharge Your Design System with LLMs and Storybook MCP — Codrops](https://tympanus.net/codrops/2025/12/09/supercharge-your-design-system-with-llms-and-storybook-mcp/)
- [Manifests — Storybook docs](https://storybook.js.org/docs/ai/manifests)
- [LLMs.txt files — Cloudscape Design System](https://cloudscape.design/gen-ai/ai-tools/llms-txt-files/)
- [LLMs.txt — Nord Design System](https://nordhealth.design/ai/llms-txt)
- [LLMs.txt — Ant Design](https://ant.design/docs/react/llms/)
- [Design Systems And AI: Why MCP Servers Are The Unlock — Figma](https://www.figma.com/blog/design-systems-ai-mcp/)
- [design-systems-mcp — Southleft](https://github.com/southleft/design-systems-mcp)
- [Design system components, recipes, and snowflakes — Brad Frost](https://bradfrost.com/blog/post/design-system-components-recipes-and-snowflakes/)
- [Best User Interfaces for Enterprise AI Agents: 9 Design Patterns](https://www.entrans.ai/blog/best-user-interfaces-enterprise-ai-agent-development)
- [Agentic AI Design Patterns — Enterprise Guide](https://www.aufaitux.com/blog/agentic-ai-design-patterns-enterprise-guide/)
- [Enterprise AI Agent Guardrails: A Compliance Checklist for 2026 — Atlan](https://atlan.com/know/ai-agent/enterprise-ai-agent-guardrails-checklist/)
- [Is Enterprise SaaS Shifting From UX to Agentic Infrastructure? — Flexera](https://www.flexera.com/blog/perspectives/enterprise-saas-strategy-data-gravity-agentic-ai/)
