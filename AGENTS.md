# IonBase — working notes for contributors and AI agents

Design system monorepo. pnpm workspaces + Turborepo, strict TypeScript ESM, Node 22.

Read this before touching tokens. Most of what follows is non-obvious from the
code, and getting it wrong is expensive rather than merely wrong.

**This file is the canonical entry point, and it is deliberately vendor-neutral.**
`AGENTS.md` is a conventional name that agent tooling looks for without being
told to; it is also a plain Markdown document a human can read. Nothing here is
specific to one assistant, one vendor or one editor.

Any tool-specific file in this repo (`CLAUDE.md`, and any `GEMINI.md`,
`.cursorrules` or `.github/copilot-instructions.md` added later) **must be a
pointer to this file and must not hold content of its own.** Project knowledge
that lives in exactly one vendor's file is knowledge the project loses the day it
changes tools — and a second copy is worse, because the two drift and neither
announces it. One source, many pointers.

Durable design decisions belong in [`docs/`](docs/) and the package READMEs, not
here. This file is the map and the traps; the docs are the reasoning.

---

## Three packages, two published

```
packages/ionbase-ui     ionbase-ui     PUBLISHED — components + styles + tokens
packages/ionbase-icons  ionbase-icons  PUBLISHED — 1753 icons, optional
packages/tokens         (private)      the Figma pipeline and its five gates
```

`ionbase-ui` is the entire public surface. It is unscoped, mirroring `beacon-ui`.

**`packages/tokens` must keep `"private": true`.** Its build output is copied
into `ionbase-ui` by [`scripts/sync-tokens.mjs`](packages/ionbase-ui/scripts/sync-tokens.mjs);
publishing it would put a second, competing source of token values on npm.
`ionbase-ui` deliberately does **not** depend on it — a `workspace:*` on a
private package publishes as a version that does not exist. Build ordering lives
in `turbo.json` as an explicit `ionbase-ui#build` task dependency instead.

This replaced four packages (`tokens`, `styles`, `react`, `icons`) before
anything reached npm. Do not re-split. The tell that the split was not earning
its keep: `sync-version` moved all four in lockstep, so it bought four manifests
and a cross-package CSS `@import` of a bare specifier, and no independent
versioning at all.

**`ionbase-icons` is not a re-split of that**, and the distinction is the whole
rule. Lockstep is what made the old split worthless; this package has no version
relationship to `ionbase-ui`, `ionbase-ui` does not import it, and a consumer
who never installs it loses nothing. Apply the same test to any future package:
if it would move in lockstep, it belongs inside `ionbase-ui`.

**`tsc` can exit 0 having emitted nothing.** `composite: true` makes it trust
`tsconfig.tsbuildinfo` over the filesystem, so deleting `dist/` without deleting
the buildinfo produces a silent no-op — `tsc --build` does not catch it either.
The old `@ionbase-ui/styles` shipped exactly that way: `main` pointed at a
`dist/index.js` that was never emitted, and no build, lint, typecheck or format
check could see it. The build now runs `tsc --build --force`, and
`copy-css.mjs` asserts the entry exists before packing.

---

## Commands

```bash
pnpm build       # turbo run build
pnpm lint
pnpm typecheck
pnpm format      # check only; use `prettier --write` to fix
```

All four must pass before committing. `pnpm format` **checks**, it does not
write — if it fails, run `pnpm exec prettier --write <paths>` in that package.

CI (`.github/workflows/ci.yml`) runs all four on every push and PR, plus a
Storybook production build and a check that `pnpm build` leaves no tracked file
modified. Turbo's cache is empty on a fresh runner, so CI genuinely executes
every task — which matters, because a stale local cache once reported "lint
successful" without running lint at all.

**A PR does not deploy the Storybook site and is not meant to.**
`deploy-storybook` is gated on `main` and on both test jobs, so a red suite
leaves the previous deploy up rather than publishing a broken site. The cost is
that a test failing only on the runner silently freezes the live site at an old
commit — that happened for two days in August 2026 and nobody noticed, because
every check people looked at was on a branch.

---

## Interaction tests — hover is a pulse, not a level

Read this before asserting on `data-hovered` anywhere.

**In headless Chromium the hover does not hold.** A few ticks after
`userEvent.hover()`, the browser drops `:hover` while the element is still
attached, unmoved and unobstructed. React Aria's `isHovered` follows it false,
React re-renders, and `data-hovered` is **removed**. Re-hovering does not bring
it back either: the pointer is already at those coordinates, and Chromium fires
no fresh `pointerenter` for a move to the same point.

So the attribute is a **pulse**. Every way of _reading_ it after the fact is a
coin flip on whether the drop beat the read, which produces the worst kind of
test — green locally, red on the runner, intermittently.

**`waitFor` is the wrong tool and actively makes it worse.** Polling for a
second cannot catch a value that has already gone; it converts a fast failure
into a slow one. This has now been tried and reverted at least twice.

Two shapes work, both in the tree:

- **Observe the transition.** Arm a `MutationObserver` on the element _before_
  moving the pointer, then assert it fired. Asks the question the test actually
  means — did a real pointer ever produce the attribute — rather than "is it
  present at this arbitrary instant". See `Hovered` in
  [Button.stories.tsx](apps/storybook/src/stories/Button.stories.tsx).
- **Split the contract.** Assert React Aria's half with a real pointer read
  synchronously, then set the attribute by hand and read the CSS's half with no
  `await` between the statements. See `HoverHasNoBackground` in
  [NavItem.stories.tsx](apps/storybook/src/stories/NavItem.stories.tsx), which
  documents the original instrumentation.

This has bitten Tabs, ScrollProgress, NavItem and Button. The first three were
each fixed locally without the reason being written down, so the fourth cost a
full debugging cycle — including two confident, wrong diagnoses. **That is why
this section exists: the fix is cheap and rediscovering it is not.**

### When the element IS the state, hover cannot be tested at all

Both shapes above depend on there being a node to watch. A tooltip, popover or
anything else that only exists _while_ hovered has none: the open and the close
land in the same React batch, no node is ever committed, and a
`MutationObserver` on the document sees nothing.

Instrumented on the runner rather than inferred — `pointerover`,
`pointerenter` and `mouseenter` all fire on the trigger, so the pointer
genuinely arrives, and 50ms later the document still has no tooltip in it.

**Do not write a hover-opens-it test for these.** It will be permanently red,
or quietly weakened until it passes, which is worse. Assert the same contract
through **focus**, which does hold: open, dismiss, and the `aria-describedby`
relationship. Hover still works in a real browser. See the comment above
`FocusOpensIt` in
[Tooltip.stories.tsx](apps/storybook/src/stories/Tooltip.stories.tsx).

A related trap worth knowing while you are here: React assigns DOM events a
priority, and `pointerenter` / `mouseenter` / `mousemove` are CONTINUOUS
(scheduled) while `focusin` / `click` / `keydown` / `pointerdown` are DISCRETE
(flushed before the next line). That is real — see `getEventPriority` in
react-dom — and it is **not** the cause of the hover flake. It is recorded here
because it looks like a satisfying explanation and led one debugging attempt
straight past the actual bug.

## Overlay hooks belong in the component that mounts with the overlay

