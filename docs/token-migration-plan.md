# Token naming migration — completed 2026-07-27

Status: **applied and verified.** Figma and the repo are in sync, checksum-matched.

Decision: **the Figma file conforms to the spec**, not the other way round. Every
variable name now parses against the grammar in `variable-naming-spec.html`.

|                         | Before    | After         |
| ----------------------- | --------- | ------------- |
| Variables               | 297       | 296           |
| Grammar errors          | 10        | **0**         |
| Vocabulary drift        | 12        | **0**         |
| Intent slot omitted     | 23        | **0**         |
| `codeSyntax` exact      | 286 / 297 | **296 / 296** |
| CSS names claimed twice | 10        | **0**         |

54 renames, 1 deletion, 60 `codeSyntax` rewrites, 58 aliases repointed.
Checksum after the `fg` revert: `296 / 2693417935`.

---

## Why this was worth doing before Stage 2

Nothing consumes these tokens yet. Once `@ionbase/styles` and the React
components are written against them, every one of these renames becomes a
breaking change with a migration guide attached. The window was now.

The migration renames for **grammar only**. No token value moved, and no name
changed meaning — see the correction under the `fg` ramp for the one place that
was briefly got wrong and reverted.

Where the spec's authority ends: it validates that a name parses, that slots are
in order, and that words come from the closed lists. It does **not** decide which
grey is body text or how many steps a ramp needs. Those are design decisions,
made in Figma against real components.

---

## What changed, and why

### Grammar fixes

| Was                                | Now                         | Rule                                                                       |
| ---------------------------------- | --------------------------- | -------------------------------------------------------------------------- |
| `button/disabled/bg`               | `button/bg/disabled`        | State is always last. The old form reads as a "disabled button" _variant_. |
| `button/disabled/fg`               | `button/fg/disabled`        | same                                                                       |
| `button/disabled/border`           | `button/border/disabled`    | same                                                                       |
| `button/ring/offset`               | `button/offset/ring`        | Part slot sits before the property                                         |
| `button/ring/inner`                | `button/inner/ring`         | same                                                                       |
| `table/row/bg/striped`             | `table/striped/row/bg`      | `striped` is a variant, not an interaction state                           |
| `tabs/pill/item/bg/selected-hover` | `…/bg/hover-selected`       | composed states run in vocabulary order                                    |
| `table/row/bg/selected-hover`      | `…/bg/hover-selected`       | same                                                                       |
| `font/family/serif 2`              | `font/family/serif-display` | space and numeric suffix broke §9                                          |

`table/cell/fg/muted` was **deleted** — a pass-through to `{fg.muted}` with no
component-tier decision behind it (Rule 06). Consumers use `fg/neutral/muted`.

### The `fg` ramp — names only, hierarchy preserved

| Was            | Now                    | Value                        |
| -------------- | ---------------------- | ---------------------------- |
| `fg/muted`     | `fg/neutral/muted`     | gray500                      |
| `fg/subtle`    | `fg/neutral/subtle`    | gray600                      |
| `fg/secondary` | `fg/neutral/secondary` | gray700                      |
| `fg/body`      | `fg/neutral/body`      | gray800 ← body text          |
| `fg/default`   | `fg/neutral/default`   | gray900 ← the strong default |

`secondary` and `body` were added as Role steps so the existing five-value ramp
had five legal names. **No value moved and no name changed meaning.**

> **Correction.** The first pass of this migration renamed `fg/body` → `default`
> and `fg/default` → `emphasis`, arguing the name should match the "default body
> text" description. That was wrong — the ramp is deliberate: `body` is a step
> lighter than `default` so long-form copy sits below headings instead of
> competing with them. The spec governs grammar; it does not get a say in which
> grey is body text. That call belongs in Figma, where it can be seen. Reverted.

### The border ramp

`emphasized` / `strong` / `bold` were three adjacent steps where the scale
offered one. Rather than collapse them, all three were admitted to the Role
vocabulary — the file genuinely holds three distinct border weights. The spec
carries a warning that if the ramp ever drops to two steps, the middle word goes
with it.

This also cleared three code-syntax defects: all three had advertised
`--border-strong`.

### Vocabulary amendments

| Slot   | Added                                             | Reason                                                                                               |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Role   | `secondary`, `body`, `tint`, `emphasized`, `bold` | Real steps that existed in the file with no legal name                                               |
| Role   | `disabled` (off-scale)                            | A condition, deliberately not a point on the prominence ordering                                     |
| Intent | `link`                                            | Links keep their own hue assignment, so re-branding does not silently restyle every link             |
| Intent | `scrim`                                           | Translucent layers. The one intent whose value is an alpha, not a hue                                |
| State  | composition rule                                  | `<state>-<state>`, both in the closed list, in vocabulary order — one legal spelling per combination |

Role scale is now, faint to strong:
`muted · subtle · tint · secondary · body · default · emphasized · strong · bold · emphasis · inverse`
plus off-scale `disabled`.

---

## How it was made safe

1. **`audit-names.mjs`** — parses every name against the grammar. Turns the
   spec's claim ("names are parseable") into something a machine checks.
2. **`verify-renames.mjs`** — applied the map to an in-memory copy and re-ran the
   audit _before_ touching Figma. It had to come back at 0/0/0, otherwise the
   migration would have renamed 54 variables into a different set of violations,
   in a file where the old names were already gone.
3. **Ordered rename in Figma** — Figma requires unique names within a collection,
   so the apply loop defers any rename whose target is still occupied and repeats
   until it makes no progress. No transient collisions.
4. **`verify-export.mjs`** — checksums every `name|codeSyntax` pair on both sides.
   Matched at `296 / 2693417935`.

Figma renames are non-destructive: aliases and instance bindings are by variable
ID, so nothing rebound and no design work was disturbed.

---

## Standing guarantees

`pnpm --filter @ionbase/tokens build` now fails if any of these regress:

- a name stops parsing against the grammar (`tokens:audit`)
- `codeSyntax` stops matching the token path (`tokens:verify`)
- a tracked defect gets fixed in Figma but is not removed from
  `known-defects.json` — so the list cannot rot

`known-defects.json` is empty. Every CSS variable name is claimed by exactly one
token.

Re-verify sync after any Figma edit:

```
node scripts/verify-export.mjs --snippet     # prints the Figma-side code
node scripts/verify-export.mjs --expect <count> <checksum>
```
