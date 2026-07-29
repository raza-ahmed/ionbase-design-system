# Naming decisions — why the rules are what they are

The spec ([variable-naming-spec.html](variable-naming-spec.html)) says **what** the
rules are. It is built to be looked up, so it carries no justification. This file
carries the justification. Read it once; you should rarely need it again.

Newest first.

---

## 2026-07-29 (evening) — v2 is live in Figma

390 variables, four collections, zero ghosts, zero dangling aliases. The old
`Semantic` (71) and `Component` (89) collections are deleted. 8,514 bindings
across 2,672 component nodes resolve Interface → Semantics → Primitives.

### The lesson that cost the most: `findAll()` lies about hidden instances

`node.findAll()` **does not descend into hidden instance subtrees**, and
`node.children` on a hidden instance often returns empty until the instance is
made visible. Button's icon slots are `visible: false` by default.

Consequences, all of which actually happened:

- Every verification sweep reported **zero legacy bindings**, so the Component
  collection was deleted. **407 bindings were live at that moment** — 148 on
  Button alone. They rendered correctly because Figma keeps serving deleted
  variables, which is exactly what makes this class of bug expensive.
- Writes had the same problem in reverse: rebinding a node inside an instance
  **silently no-ops** unless its page is the current page. No error, no
  exception, just `rebound: 0` while the verification pass disagreed.

**The reliable method**, now the only one to use:

1. `await figma.setCurrentPageAsync(page)` — required for instance-override
   reads _and_ writes.
2. Walk `.children` recursively, not `findAll()`.
3. Set every hidden `INSTANCE` to `visible = true` first, repeatedly — revealing
   one exposes more nested inside it — then restore afterwards.

A sweep that skips any of the three returns a false all-clear.

### `gray/850` reversed twice

Planned as `gray/950`; wrong, because `gray/900` is already `#070a0d` and a step
below it is invisible. Corrected to `gray/850` at the real gap in the ramp. Then
removed again during the accessibility pass, which re-tuned dark by hand instead.
The only casualty was `surface/sunken` [Dark], left dangling at the deleted
`neutral/850` — repointed to `neutral/900`.

Worth remembering: **deleting a variable leaves aliases pointing at it**, exactly
as it leaves node bindings pointing at it. The variable graph needs the same
unbind-then-delete discipline as the canvas.

### `text/*` on icons, and why alignment changed colours

The migration mapped every `fg/*` to `text/*` uniformly, because at that point
nothing distinguished an icon vector from a text node. 104 non-text nodes ended up
on text tokens. Aligning them by name (`text/<role>` → `icon/<role>`) changed
colours, because the icon ladder is deliberately offset one step from the text
ladder — `text/default` is `#131923`, `icon/default` is `#1d2735`.

That offset is the point of splitting `fg` into two elements. It also means a
straight name swap is never value-preserving, and that is fine — it was chosen
deliberately over keeping value-matched but misleadingly-named bindings.

### Also added along the way

- `font/family/serif-display` — a fourth family the plan missed entirely, found
  when seven bindings had nowhere to go.
- `surface/placeholder` — Avatar's image fallback was an off-scale `#dbe0e5`.
- All 1,753 Lucide icons bound to `icon/default`; they had never been bound to
  anything and rendered black on every coloured surface.

### Accessibility is recorded, not enforced

Contrast was measured across 20 key pairings. Most pass AA in both modes. Four do
not, and they are documented in
[token-architecture-v2.md](token-architecture-v2.md) §6a rather than changed —
the values are a design decision. The one with no passing option is
`surface/warning` in dark: neither `text/on-color` (2.64) nor `text/default`
(2.48) reaches AA.

---

## 2026-07-29 — Three tiers: Primitives → Semantics → Interface

**Supersedes the 2026-07-28 Rule 06 entry below.** That decision removed colour
from the Component tier. This one removes the Component tier.

**Decision.** Four collections:

| Collection | Answers                                          | Modes                   |
| ---------- | ------------------------------------------------ | ----------------------- |
| Primitives | What is the raw value?                           | 1                       |
| Semantics  | What is _this brand's_ red?                      | one per brand           |
| Interface  | What does an error border look like _right now_? | Light, Dark             |
| Breakpoint | How big at this screen size?                     | Desktop, Tablet, Mobile |

Components bind **Interface** and **Breakpoint**. Nothing else.

**Why two layers instead of one.** The old Semantic tier tried to carry brand
_and_ theme at once. Splitting them means a new brand supplies 114 values and gets
light and dark free; collapsed, it would have to re-specify both themes for every
role. Full plan in [token-architecture-v2.md](token-architecture-v2.md).