`useDialog` focuses its panel and resolves the title's id in effects keyed on
the ref — effects that run once, when the component **calling the hook** mounts.
Call it beside `useOverlayTriggerState` in the trigger's component and that
moment is when the TRIGGER mounts, with the panel and its title not yet in the
DOM. The result is silent: no `aria-labelledby`, and the panel never takes
focus, so Escape never reaches the overlay's key handler.

So every overlay here splits in two — `Modal` / `ModalDialog`, `Popover` /
`PopoverPanel` — with the panel component mounted only while open, and
`usePopover` / `useDialog` called inside it. react-aria warns about this exact
mistake in dev; the warning names the shape of it, not the fix.

While you are in that file: `usePopover` already runs `useOverlayPosition`
internally and returns the resolved placement and arrow offsets. Calling
`useOverlayPosition` yourself as well produces a second set of transforms that
fight the first.

---

## The component contract — `meta/*.json`

Every component ships a machine-readable contract at `ionbase-ui/meta`, because
the consumer of this system is increasingly an agent that never opens this repo.
Full reasoning: [docs/agent-readiness-plan.md](docs/agent-readiness-plan.md).

```
meta/<Name>.json          hand-authored INTENT   committed, reviewed
   + src/components/*.tsx via the TS checker     props, generated
   + src/styles/<name>.css                       tokens, generated
   = dist/meta/<Name>.json + components.json + index.json
```

**Intent files carry judgement; they never carry API.** `props`, `tokens`,
`stylesheet`, `source`, `import`, `name` and `propsType` are generated, and
`verify-meta.mjs` rejects an intent file that sets any of them. A hand-kept prop
table drifts, and a drifted one is worse than none — the same argument this file
makes about `CLAUDE.md`.

What an intent file is for is the things no type can express: when to reach for
this component, what to reach for instead, which variant combinations are wrong,
and what an agent will otherwise get confidently wrong. `Button`'s
`antiPatterns` entry for `onPress` over `onClick`, and `Alert`'s note that the
ARIA role is chosen by intent rather than passed in, are the shape of it.

**All 35 have one, as of 0.19.0.** Two of the five lint rules are driven straight
out of these files, so writing intent is also what turns the guardrails on: the
deprecation rule went from 4 components to 11 and the accessible-name rule from 5
to 12 the moment the remaining 29 landed. That is the argument for the format —
prose in a docs site could not have done it.

### Why the TypeScript checker and not react-docgen

These interfaces extend `Omit<>`, `AriaButtonProps<'button'>`, `InputDOMProps`.
Only real type resolution sees through that, and it is also the only way to learn
_where_ a prop was declared — which is what lets the generator keep `onPress` and
drop the 277 inherited HTML attributes on `Badge` that would otherwise bury it.

This is also why the prop table is generated **here** and not from the Storybook
manifest: the stories import the built package, so docgen there gets
type-erased JavaScript. See the comment in
[.storybook/main.ts](apps/storybook/.storybook/main.ts).

### Three tiers, on purpose

`index.json` is 13KB and answers "which component do I need". `<Name>.json` is
the full contract for one component. `components.json` is all of them at 242KB
and is **not** the file an agent should load — it exists for tooling that wants
one fetch. Pick from the index, then read exactly one component.

### The gate is negative-tested, keep it that way

`pnpm --filter ionbase-ui meta:verify` checks that every documented variant value
exists in the real union, that every union member is documented, that slots and
deprecations name real props, that a prop marked `@deprecated` in the source is
declared in meta **and the reverse**, and that every custom property a stylesheet
consumes is defined by a token layer.

Every one of those was confirmed to fail on a deliberate break before being
trusted. If you add a check, break it on purpose first — `audit-names.mjs` once
reported a clean 0/0/0 while validating nothing.

**Adding a component means adding `meta/<Name>.json`.** A missing intent file is
an **error** as of 0.19.0, not a warning: all 35 have one, so the next component
without one is a new component that shipped without the judgement an agent needs.
The generated API tells an agent what it MAY pass; it never says what it SHOULD.

One thing the intent files must not do is name an accessible-name requirement
that belongs to a child. `needsAccessibleName` in the lint plugin is extracted by
matching `/aria-label|accessible name/` against `a11y.requires`, so `TableRow`
saying "every row-selection Checkbox needs a name" made the rule demand a name on
the `<tr>` itself. Write the requirement on the component that actually carries
it.

---

## Code Connect, without the Enterprise plan

Figma's Code Connect makes Dev Mode emit `<Button variant="primary-brand">`
instead of a generated lookalike. It requires a Dev or Full seat on an
Organization or Enterprise plan — checked against this file on 21 Aug 2026 and
refused. **A design system that only works for people who can afford that is not
a design system**, so the mapping lives in this repo instead:

```
figma/export-components.js   paste into use_figma, like the token exports
figma/components.json        what the Figma components ARE — committed
figma/mapping.json           the claim: Figma property -> React prop
scripts/verify-figma-map.mjs checks it against BOTH sides
dist/figma-map.json          the output, keyed by node id and by name
```

**The trade is in our favour.** Code Connect stores a snippet inside Figma and
nothing tells you when the prop that snippet names is renamed, or when a variant
is added in Figma and never mapped — it will publish a stale mapping without
complaint. This one is verified on every build against `figma/components.json`
on one side and the TypeScript API on the other. It caught two of its own
author's mistakes on the first run: `Select.children` and `TabItem.title`, both
props that do not exist.

Eleven checks, all broken on purpose. The three that matter most:

- **Every Figma property is mapped or ignored with a reason.** A new Figma
  property appears in the export, nothing names it, and the build stops. Silence
  is the failure mode this prevents — an unmapped property looks exactly like one
  that was never exported.
- **A value map must be exhaustive.** An unmapped variant option silently
  produces `undefined`. That is Code Connect's own documented pitfall, and it is
  invisible to the agent consuming the result.
- **Every exported component is mapped or listed in `codeUnmapped` with a
  reason.** Checks 1–9 all start from Figma, so a component that exists in code
  and nowhere in Figma is invisible to every one of them — it is not in the
  export, so nothing asks about it. `codeUnmapped` is the same question read
  backwards, and it is what makes a component drawn later impossible to forget:
  the moment someone maps it, the stale "not yet drawn" line fails the build.

A partial mapping is allowed and often correct — Figma's one `State` axis splits
across `isDisabled`, `:hover` and `data-pressed` — but it must carry a `note`
saying where the rest went. `Header`'s `Device` is the clearest case: four Figma
values, of which three are a media query the browser already answers.

**Adding a Figma component means re-exporting and mapping it.** Re-export with
`figma/export-components.js`, then either map it or add it to `unmapped` with a
reason. Both halves are enforced.

### A duplicate variant takes the whole export down, and the error does not say so

`export-components.js` throws
`in get_componentPropertyDefinitions: Component set has existing errors` and
stops. The message names no component, so it reads like a broken script — it is
not. Figma refuses `componentPropertyDefinitions` on a set that contains two
variants with the **same** property combination, and one bad set kills the run
for all thirty-seven.

Find it by counting instead of asking. Group each set's children by their
variant-name signature and compare the group count to `children.length`; the set
where they disagree is the one, and the duplicate pairs fall out of the same
grouping. Sort the parts of the name before joining — Figma stores them in
authoring order, so `Type=A, Size=B` and `Size=B, Type=A` are the same variant
spelled two ways and a naive string compare misses it.

