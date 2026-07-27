# @ionbase/tokens

Design tokens, exported from Figma and built to CSS custom properties + TypeScript.

**Figma is the source of truth for token names and values. This package never
invents either.** If a token looks wrong, fix it in Figma and re-export — do not
hand-edit the JSON.

Figma file: `gaLbGd0QNb1fUl6BjSpfBA` (IonBase Design System)

---

## Using the tokens

```ts
import { semantic, tokens } from '@ionbase/tokens';

semantic['bg/brand/default']; // 'var(--bg-brand-default)'
```

```css
@import '@ionbase/tokens/css'; /* base + dark + breakpoints */
```

Exports `var()` references rather than resolved values on purpose: a component
that inlines `#286ef0` stops responding to the theme, which is the whole thing
the token layer exists to prevent. Raw per-mode values are available as
`tokenValues` for docs tables and contrast checks.

Themes are applied with `data-theme="dark"` on any ancestor. Breakpoint tokens
switch automatically via media queries.

---

## What is generated vs. committed

| Path                   | Committed? | What it is                                                |
| ---------------------- | ---------- | --------------------------------------------------------- |
| `src/figma/*.json`     | **yes**    | Flat mirror of the Figma export. **The source of truth.** |
| `renames.json`         | yes        | Reviewed rename map, applied by hand to Figma             |
| `token-overrides.json` | **yes**    | Repo-owned build hints Figma cannot express               |
| `known-defects.json`   | yes        | Figma defects tracked so the build stays green            |
| `src/dtcg/*.json`      | no         | DTCG docs, one per (collection, mode)                     |
| `src/generated/`       | no         | Generated TS                                              |
| `dist/`                | no         | CSS + compiled TS                                         |

Everything not committed is rebuilt by `pnpm build`. Never edit it.

---

## Commands

```bash
pnpm build          # dtcg -> audit -> verify -> css -> ts -> tsc
pnpm tokens:audit   # names parse against the naming spec grammar
pnpm tokens:verify  # codeSyntax.WEB matches the token path
```

`pnpm build` fails if a name stops parsing, if `codeSyntax` drifts, or if a
tracked defect is fixed in Figma but left in `known-defects.json`.

---

## The two halves

Half the workflow runs in Node; half runs **inside Figma**, because a
non-Enterprise plan has no Variables REST API. The Figma half lives in
[`figma/`](./figma) as real files — paste them into the `use_figma` MCP tool (or
a Figma plugin console) with the file open.

| Node (`scripts/`)                           | Figma (`figma/`)                                        |
| ------------------------------------------- | ------------------------------------------------------- |
| `figma-to-dtcg.mjs` — flat export → DTCG    | `export-variables.js` — dump one collection             |
| `audit-names.mjs` — grammar gate            | `apply-renames.js` — rename/delete variables            |
| `verify-code-syntax.mjs` — codeSyntax gate  | `resync-code-syntax.js` — rewrite codeSyntax from paths |
| `verify-renames.mjs` — rename dry run       | `checksum.js` — checksum for sync verification          |
| `verify-export.mjs` — repo↔Figma sync check |                                                         |
| `build-css.mjs`, `build-ts.mjs` — outputs   |                                                         |

---

## Task: re-export after changing variables in Figma

1. Run [`figma/export-variables.js`](./figma/export-variables.js) once per
   collection (set `COLLECTION` at the top). Save each result over the matching
   `src/figma/<collection>.json`, verbatim.
2. Run [`figma/checksum.js`](./figma/checksum.js), then confirm the repo agrees:
   ```bash
   node scripts/verify-export.mjs --expect <count> <checksum>
   ```
3. `pnpm build`.

If step 2 mismatches, the export is incomplete — most likely a collection was
missed, or the output was truncated in transit. Do not build on it.

---

## Task: rename tokens

Renaming in Figma is non-destructive (aliases bind by variable ID), but a **bad
rename map is not recoverable**, because the old names no longer exist to undo
from. So the map is always proven before it is applied.

1. Add the renames to `renames.json`.
2. Dry run — this applies the map in memory and re-runs the full audit:
   ```bash
   node scripts/verify-renames.mjs
   ```
   It must print `Clean. Safe to apply to Figma.` If it doesn't, fix the map.
   **Do not skip this.** Without it you can rename dozens of variables into a
   different set of violations.
3. Paste the map into [`figma/apply-renames.js`](./figma/apply-renames.js) and
   run it in Figma.
4. Mirror the change locally, then verify and build:
   ```bash
   node scripts/apply-renames-local.mjs
   node scripts/verify-export.mjs --expect <count> <checksum>   # from figma/checksum.js
   pnpm build
   ```
5. Empty out `renames.json` once it's applied.

---

## Repo-owned build hints

`token-overrides.json` holds the things Figma has no way to express. Today that
is one entry: `grid/columns` is a **count, not a length**, so it must not get a
`px` suffix. Figma scopes it `WIDTH_HEIGHT` exactly like `grid/margin`, so the
export cannot tell them apart.

It lives outside `src/figma/` **on purpose** — anything stored there is
overwritten by the next export. If a token needs build behaviour Figma can't
describe, add it here, never to the export.

---

## Three things that will bite you

**A name can be both a token and a folder.** `bg/brand` is a real variable _and_
the parent of `bg/brand/hover`. DTCG cannot express that — a group cannot hold a
`$value`. Those leaves are parked under a `DEFAULT` child and the segment is
stripped when generating CSS, so `--bg-brand` is unaffected. If you see
`DEFAULT` in a DTCG file, that is why; it must never reach CSS.

**`codeSyntax` is not authoritative.** It is what Dev Mode _shows_, and it can be
wrong — the first export had 11 variables advertising a CSS variable that already
belonged to a different token. Generation reads the **token path** instead. The
two agreeing is a checked invariant (`tokens:verify`), not an assumption.

---

## Naming

Every name must parse against [`docs/variable-naming-spec.html`](../../docs/variable-naming-spec.html):

```
<component>/<variant>/<part>/<property>/<state>
```

`tokens:audit` enforces it. The spec governs **grammar only** — which grey is
body text, or how many steps a ramp needs, is decided in Figma against real
components, never in the spec.

Amendment rule: **spec + Figma + this package change in the same PR.**
The vocabularies live in two places that must stay in step — the spec's §4/§5
tables, and the constants at the top of `scripts/audit-names.mjs`.