**Why this scales where v1 did not.** v1's variable count grew with the component
count — ~22 per component, ~2,200 at 100 components. v2's does not grow at all:
**~392 variables at 24 components and at 1,000.** A new brand adds a _mode_, not
tokens. A new theme adds a _mode_, not tokens.

**The Component collection is deleted**, replaced by a promotion rule with a
countable threshold rather than a judgement call:

> Default: components bind Interface directly. A component MAY own colour tokens
> only if it has **≥3 colour-bearing variants** AND **≥3 states that change
> colour**. Cap 12. Geometry never qualifies.
>
> Promotion is **opt-in and one-way**. Crossing the threshold never forces a
> migration, and a component that has tokens never loses them. So the check is
> one-directional: _"do you have colour tokens you haven't earned?"_ — never
> _"why don't you have tokens yet?"_

Of the current 24 components, only Button qualifies. **17 of the 24 already work
this way** — Checkbox, Input, Select, Radio, Toggle, Menu and the rest own zero
component tokens today. This is not a migration so much as bringing four
components into line with the other seventeen.

**Why "complexity" became two counts.** The previous rule said a component token
exists "when the component needs to differ" — a judgement made at the moment of
writing, which is exactly when judgement is worst. Every deviation traced back to
that clause. Two integers can be checked by a script; "needs to differ" cannot.

**Primitives gain five values**, each forced by something v1 could not express:

- `radius/10, 14, 20, 32` — concentric nesting is `inner = outer − padding`, and
  the ramp jumped 8 → 12 → 16 → 24, so the arithmetic broke above 8.
- `gray/950` — light mode gets four layers from white + 50 + 100; dark topped out
  at 900 and could not separate page from card from popover.

**Two audit defects are fixed by construction, not by hand.** `fg/on-brand` /
`fg/on-neutral/emphasis` / `fg/on-danger` collapse into one `text/on-color`, so
the destructive button cannot point at the wrong one. And the uncalibrated ramp
disappears because the _slot_ now fixes the step — `-subtle` is always 200, plain
is always 500, `-strong` is always 700, for every role.

**A chart palette was added before it was needed.** `chart/1…8` in Semantics.
Charts are certain at 1,000 components and the alternative is someone picking hex
at that point. It also gives `orange` and `pink` a job.

---

## 2026-07-28 — Colour left the Component tier (Rule 06)

> **Superseded by the 2026-07-29 entry above.** Kept because the measurement is
> what justified going further, and because the reasoning still explains why
> forwarding tokens are a trap.

**Decision.** A Component-tier token may hold geometry only. No colour, no
exceptions, no exceptions file.

**Why it is not arbitrary.** Two rules already in the spec force it:

1. A component colour token must alias a semantic token — "never skip a tier for
   colour". So it cannot introduce a new value.
2. Rule 07 forbids a token that only forwards another token.

A component colour token can therefore only ever be a 1:1 forward, which Rule 07
forbids. There is no legal shape for one.

**What it was costing.** Measured across the four built components:

|           | Component tokens | Of those, pure colour forwards |
| --------- | ---------------- | ------------------------------ |
| button    | 31               | 30                             |
| tabs      | 27               | 13                             |
| badge     | 22               | 18                             |
| table     | 9                | 9                              |
| **total** | **89**           | **70 (79%)**                   |

At 22 tokens per component, 100 components is ~2,200 variables. Figma's variables
UI becomes painful well before that, and the practical ceiling for a person to
manage is around 1,000. Geometry-only projects to ~475.

**The second reason, which matters more than the count.** Every Figma↔code desync
found in the audit was the same shape: a component token on one side, a direct
semantic binding on the other. `badge/neutral/border` existed while Figma bound
`border/neutral/default` straight past it. `tabs/underline/item/radius/focus`
shipped in CSS while Figma stayed on `radius/8`. Removing the indirection removes
the failure mode, not just the tokens.

**Why geometry is exempt, and why that is not inconsistent.** A geometry token can
hold a value nothing else offers — Tabs' 20px icon where `control/md/icon/size`
says 24. It earns its place by _diverging_. Colour never diverges, because its
value is always some semantic token's value.

**The clause that was deleted.** Rule 07 used to end "_…or when a state ramp makes
the intent unclear at the call site_". That clause admitted all 70 forwards.
Reading `--button-primary-brand-bg-hover` is marginally nicer than reading
`--bg-brand-default-hover`, and that small nicety cost 79% of the tier.