The tell that it is an accident rather than a design: the duplicate sits at
exactly +10,+10 from its twin, which is Figma's paste offset. Three of them were
sitting in `Icon Button` on 2026-08-28 — 283 children over 280 combinations —
and they had to be deleted **in Figma** before the export could run again. There
is nothing to fix on the repo side, which is why this is written down here
rather than guarded by a gate: the gate cannot run at all until the file is
clean.

**Adding a React component means answering the Figma question too.** Map it, or
put it in `codeUnmapped` with a reason. Seventeen sit there now: eight are
permanent — `Table`, `TableHead`, `TableBody`, `RadioGroup`, `ToastProvider`,
`Icon`, `LogoMark`, `ScrollProgress` are code-side composition or runtime
behaviour, with nothing in Figma to point at — and nine are the agentic tier,
simply not drawn yet. That second group is a to-do list with a build behind it,
not a note in a document.

### The snippets are in the Figma descriptions too

`figma/apply-descriptions.js` writes the generated block into each component's
description, fenced by markers, so Dev Mode shows the real component on **any**
plan. All 38 carry one, over 29,794 characters of hand-written prose that the
markers keep intact. Re-running replaces only the fenced block; the text above
it — Link's is nearly 3,000 characters of real design reasoning — is untouched.

**Generating a block is not applying it, and for a while nothing knew the
difference.** The build produced a block for every mapped component and reported
success on its own output. `Avatar Gradient` was mapped, generated a block, and
sat in Figma with a completely empty description while every gate in the repo
passed — found on 3 Sep 2026 by reading the file rather than the build log.

`figma/descriptions-applied.json` now records what was actually written, and
`scripts/verify-figma-descriptions.mjs` checks it on every build: a generated
block with no applied record fails, and so does a record whose hash no longer
matches the snippet the code produces — which is precisely when Figma is showing
a reader a prop that has been renamed. The hash deliberately excludes the
`Generated from ionbase-ui@<version>` line, because a gate that demanded 38
re-applications per release to update one number would be skipped, and a skipped
gate still reports green.

CI cannot read Figma, so the check verifies that a person did. After applying,
re-read the file, confirm every mapped node carries a block, then countersign:

```
pnpm --filter ionbase-ui figma:applied --verified <count>
```

`--verified` must equal the number of generated blocks, so a partial apply
cannot be signed off as a complete one.

**Use `descriptionMarkdown`, never `description`.** The plain setter HTML-escapes
on write: `<Button x="a">'` goes in at 16 characters and comes back at 40 as
`&lt;Button x=&quot;a&quot;&gt;&#39;`. Every write adds another layer, so a
second pass over an already-written description produces `&amp;amp;#39;` and
corrupts every apostrophe and angle bracket a designer typed. That is exactly
what happened here on the first attempt, to seven components, and it was caught
by arithmetic rather than by eye — the stored length was 3055 where the text was 3011. `descriptionMarkdown` round-trips exactly. The two are separate fields, so
recovery meant reading the escaped `description`, decoding until stable, and
writing the result to `descriptionMarkdown`.

If you ever see `&amp;` in a Figma description, something wrote through
`description`. The decode loop in `apply-descriptions.js` repairs it.

---

## The agentic tier — `AgentStop` and `ApprovalGate`

Two components for products where an agent acts and a person supervises. They
are the first components in this system with **no Figma counterpart**, so their
measurements are borrowed rather than invented: `AgentStop` takes Button's size
ramp, radius and focus ring; `ApprovalGate` takes Alert's icon-rail structure and
one-variable-per-colour-slot approach. When Figma draws them, those files should
need values changed, not structure rewritten.

**Neither enforces anything, and that is the most important thing about them.**
`AgentStop` does not stop a run — it reports intent, and the caller aborts the
request. `ApprovalGate` does not gate execution — the caller gates it by not
acting until `onApprove` fires. A component that _looked_ like it enforced a
policy would be the worst thing this system could ship, because teams would rely
on a guarantee that lives entirely in their own call site. `risk` on
`ApprovalGate` changes emphasis and nothing else, for exactly that reason.

Three decisions worth not re-litigating:

- **AgentStop is not destructive-red.** Stopping is normal, expected and
  repeatable. Colouring it like a delete teaches hesitation about the one
  control that must never be hesitated over. It goes error-coloured on hover,
  where the colour confirms rather than warns.
- **ApprovalGate is not a Modal.** A modal steals focus and hides the page — but
  the page is the evidence. The plan, the diff and the tool call have to stay
  visible while deciding, and focus is never trapped: an approval a user was
  rushed through is not oversight. Neither button is focused on mount, and
  reject precedes approve in the DOM.
- **`high` risk sits on warning, not error.** Error means something went wrong.
  A high-risk approval is working correctly and asking. Reserving red for
  failure is what keeps red meaningful when a failure happens.

Both keep their place through their transition rather than unmounting, and both
announce it through `.ion-visually-hidden` live regions — a label change alone is
only heard if the element happens to hold focus, which it does not when the run
was started elsewhere.

### The other four, and the one rule they share

`StreamingText`, `AgentActivity`, `Citation` and `ConfidenceIndicator` complete
the tier. Each exists because the obvious implementation of it is inaccessible:

- **StreamingText is NOT a live region.** `aria-live="polite"` on streaming text
  queues an announcement per token, so a screen-reader user hears the answer
  re-read and stuttered dozens of times with no way to get ahead of it.
  `aria-live="off"` plus `aria-busy` is the accessible choice, not an oversight.
  Announcing completion is the caller's decision — a chat with ten turns on
  screen does not want ten announcements.
- **AgentActivity never carries status in colour alone.** Every step renders its
  status as hidden text, and the glyphs differ in shape. A row of coloured dots
  fails WCAG 1.4.1 outright.
- **Citation's marker is not its name.** A superscript "1" announces as
  "link, 1". The accessible name is "Source 1: <source>" — the number is for the
  eye, the sentence is for everyone. With no `href` it is not an anchor, so an
  unfollowable link never enters the page's link list.
- **ConfidenceIndicator has no percentage prop, and will not get one.** "87%
  confident" reads as a measurement and almost never is one. `basis` is required
  — a level with nothing behind it is decoration that still changes behaviour,
  and a required prop is a type error rather than a policy, which is the
  strongest enforcement available.

**The contrast gate does not model empty elements**, and this tier is where that
first mattered. `.ion-confidence__bar` and `.ion-streaming-text__cursor` are
aria-hidden spans with a background and no text, so the gate pairs the inherited
text colour against them and reports a text failure that cannot exist. Those four
are in `contrast-exceptions.json` as `wcag-exempt`, each with the pairing that
actually applies measured by hand.

Doing that measurement found a real defect the gate could not see: the unfilled
confidence bars used `surface/muted`, which is **1.05:1** against the page.
"One bar filled of three" collapsed into "one bar". Every bar is outlined in
`icon/tertiary` now — 7.09:1 — which is also what the forced-colours block
already did, so the two constructions no longer disagree.

**The gate used to be blind in the opposite direction too, and that is closed.**
It paired `color` against a `background` on the same rule, so a component that
declared no background was skipped and passed by never being asked — 106 slots
across 19 stylesheets, and `EmptyState`, the first component that is text-only
from top to bottom, produced **zero pairings while the gate reported green**.

