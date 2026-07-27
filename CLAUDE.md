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
- **Effect styles (shadows) are NOT variable-bound**, so they cannot be tokens
  yet. They are hand-authored in `@ionbase/styles/src/elevation.css` as
  `--ion-shadow-*`. The `--ion-` prefix marks "authored in code"; `--shadow-*`
  would mean it came from the pipeline. Dark mode overrides those same custom
  properties — no component file should change.

`loadCollections()` filters on shape, because `src/figma/` now holds both
variable collections and the text-style export.

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

[`docs/variable-naming-spec.html`](docs/variable-naming-spec.html) defines:

```
<component>/<variant>/<part>/<property>/<state>
```

`scripts/audit-names.mjs` enforces it on every build.

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

## Known open item

Intent ramps are demand-driven, not systematic: `danger` has `default`/`hover`/
`pressed` because a destructive button was built; `warning` has only `subtle`
because it only appears in badges. 14 of 58 semantic tokens are consumed by
nothing. Documented in the build log §3.3.

**Do not "fix" this by making every ramp symmetric** — that adds ~40 more unused
tokens. It needs a policy decided in Figma.

---

## Conventions

- Reference files as clickable markdown links, not backticks.
- Build scripts are `.mjs` under `scripts/`, plain JS, Node globals only —
  ESLint is configured for that; don't add TypeScript there.
- `plan/IONBASE-BUILD.md` is the private build log. It is git-ignored and holds
  stage history plus the current checksum. Update it when a stage completes; do
  not commit it.