**Migration.** Nothing was rebound. The 70 existing tokens are grandfathered in
`packages/tokens/tier-baseline.json`, which only ever shrinks — new violations
fail, and an entry that stops violating also fails, so the list cannot rot.

---

## 2026-07-28 — Figma bindings became checkable

**Problem.** Every check read `getLocalVariablesAsync` — _what variables exist_.
Nothing read _what the components actually bind_, and the gap hid two things:

**Ghosts.** Deleting a variable in Figma does not unbind it. Every node keeps
resolving it, the component keeps rendering correctly, and the export reconciles
perfectly. The Button carries 100+ bindings to four deleted `font-size` and
`font-weight` variables in exactly this state, with every check green. The Labels
_also_ carry text styles, so two sources of truth compete on `fontSize`; they
agree today (14/16px), which is why nobody noticed.

**Unbound tokens.** A token exists, ships in CSS, and the Figma component reaches
past it. Code and Figma then agree only by coincidence.

**Decision.** `figma/export-bindings.js` → `src/figma/bindings.json` →
`scripts/verify-bindings.mjs`. Deletion is now defined as two operations in order:
**unbind every node, then delete the variable.**

Ghost identity is not stable between reads — two exports of the same page returned
different ghost lists — so the check fails on the _presence_ of a non-local
binding, never on a name. A ghost is never grandfathered.

---

## 2026-07-28 — Audit findings

Found during the Button/Tabs/Badge audit. **Both are resolved by the v2
architecture** — see the note at the end of this entry.

**Wrong-intent aliases.** `button/destructive/fg` aliases `fg/on-brand` while
`fg/on-danger` exists and is used by nothing. `badge/brand/fg` aliases
`fg/link/default` because no `fg/brand/*` exists — which inverts link's own
guarantee that it holds a separate token _so that_ re-branding does not restyle
links.

**The Role scale is not calibrated across intents.** `border/brand/default` is a
saturated blue-500; `border/success/default` is a green-200 tint. The word
`default` therefore means a different prominence depending on the intent, which is
why Badge had to reach for `border/brand/tint` to match the weight the other five
intents get from `default`. Badge's _values_ are right; its _names_ look random
because the ramp underneath them is uncalibrated. This accounts for most of the
"random assignment" impression and needs a decision in Figma before it can be made
mechanical.

**Both are fixed by the v2 architecture** (2026-07-29 entry) rather than by a
gate: the three `on-*` tokens collapse to one, and the accent slot fixes the ramp
step for every role. Neither needed a checker in the end — they needed a shape
that made the mistake impossible.

---

## 2026-07-27 — Sizes may occupy the Variant slot

Earlier guidance said sizes were never variants and should come from Primitives
directly in code. That produced a Button whose every size was wrong against Figma,
with no token to check it against. A size-varying value a component must honour is
a token like any other, so `small` / `medium` / `large` may hold the Variant slot
**for geometry**. They never produce colour tokens.

Known wart: the control scale uses `sm` / `md` / `lg` while the Variant slot uses
`small` / `medium` / `large`, and the two sit on adjacent lines in `tabs.css`. Both
spellings are currently sanctioned. Worth an amendment; not yet made.

---

## 2026-07-27 — The control scale

Button and Tabs were each given a `padding-x` token for the identical
`spacing/16`. Nothing forced them to agree, and they quietly stopped agreeing on
icon size.

The flowchart in section 8 was already correct — the failure was judgement at the
moment of writing. So the rule stopped being advice:
`scripts/verify-shared-values.mjs` fails the build when two components alias the
same primitive for the same property, and also flags exceptions that no longer
diverge. Rules that are only written get broken.

---

## Standing rationale

Short answers to "why is it like this", for rules that have not changed.

**Why slots are positional.** Nothing in a name says "this part is the state" —
you know it is the state because it is last. That is why order can never change
and why words cannot be borrowed between slots.

**Why geometry now has a Semantics layer too.** _(Changed in v2 — it previously
went straight to Primitives.)_ Radius, border-width and the control scale sit in
Semantics because they are brand identity: a brand can be sharp or round, dense or
airy. They do not need light/dark, so they are not in Interface. Spacing is the
exception and stays primitive — a 16px gap means 16px in every brand.

**Why `default` is a written role but never a written state.** At the Semantics
tier a ramp step is always named (`primary/500`). At the Interface tier the role
is always named (`surface/default`) but the resting state is omitted —
`surface/primary`, not `surface/primary/default`. Role is required, state is
optional.