A background-less rule is now measured against all three neutral grounds a
caller can place a region on:

```
--surface-page   --surface-default   --surface-muted
```

**All three, not one.** A component that is readable on the page and unreadable
inside a card is not readable; assuming only `surface/page` would let that pass.
Intent surfaces are deliberately excluded — a component inside a solid Alert
inherits that Alert's text roles, so pairing an ordinary `text/secondary`
against `surface/error` would report a combination nothing constructs. So are
the `on-color` roles, whose entire meaning is "on a coloured surface": an
on-colour checkmark is never drawn on the page.

Coverage went from **173 pairings across 23 stylesheets to 446 across 31**.
`EmptyState` alone went from 0 to 60.

It found one real defect nothing had ever measured: **`text/link-visited` on
`surface/muted` at 3.9:1 in Dark**. Link declares a colour and no background, so
it had never been paired against anything. Only the muted ground fails — page
and default clear 4.5:1 — which is why the fix is the visited purple, not the
surface.

The other eleven findings were all one pairing: `text/disabled` on
`surface/muted` at 4.31:1, across seven components. That is the same SC 1.4.3
exemption the file already carried for `text/disabled` on `surface/disabled`,
reached from the other direction — the criterion exempts text in an inactive
component regardless of what is behind it.

`.ion-visually-hidden` is in `styles/index.css` because both needed it. Do not
write a third copy: `display: none` and `visibility: hidden` both drop the node
from the accessibility tree, so an announcement placed in one is never made.

---

## Patterns — the tier that owns the states nothing else does

`patterns/*.json` describes compositions. Six for classic screens — `DataTable`,
`Form`, `PageShell`, `DestructiveConfirm`, `SettingsPanel`, `Wizard` — and three
for the agentic tier: `AgentRun`, `HumanApproval`, `AssistantAnswer`. They are
built and verified into `dist/meta/patterns/` by `scripts/build-patterns.mjs` and
published beside the component pages.

**A component tier with no recipes is a tier an agent will compose wrongly.** The
agentic components shipped two releases before their patterns did, and in between
the system had nine contracts for audience C and no answer to how they go
together. Adding a component to that tier means asking which recipe it belongs
to, or writing one.

**A pattern is a documented composition, not a component.** Nothing in
`patterns/` ships React code, and nothing in it may define a token. That is Brad
Frost's distinction, and the `control/<size>/*` deletion recorded further down
this file is the precedent for why it matters: a tier that grows its own tokens
has stopped composing the tier below it and started forking it.

What patterns carry that a component contract cannot is **empty, loading and
error** — and `partial`, for the bulk operation that half-succeeds. Those states
belong to no single component. `Table` has no empty state, correctly; that is the
caller's. Which is exactly why an agent leaves them out: no prop type mentions
them and no type check misses them.

The generator is the gate. A recipe that names a component, a prop, or a variant
value that does not exist fails the build, as does one missing any of the three
states, or one whose state has no `why`. Seven checks, all broken on purpose
before being trusted. This is what keeps `patterns/` from becoming the docs page
that quietly went stale.

Adding a pattern means adding all three states. If you cannot say what the empty
state is, the pattern is not understood well enough to write down yet.

---

## Two llms.txt files, and they are not copies

`scripts/build-llms.mjs` renders `dist/meta` into the format agents are trained
to look for — AWS Cloudscape's shape, copied rather than redesigned:

```
llms.txt                                    package root, COMMITTED, ships in the tarball
<pages>/llms.txt                            written into storybook-static at deploy
<pages>/components/<slug>/index.html.md     35 pages, guidance
<pages>/components/<slug>/index.html.json   35 twins, the full contract
<pages>/meta/index.json                     what the hosted index links to first
```

**The two indexes say different things on purpose.** The hosted one links
absolute URLs, since an agent fetches it with no other context. The tarball one
names local paths, because an agent that found it already has the package on
disk — sending it to a URL for a file two directories away is the failure the
tarball copy exists to prevent. Do not "deduplicate" them.

The markdown is a rendering, never a source. Everything in it comes from
`meta/*.json` and the generated API; editing a page by hand is editing something
that is overwritten on the next build. The tarball `llms.txt` is regenerated by
`pnpm build`, so CI's reproducibility check fails if it is stale.

The generator exits non-zero if any link in the hosted `llms.txt` does not
resolve to a file it just wrote. A 404 there is invisible — no human opens these
pages, and the agent that hits it cannot tell a broken link from a component that
does not exist.

---

## The guardrails ship — `eslint-plugin/` and `stylelint-config.js`

A rule that lives only in this repo protects only this repo. The premise of
IonBase is that the app is written by an agent with no developer reviewing the
output, and the app is where drift actually happens — so the rules are part of
the package:

```
ionbase-ui/eslint-plugin      5 rules, all data-driven from dist/meta
ionbase-ui/stylelint-config   the token rules for a consumer's own CSS
```

**Both are in `files`, and that is easy to get wrong.** `files` was `["dist"]`,
so the first version of this work would have published neither. If you add
anything outside `dist/` that consumers are meant to reach, add it to `files`
and confirm with `pnpm pack` — the exports map will happily point at a path the
tarball does not contain.

### The repo's own configs extend the published ones

`stylelint.config.js` and `eslint.config.js` import from
`packages/ionbase-ui/` by relative path rather than re-declaring rules. One
source, many pointers — the same rule as `CLAUDE.md`. **Edit rules in the
package, not in the root config.** The relative import is deliberate: the
workspace root has no dependency on `ionbase-ui`, and adding one to satisfy a
lint config would be the tail wagging the dog.

### No rule hardcodes anything

Deprecations, contrast ratios, which components need an accessible name, the
spacing scale and Button's default variant all come from
`dist/meta/components.json`. So a defect fixed in Figma silently stops being
linted, with nothing in the plugin touched. `eslint-plugin/meta-data.js` is the
only file that reads it, and it degrades to no-ops on an unbuilt checkout rather
than crashing a consumer's lint run.

### Two rules from the plan were not built

`destructive-needs-confirm` and `no-nested-interactive` both need to know what
_wraps_ a component, which is usually in another file. Under ESLint's per-file
model they would be false-positive generators. They belong in something with
whole-tree visibility, or in the eval harness (phase 5).

### What is NOT dogfooded here, and why it matters

`apps/storybook` runs three of the five rules. The other two are off, and the
reasons do not generalise:

- `no-known-contrast-failure` — the stories exist to render every variant,
  `primary-soft` included. A design system must be able to show a component
  carrying a recorded defect.
- `no-raw-style-values` — every hit is a story decorator (`padding: '120px'` to
  give a Popover room to open). That is fixture scaffolding, and the off-scale
  values are arbitrary on purpose.

**This repo contains no consumer app code, so that second rule's real target is
not exercised by `pnpm lint` at all.** Its coverage comes from the plugin's own
fixtures. If you change it, test it there — a green `pnpm lint` says nothing
about it.

---

## Tokens — read this section in full before editing anything under `packages/tokens`

Full operational guide: [`packages/tokens/README.md`](packages/tokens/README.md).

### Figma owns names and values. This repo does not.

