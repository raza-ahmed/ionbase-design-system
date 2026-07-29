# IonBase — working notes for AI agents

Design system monorepo. pnpm workspaces + Turborepo, strict TypeScript ESM, Node 22.

Read this before touching tokens. Most of what follows is non-obvious from the
code, and getting it wrong is expensive rather than merely wrong.

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
write to Figma variables goes through the Plugin API via the `use_figma` MCP
tool, which needs the file open in the Figma desktop app.

That half is committed as real files in [`packages/tokens/figma/`](packages/tokens/figma/)
— `export-variables.js`, `apply-renames.js`, `resync-code-syntax.js`,
`checksum.js`. **Use those instead of writing new Plugin API code.** They already
handle the ordering and truncation problems described below.

Before calling `use_figma`, load the `figma-use` skill — it is a hard
prerequisite, not advice.

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

## Token architecture v2 — LIVE in Figma since 29 Jul 2026

Full inventory: [docs/token-architecture-v2.md](docs/token-architecture-v2.md).
Reasoning: [docs/naming-decisions.md](docs/naming-decisions.md).

### Four collections, one chain

```
Primitives   141  Value                value-keyed scales only
   ↓
Semantics    106  IonBase              brand identity — ramps, radius, border-width, icon-size
   ↓
Interface    103  Light / Dark         text · icon · surface · border · ring
   ↓
components + CSS

Breakpoint    30  Desktop/Tablet/Mobile   (parallel — type and grid only)
```

Sync state: names `3840062063`, 380 variables.

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

**380 variables, and that number does not grow with the component count.** A new
brand adds a _mode_, not tokens. So does a new theme.

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
pnpm --filter @ionbase/tokens tokens:gate
```

### Generated vs committed

Committed and reviewed: `src/figma/*.json` (the export), `renames.json`,
`known-defects.json`.

Generated, git-ignored, never edit: `src/dtcg/`, `src/generated/`, `dist/`.

`token-overrides.json` is repo-owned and must stay **outside** `src/figma/`,
because a re-export overwrites everything in there. It records what Figma cannot
express — currently that `grid/columns` is a count, not a length, so it ships as
`12` rather than `12px`. Figma scopes it `WIDTH_HEIGHT` like every other FLOAT,
so nothing in the export distinguishes them.

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

**`surface/warning` in dark has no passing text pairing** — `text/on-color` is
2.64 and `text/default` is 2.48. Measured and recorded in
[docs/token-architecture-v2.md](docs/token-architecture-v2.md) §6a, deliberately
not "fixed": the values are a design decision. Resolve before a solid warning
surface carries body text.

**The repo has not been re-exported.** `src/figma/` is still v1 — see above.

---

## Conventions

- Reference files as clickable markdown links, not backticks.
- Build scripts are `.mjs` under `scripts/`, plain JS, Node globals only —
  ESLint is configured for that; don't add TypeScript there.
- `plan/IONBASE-BUILD.md` is the private build log. It is git-ignored and holds
  stage history plus the current checksum. Update it when a stage completes; do
  not commit it.