**Why the three border words became two.** `emphasized`, `strong` and `bold` read
as synonyms in isolation and were three names for what turned out to be two useful
weights. v2 keeps `border/strong` and `border/stronger` and retires the third —
three names for two values is exactly the rot the closed vocabularies exist to
prevent.

**Numbers or words for scale steps.** Numbers when the scale might gain steps
between existing ones (colour ramps, spacing, font sizes) — a 350 can always be
inserted. Words when the set is small and complete (thin/default/thick). Never
`light`/`dark` as step names; they break the instant a step is added at either
end.

**Per-rule one-liners.**

| Rule                            | Why                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| 01 One state per token          | Keeps the slot count fixed at five. Splitting states makes depth unbounded.                   |
| 02 Disabled never combines      | Prevents a combinatorial explosion of impossible states.                                      |
| 03 One segment per slot         | Nesting parts inside parts makes depth unbounded and breaks positional reading.               |
| 04 Never encode the value       | The entire point of the tier. A value-named token cannot be rebranded or themed.              |
| 05 Depth budget: five           | Depth pressure is a signal to split a component, not to add a level.                          |
| 06 Component collection deleted | See the 2026-07-29 entry above.                                                               |
| 07 No single-use tokens         | Pre-building the component tier is the single biggest cause of token bloat.                   |
| 08 Singular, always             | Mixed plurality means guessing, and guessing means duplicate tokens.                          |
| 09 `fg` covers text and icons   | Splitting by default doubles the colour surface for no benefit.                               |
| 10 Sizes get no colour tokens   | Otherwise every colour token triples for no reason.                                           |
| 11 Effects are styles           | Different Figma primitive, so different convention. Title Case signals "style, not variable". |
| 12 When unsure, Semantic        | Asymmetric cost. Guess in the direction that is cheap to undo.                                |

**The most expensive mistake.** Creating component tokens for a component you have
not built yet. You will guess the states wrong, and the wrong names will be bound
into files before anyone notices. Build the component first.

**Optional hardening.** Once the semantic layer is complete, primitives can be
scoped to `[]` — they vanish from every picker, making semantic tokens the only
bindable option. Recommended: a designer binding a fill straight to
`color/blue/500` is the drift that breaks dark mode later.

---

## Migration ledger — closed

Historical record of names that diverged from the spec. **Everything on it is
resolved.** The version of this ledger that lived in the spec was written against
297 variables and had gone stale: it listed ~40 pending renames, an undecided
`neutral` intent question, and 11 broken `codeSyntax` entries. Re-checked against
the file on 28 Jul 2026 — none of them still exist:

| Ledger claimed                                                         | Actual state                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `neutral` intent omitted throughout, ~30 renames pending               | Adopted. `bg/neutral/default` etc. are live; no bare `bg/default` remains |
| `fg/danger` missing its role slot                                      | Now `fg/danger/default`                                                   |
| `button/disabled/bg` should move to semantic                           | Gone                                                                      |
| `emphasized`, `bold`, `tint`, `body`, `secondary` are vocabulary drift | All five amended into `ROLE_ORDER`; the audit accepts them                |
| `selected-hover` needs a composition rule                              | Rule 01 now defines it, in vocabulary order                               |
| 11 `codeSyntax` defects outstanding                                    | `known-defects.json` is empty; 329/329 exact match                        |
| duplicate `font/family/serif 2`                                        | Deleted                                                                   |

A stale ledger is worse than no ledger — it sends people to fix things that are
already fixed. If this section grows again, date every row.

### Resolved renames

| Was                               | Now                               | Rule                                   |
| --------------------------------- | --------------------------------- | -------------------------------------- |
| `bg/brand-hover`                  | `bg/brand/hover`                  | State gets its own slot                |
| `bg/brand-subtle`                 | `bg/brand/subtle`                 | Role gets its own slot                 |
| `status/success/bg`               | `bg/success/subtle`               | Duplicate namespace folded into intent |
| `button/primary-neutral/bg-hover` | `button/primary-neutral/bg/hover` | State slot                             |
| `button/focus-ring`               | `button/ring`                     | `ring` is the property                 |
| `button/focus-ring-inner`         | `button/ring/inner`               | Same                                   |
| `type/h1-lh`                      | `type/h1/line-height`             | No abbreviations                       |
| `border-width/1-5`                | `border-width/thin`               | Named steps, no decimals               |
| `var(--color-white)`              | `var(--color-base-white)`         | Code syntax mirrors the path           |

### Open

Nothing. The open items are now the three in the 2026-07-28 audit entry above:
the two wrong-intent aliases and the uncalibrated Role ramp.