Figma file `gaLbGd0QNb1fUl6BjSpfBA`. Token names and values are decided there.
If a token is wrong, it is fixed in Figma and re-exported. **Never hand-edit
`src/figma/*.json` to change a value or a name** — the next export silently
reverts it, and the repo will disagree with Figma until someone notices.

### The workflow has a Figma half that is not runnable from Node

The plan is non-Enterprise, so there is **no Variables REST API**. Every read and
write to Figma variables goes through the **Figma Plugin API**, which runs inside
Figma and needs the file open in the desktop app. How you get JavaScript in there
is a tooling choice and does not matter to this repo: a Figma plugin console, a
dev-mode plugin, or an MCP bridge (Claude Code and several other agents expose
one as `use_figma`). The scripts are the same either way.

That half is committed as real files in [`packages/tokens/figma/`](packages/tokens/figma/)
— `export-variables.js`, `apply-renames.js`, `resync-code-syntax.js`,
`checksum.js`. **Use those instead of writing new Plugin API code.** They already
handle the ordering and truncation problems described below. They are plain
JavaScript with no tool-specific wrapper, so they paste into any of the above.

Whatever bridge you use, the three traversal rules further down are a hard
prerequisite, not advice — a sweep that skips one returns a confident, wrong
answer rather than an error.

### Styles are a second export, separate from variables

`getLocalVariablesAsync` does not see text styles or effect styles. They need
their own export, and they behave differently:

- **Text styles** are fully variable-bound, so they go through the pipeline:
  `figma/export-text-styles.js` → `src/figma/text-styles.json` →
  `build-typography.mjs` → `dist/css/typography.css`. Never bake a literal in —
  the generator errors instead, because a literal silently stops matching Figma.
- **Effect styles (shadows) are NOT variable-bound**, so they cannot be tokens:
  there is nothing to alias. They go through their own export instead —
  `figma/export-effect-styles.js` → `src/figma/effect-styles.json` →
  `build-elevation.mjs` → `dist/css/elevation.css` as `--ion-shadow-*`. The
  `--ion-` prefix marks "not from the token pipeline". Dark mode overrides those
  same properties — no component file should change.

  **Never hand-write a shadow value.** They were hand-transcribed once and the
  Button focus ring came out fully opaque where Figma renders it at 50% alpha —
  invisible to every check, because `tokens:verify` only sees variables.

`loadCollections()` filters on shape, because `src/figma/` now holds both
variable collections and the text-style export.

### Motion is repo-owned, and Figma _does_ express it

`motion.json` → `build-motion.mjs` → `dist/css/motion.css` as
`--ion-duration-*` / `--ion-ease-*`. Same `--ion-` reasoning as shadows: not a
variable, so nothing to alias.

Figma **can** express motion — as **prototype reactions**, at
`node.reactions[].action.transition`. Do not repeat the mistake of concluding
otherwise: `get_motion_context` and `manualKeyframeTracks` both return empty
for these, so absence there proves nothing. Reactions, styles and keyframe
tracks are three separate places, and `getLocalVariablesAsync` sees none of
them.

It is still not a variable, so it stays repo-owned rather than becoming a fifth
collection. The values also deliberately **disagree** with the one reaction
authored in Figma (Button, 300ms Ease In) — see
[docs/motion-system.md](docs/motion-system.md) §2. That is a recorded decision,
not drift.

## Token architecture v2 — LIVE in Figma since 29 Jul 2026

Full inventory: [docs/token-architecture-v2.md](docs/token-architecture-v2.md).
Reasoning: [docs/naming-decisions.md](docs/naming-decisions.md).

### Four collections, one chain

```
Primitives   143  Value                value-keyed scales only
   ↓
Semantics    114  IonBase              brand identity — ramps, radius, border-width, icon-size
   ↓
Interface    104  Light / Dark         text · icon · surface · border · ring
   ↓
components + CSS

Breakpoint    30  Desktop/Tablet/Mobile   (parallel — type and grid only)
```

Sync state: names `2150110655`, 391 variables (verified against Figma 3 Sep 2026
with `figma/checksum.js` + `scripts/verify-export.mjs` — MATCH). This line read
`944350191` / 384 until then, which was the 7 Aug reading; the export itself was
never out of sync, only this sentence. Re-run the two scripts rather than
trusting the numbers here.

**Components bind Interface and Breakpoint for colour and type.** Interface may
only alias Semantics; Semantics may only alias Primitives. `spacing/*` is the
sanctioned exception — components bind it straight from Primitives, because 16px
means 16px in every brand.

**Geometry is a component fact, not a shared token.** Padding, gap, size and
radius are picked from `spacing/*` or a Semantics ladder (`radius`,
`border-width`, `icon-size`) by each component. Button is 40 tall with 16
padding; Input is 40 tall with 12. Neither number belongs to a shared name.

There was a `control/<size>/*` group and it was deleted — twelve names over zero
new values, every one an alias of a spacing primitive, three of them exact
duplicates of `icon-size/*`, and bound by 3 of 26 components because it had been
reverse-engineered from Button. **Semantics holds ladders, not recipes.** A
ladder is indexed by value and a component picks a rung; a recipe is indexed by
usage and needs a new entry per usage pattern. Do not add another one.

Two gates replace it: `scripts/verify-geometry.mjs` (every geometry binding is
on `spacing/*` or a ladder) and `figma/audit-geometry.js` (raw numbers in Figma,
which no export can see — that is how a literal 10px padding and a whole
component's unbound stroke weights both shipped).

**391 variables, and that number does not grow with the component count.** A new
brand adds a _mode_, not tokens. So does a new theme. It grew by two on
2026-08-06 — `spacing/14` and an `icon-size` rung — and that is the shape of
growth to expect: a new _value_ the ladders did not carry, not a new component.
It grew by seven more since: `palette/1`–`palette/7`, the AvatarGradient hues,
each an alias of a `<hue>/600`. Seven values, zero components.

Button's two new types on 2026-08-07 are the rule working: **Primary Soft and
Success added seventy variants and zero tokens**, because v2 gives every accent
ramp identical slots and `surface/primary-subtle`, `surface/success` and the
rest were already sitting there. The XLarge _size_ did cost one — `spacing/56`,
a value the scale did not carry between 48 and 64. Value, not component.

**A one-off role token is the failure mode to watch for, and it is nearly
invisible.** Authoring those variants also produced `surface/success-strong` —
the only `surface/*-strong` in the whole Interface collection, so it broke the
identical-slots rule on its own. It was bound by exactly two nodes, Success
Small at Default and Focus, while the other eighteen Success variants bound
`surface/success`. It resolved to `success/700`, which is what
`surface/success/hover` resolves to, so those two rendered permanently
pre-hovered and their hover state did nothing.

Nothing caught it. `tokens:tier` passed — it was a legal Interface→Semantics
alias. `tokens:audit` passed — the name is valid v2 grammar. It surfaced only
because a variable **count** disagreed: 385 in Figma against 383 in the repo.
Diff the counts per collection after any Figma session, not just the checksum;
the checksum tells you something moved, the counts tell you what.

Resolved 2026-08-07: the two nodes were rebound to `surface/success`, then the
variable was unbound-checked across every page and every alias and removed.

**A detached text style is the same class of defect and hides even better.**
Button's XLarge label carried no text style at all — someone bumped 18 to 20 by
hand and Figma detached it silently. Nothing in the pipeline could see it: text
styles are not variables, so `tokens:tier` and `tokens:verify` never look, and
the font size looked like a deliberate choice. The tell was a **binding-count
asymmetry** in `bindings.json`: `type/body-md/line-height` bound 70 times where
`type/body-md` was bound 35. A detached label still counts against the rung it
left, while the rung it should have joined has no binding at all. Every size ramp
should bind its size and its line-height the same number of times — when two
halves of one rung disagree, look for a detached style. Fixed by applying
`Body/Large Emphasis`; all four rungs now bind 35/35.

**Primitives are value-keyed.** `scale/8`, not `radius/md`; `font/weight/400`,
not `font/weight/regular`. A primitive carrying a role name collides with the
Semantics token of the same name — that was twelve CSS custom properties where
two tokens claimed one `--var` and the build silently dropped one.

The old `Semantic` and `Component` collections are **deleted**. There is no
component tier; see the promotion rule in the architecture doc §5.

### The repo is in sync — keep it that way

`src/figma/` holds `primitives.json`, `semantics.json`, `interface.json` and
`bindings.json`. Re-export after any Figma edit and check both checksums; the
value one is what catches an edited colour, and it has already caught a
`type/caption/line-height` change nobody mentioned.

**A gate that cannot fail is worse than no gate.** `audit-names.mjs` once
branched on collection names that no longer existed, so it skipped every
structural check and reported a clean 0/0/0 while validating nothing. If you
rename a collection, update the gates — and negative-test them.

### Figma traps that cost real time — read before scripting

**`findAll()` does not descend into hidden instance subtrees.** Nor does
`.children` reliably populate on a hidden instance. Button's icon slots are
`visible: false`, and this made every verification return a false all-clear —
407 live bindings were reported as zero, and the Component collection was deleted
on the strength of that.

**Instance-override reads _and_ writes need the page to be current.** With only
`page.loadAsync()`, a rebind silently no-ops: no error, `rebound: 0`.

So any sweep over component internals must do all three:

1. `await figma.setCurrentPageAsync(page)`
2. walk `.children` recursively, never `findAll()`
3. set hidden `INSTANCE` nodes visible first — repeatedly, since revealing one
   exposes more nested inside — then restore

**Deleting a variable leaves aliases pointing at it**, exactly as it leaves node
bindings pointing at it. Removing `gray/850` left `surface/sunken` [Dark]
dangling. Unbind-then-delete applies to the variable graph, not just the canvas.

### Deleting a variable does not unbind it

Every node keeps resolving a deleted variable, so the component renders fine and
an export that reads only live variables reconciles perfectly.

**Deletion is two operations: unbind every node, then delete.**

[`figma/export-bindings.js`](packages/tokens/figma/export-bindings.js) →
`src/figma/bindings.json` → `scripts/verify-bindings.mjs` is the only check that
sees this — and it is only trustworthy if it follows the three rules above.

### The strict pass

Before calling any component done — new, changed, or deleted:

```bash
pnpm --filter @ionbase-ui/tokens tokens:gate
```

Six checks: `audit` (names), `tier` (the alias chain), `modes` (below),
`verify` (codeSyntax), `bindings` (no ghosts), `geometry`.

### `tokens:modes` — a role that does not theme

Interface is the only collection with a Light/Dark axis; Semantics and
Primitives hold one mode each. So an Interface role whose two modes resolve to
the same value does not theme, and every component binding it draws a
light-mode colour in the dark theme.

`icon/on-color` was `base/white` in both modes for as long as the role existed,
while `text/on-color` was white in Light and black in Dark. `Button` and `Alert`
bind both: in the dark theme a solid button had a black label beside a white
icon. `Icon Button` binds only the icon role, so it drew a white glyph while the
Button next to it drew a black label — two controls that are the same control.

**Nothing caught it, and the contrast gate structurally could not.** That gate
measures text pairings; an icon here is an empty `aria-hidden` element, so
`icon/on-color` produced zero pairings out of 892. A role can be wrong in every
component that binds it and never appear in one measurement. White also clears
the 3:1 that non-text needs on all five Dark accent surfaces (3.6–4.59), so even
a gate that did measure icons would have passed it. The defect was incoherence,
and incoherence is not a ratio — which is why this check compares modes rather
than measuring anything.

Two roles are identical on purpose and declared in `SAME_ON_PURPOSE` with the
argument: `text/disabled` and `icon/disabled`, one mid grey that has to read as
unavailable against a light ground and a dark one. Adding to that list requires
a reason, and an entry that stops applying fails the build — otherwise the list
becomes a place bugs go to be permitted.

### Generated vs committed

Committed and reviewed: `src/figma/*.json` (the export), `renames.json`,
`known-defects.json`.

Generated, git-ignored, never edit: `src/dtcg/`, `src/generated/`, `dist/` — and,
in the published package, `packages/ionbase-ui/src/tokens/` and
`packages/ionbase-ui/src/styles/tokens/`, which `sync-tokens.mjs` copies in on
every build. Both are declared as Turbo `build` outputs; if you drop them from
`turbo.json`, a cache hit restores `dist/` while leaving those stale and the
package compiles against last week's tokens.

`token-overrides.json` is repo-owned and must stay **outside** `src/figma/`,
because a re-export overwrites everything in there. It records what Figma cannot
express — currently that `grid/columns` is a count, not a length, so it ships as
`12` rather than `12px`. Figma scopes it `WIDTH_HEIGHT` like every other FLOAT,
so nothing in the export distinguishes them.

`motion.json` is repo-owned for the same reason and lives beside it, also
outside `src/figma/`.

`src/figma/*.json` is formatted one token per line and is in
`.prettierignore` **on purpose** — Prettier explodes each entry to six lines and
buries the signal in value diffs. Do not "fix" that.

### Renames are the dangerous operation

Renaming in Figma is non-destructive (aliases bind by variable ID). The risk is
not breakage — it is that **a bad rename map cannot be undone**, because the old
names no longer exist.

So: `node scripts/verify-renames.mjs` must print `Clean. Safe to apply to Figma.`
**before** anything is written to Figma. It applies the map in memory and
re-runs the audit. Never skip it, never apply a map it rejects.

Figma requires unique names per collection, so a rename whose target is still
occupied must wait. `apply-renames.js` defers and retries until no progress —
that is what makes swaps (`A→B`, `B→C`) work without temp names.

### Two traps

**A name can be both a token and a folder.** `bg/brand` is a variable _and_ the
parent of `bg/brand/hover`. DTCG cannot represent that — a group cannot hold a
`$value`. Such leaves are parked under a `DEFAULT` child, stripped again when
generating CSS. If you touch `figma-to-dtcg.mjs` or the CSS name transform,
preserve this or ~26 tokens vanish silently.

**`codeSyntax` is not authoritative.** It is what Dev Mode displays and it can be
wrong; the first export had 11 variables advertising a CSS variable owned by a
different token. **CSS is generated from the token path, never from
`codeSyntax`.** The two agreeing is a checked invariant (`tokens:verify`), not
something the pipeline relies on.

### Verifying repo ↔ Figma sync

Run `figma/checksum.js` in Figma, then:

```bash
node scripts/verify-export.mjs --expect <count> <checksum>
```

Do this after any Figma variable edit, and before trusting a build.

---

## The naming spec governs grammar only

[`docs/variable-naming-spec.html`](docs/variable-naming-spec.html) defines the
v2 grammar:

```
Interface    <element>/<role>[/<state>]     surface/primary/hover
Semantics    <group>/<step>                 primary/500, radius/xl
Primitives   <family>/<step>                color/blue/500
Breakpoint   <group>/<role>/<property>      type/h1/line-height
```

`scripts/audit-names.mjs` enforces it on every build — **once updated for v2**.
It still carries the v1 vocabulary and will reject every new name until then.

**The spec does not decide colour mapping.** Which grey is body text, how many
steps a ramp has, which intents need hover states — those are design decisions,
made in Figma against real components where they can be seen. An agent that
renames tokens to make the spec tidier is destroying information.
This has already happened once; see the correction in
[`docs/token-migration-plan.md`](docs/token-migration-plan.md).

When amending a vocabulary, **spec + Figma + `packages/tokens` change in the same
PR**. The vocabularies exist in two places that must stay in step: the spec's
§4/§5 tables, and the constants at the top of `scripts/audit-names.mjs`.

---

## Known open items

**Demand-driven ramps are gone.** v2 gives every accent role identical slots, so
the old "danger has five steps, warning has two" asymmetry cannot recur. Full
ramps live in Semantics; Interface picks the step.

**Button and Icon Button disagree on Primary Neutral's press, and code follows
Button.** `Button` pins all four sizes to `Inset/Flush/lg` while their rest
states scale xs/sm/lg/lg like every other type — the one place in that component
where size stops mattering, flagged in `button.css` as reading more like an
unfinished edit than a decision. `Icon Button`, drawn later, does **not**
reproduce it: its Primary Neutral presses `Inset/Lifted/{xs,sm,lg,lg}`, tracking
its own rung exactly like Primary Brand.

Both were re-measured on 2026-08-28 and the disagreement is real, not a stale
reading. `button.css` serves both — there is one React `Button` and the icon-only
case is the same component — so code cannot honour both and currently follows
`Button`. Two sets drawing one component two ways is the thing to resolve, in
Figma, before anything is changed here; whichever way it goes, it is a one-line
edit to `--ion-button-pressed` on the `primary-neutral` variant.

**Contrast is now checked — by `ionbase-ui`, not by the token pipeline.**
`tokens:tier` proves an alias resolves; `tokens:verify` proves a name matches its
`codeSyntax`. Neither knows whether the resulting pair can be read, and neither
can: the question is not "do these two tokens contrast" but "which pairs do the
components actually create", and only the shipped CSS answers that. A naive
cross-product of every text role against every surface role returns 53 failures
for `text/on-color` alone, nearly all meaningless, because nothing puts
on-colour text on `surface/default`.

So the gate lives in `packages/ionbase-ui`, which has both the component
stylesheets and the resolved token CSS:

```bash
pnpm --filter ionbase-ui contrast        # runs in the build
pnpm --filter ionbase-ui contrast:list   # every pairing, worst first
```

### Dark was deferred, and is not any more — 4 Sep 2026

`contrast-exceptions.json` carries `deferredModes: []`. **Dark is enforced.** The
gate measures 892 pairings across both modes and fails the build on either.

It was deferred from 18 Aug to 4 Sep 2026, and the reason was sound: the theme
was still being designed, and measuring it mid-design produced findings that were
true of that day's values and were being shipped anyway — into `Button` and
`Alert`'s contracts on npm, and into `ionbase-ui/eslint-plugin`, which was
telling consumers not to use `variant="primary-soft"` and so warning a light-only
app off a component that was fine for it.

**What the five Dark defects turned out to be.** Not five problems. Two:

- **Three accent text roles were on the wrong rung.** Every accent in Dark is
  built the same way — `subtle` = 900, `subtle/hover` = `tint` = 800 — but
  `text/error` and `text/information` had moved to the `/300` step while
  `text/primary`, `text/success` and `text/warning` were still on `/400`. The two
  that had moved cleared AA comfortably (5.73, 6.35); of the three left behind,
  primary read 4.25 and success 3.79. All three now sit on `/300`.
- **The purple ramp did not hold its slot.** Of the eight ramps, purple was the
  only one whose luminance fell outside its siblings' range — at `/500`
  (0.122 against 0.179–0.242) and again at `/400` (0.222 against 0.310–0.354). It
  was consequently the only ramp that failed black text on a Dark solid surface,
  and the only one that failed as Dark foreground on `surface/muted`. Lifted to
  `#786cdd` and `#9a8ff4`, hue and saturation held.

**`text/success` was a defect the gate could not see.** No component composes
`text/success` on `surface/success-subtle/hover`, so the pairing was never among
the measured set; it would have failed the day someone built a soft success
button. It was found by comparing every accent against its siblings rather than
by measuring what ships — worth remembering, because the gate is deliberately
built to measure only real pairings, and that is exactly the blind spot the
choice buys.

**Two knock-ons the change forced, neither of them optional.** Lifting
`purple/500` would have landed `chart/3` within 1.09 of `chart/1` in luminance —
two adjacent hues at the same lightness, which is where a categorical palette
stops being categorical. `chart/3` is re-pointed to `purple/600` (1.63, better
separated than the 1.33 it had before). And `text/link` moving to `primary/300`
collided with its own hover, so `text/link/hover` moved to `primary/200`.

To defer a mode again, put its name back in `deferredModes`: the gate keeps
measuring and printing it, and stops failing, contracting and linting on it.

### The gate has now moved a design, which is what it is for

`AvatarGradient` shipped its first draft as a saturated disc — `color/<hue>/500`
to `/600` — with white initials. Four of the seven failed AA in **Light**: pink,
orange, green and red, at 3.53, 3.6, 3.69 and 3.78 against 4.5. They were the
first Light defects this repo had ever carried, and they were recorded as
`defect` rather than `wcag-exempt` on purpose. Exempt was available and wrong:
the initials are `aria-hidden` and the accessible name comes from `alt`, so a
screen reader loses nothing — but SC 1.4.3 is about **visible** text, and these
are visible text a sighted user is expected to read.

**They were not fixed in CSS, and that is the part worth copying.** The values
belong to Figma; darkening one end here would have put the repo and the file
into the silent disagreement the whole token pipeline exists to prevent. The
component was inverted in Figma instead — a pale `300 -> 200 -> 50` disc with
the initials carrying the colour at `600` — and re-exported. All four exceptions
were then pruned, because an exception that no longer fails is itself an error.

Two things survive from it. **Do not "restore" the saturated version**; it is
not a style preference that changed. And the trap that produced a _second_
finding on the way through: the draft used `--text-on-color` and `--text-default`
for the initials, which is what every other component in this system correctly
does, and here it is a bug. The disc is built from **primitives**, which do not
theme, while both of those text tokens do — so Dark flipped the foreground,
left the background alone, and `Light` measured 1.05:1. A foreground has to
theme exactly as much as the background it sits on. The `--color-*` values in
`avatar-gradient.css` are deliberate.

### A primitive re-export moved pink a whole rung — 2026-08-28

The red ramp was retuned to fix `AvatarGradient`'s last contrast failure
(`red/600` #dc2828 -> #c61616, and 500/700/800/900 with it). The same export
also shifted **pink**, and that one is the dangerous shape:

```
pink/500  #f04299 -> #df2679     each value slid one rung DOWN the ramp
pink/600  #df2679 -> #c3135c
pink/700  #c3135c -> #a0134b
```

Nothing was renamed, so `verify-renames.mjs` had nothing to say and every
`var(--color-pink-600)` in the repo kept resolving — to a different colour.
`avatar-gradient.css` was pointing at `pink/700` precisely because that is where
#c3135c used to live, and after the export it would silently have rendered
#a0134b. It now points at `600`, like every other hue.

**A value moving under a stable name is invisible to every name-based gate.**
The one that catches it is the value checksum described under "Value drift needs
its own checksum" — run it after any Figma session where colours were touched,
and re-read any component that names a primitive rung directly rather than a
semantic token. Components that used semantic aliases were unaffected here,
which is the argument for preferring them wherever the surface actually themes.

### Figma has a `palette` collection the token export does not cover

Found while re-reading `Avatar Gradient` on 2026-08-28: its initials are bound
to variables named `palette/1` through `palette/7`, and nothing in
`src/styles/tokens/` defines a `--palette-*`. Each one currently resolves to a
`color/<hue>/600` primitive, so the component names those primitives directly
and loses nothing today.

It is still a gap, and it is the shape AGENTS.md already warns about under
"Verifying repo ↔ Figma sync": a collection that exists in Figma and not in the
export is invisible to every gate here, because all of them start from what was
exported. Diff the collection list, not just the variable checksum, after any
Figma session. If `palette` is meant to ship, export it and move
`avatar-gradient.css` onto it.

It extracts 250 real pairings from 17 stylesheets by resolving the cascade —
BEM blocks, compound modifiers, state inheritance, component-local `--ion-*`
indirection, and alpha compositing for translucent hover overlays. Accepted
results live in `contrast-exceptions.json`, which distinguishes `wcag-exempt`
(SC 1.4.3 exempts inactive controls — this will never need fixing) from
`defect` (real, unfixed, reported on every build and copied into the affected
components' `a11y.knownIssues`).

Negative-tested on five deliberate breaks before being trusted, including one it
initially MISSED: renaming a token in `base.css` alone left `theme-dark.css`
still defining it, so a mode-agnostic coverage check saw it as covered. Coverage
is per (role, mode) now, and an unresolved token is an error rather than a quiet
skip — otherwise a renamed token just shrinks the pairing count and still
exits 0.

The history this replaces: two AA failures reached production unnoticed —
`text/error` on `surface/error-subtle` at 3.38:1 in dark and `text/information`
at 4.12:1 — and were fixed on 2026-08-14 by moving those two roles to
`error/300` and `information/300`. The gate measures both of those exact
pairings today, through `Alert` — at 5.56:1 and 7.65:1 in Dark — so at their old
values it would have failed the build rather than letting them ship.

**Known and deliberately unfixed**, pending a decision on the accent ramps:

| pairing                                         | mode | ratio  | where                                     |
| ----------------------------------------------- | ---- | ------ | ----------------------------------------- |
| `surface/information` + `text/on-color`         | Dark | 3.44:1 | Alert `emphasis=solid intent=information` |
| `text/primary` + `surface/primary-subtle-hover` | Dark | 4.25:1 | Button `primary-soft`, hover              |
| `text/primary` + `surface/primary-tint`         | Dark | 4.25:1 | Button `primary-soft`, pressed            |

**This table said `surface/information` was "not yet used". It was wrong** —
`Alert` has shipped it since 0.13.1, and the Alert stylesheet's own comment said
so. Two documents disagreed and neither was checked. The bottom two rows were
not known at all until the gate measured them.

That is the argument for `verify-contrast.mjs` in one paragraph: the facts here
were stale, contradicted elsewhere in the repo, and incomplete, because they
were maintained by hand.

Button's largest label is 20px/500 — 15pt, not bold — so the 3:1 large-text
allowance never applies; all four sizes need 4.5:1. Icons on the same surfaces
pass, since SC 1.4.11 asks 3:1.

### The success failure was fixed in Primitives, not in Interface — copy this

`surface/success` + `text/on-color` measured 3.69:1 in Light and is now
**5.24:1**, fixed in Figma on 2026-08-18 by **shifting the green primitive
ramp**: the old `green/600` became `green/500`, 700→600, 800→700, 900→800, a
new darker `#023c13` was added at 900, and 50/300/400 were retinted. Eight of
ten rungs changed; `green/100` and `green/200` did not.

The important part is which tier moved. Every accent runs base/hover/pressed at
600/700/800 (Light) and 500/400/300 (Dark), so re-pointing `surface/success`
from `success/600` to `success/700` would have made the base identical to its
own hover — the `surface/success-strong` bug again. Changing the **values
underneath** left every Interface role on the rung it already had, so the
base/hover/pressed relationship survived untouched and no Interface or
Semantics variable changed at all: three of four collections re-exported
byte-identical.

Measured after the change — all four Button sizes, both modes:

| pairing                   | Light   | Dark    |
| ------------------------- | ------- | ------- |
| `surface/success`         | 5.24:1  | 5.70:1  |
| `surface/success/hover`   | 7.34:1  | 7.89:1  |
| `surface/success/pressed` | 10.08:1 | 12.43:1 |

**`surface/information` is the same shape of problem and takes the same fix** —
move the purple primitives, not the role bindings.

### Value drift needs its own checksum, and `verify-export.mjs` does not have one

This section used to say "check both checksums". There is only one:
`verify-export.mjs` hashes `name|codeSyntax`, so it is blind to an edited
colour by construction — the green change above left it reading **944350191
against 384 variables, unchanged and passing**, exactly as it would have if
nothing had been touched.

Until a real gate exists (`verify-contrast.mjs`, see
[docs/agent-readiness-plan.md](docs/agent-readiness-plan.md) phase 2c), diff
values by hand after a Figma session: hash `name|mode|value` per collection on
both sides and compare. The green edit showed as Primitives `1214013219` →
`1811607948` with Breakpoint, Interface and Semantics all identical, which is
what told us the blast radius was one collection before anything was rebuilt.

The old note claiming `surface/warning` has no passing dark pairing was stale
and is removed: `{warning.500}` → `#ea5600` against `{base.black}` measures
5.83:1.

**Text styles must bind Semantics, never a Primitive.** They carry `fontFamily`
and `fontStyle` bindings but are not variables, so `tokens:tier` cannot see them;
both tiers render identically, so the defect is invisible until a second brand
exists. `build-typography.mjs` warns on every offending field — treat that
warning as a build break. Full rule and the recovery procedure:
[docs/token-architecture-v2.md](docs/token-architecture-v2.md) §6b and
[packages/tokens/README.md](packages/tokens/README.md#a-text-style-must-bind-semantics-never-a-primitive).

---

## Conventions

- Reference files as clickable markdown links, not backticks.
- Build scripts are `.mjs` under `scripts/`, plain JS, Node globals only —
  ESLint is configured for that; don't add TypeScript there.
- `plan/IONBASE-BUILD.md` is the private build log. It is git-ignored and holds
  stage history plus the current checksum. Update it when a stage completes; do
  not commit it.
