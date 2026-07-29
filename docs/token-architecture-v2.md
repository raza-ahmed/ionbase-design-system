# Token architecture v2 — Primitive / Semantics / Interface

**Status: LIVE in Figma as of 29 Jul 2026.** 390 variables, four collections,
zero ghosts, zero dangling aliases. The repo has not been re-exported yet — that
is the next phase.

Target: **390 variables total, fixed**, serving 1,000+ components.

This is the **inventory** — every token and its value. The **rules** for naming
them are in [variable-naming-spec.html](variable-naming-spec.html); the
**reasoning** is in [naming-decisions.md](naming-decisions.md).

## The chain

```
Primitives          raw values              1 mode
    ↓ aliased by
Semantics           brand identity          modes: IonBase, Brand B, Brand C…
    ↓ aliased by
Interface           application roles       modes: Light, Dark
    ↓ bound by
Figma components + CSS

Breakpoint          responsive geometry     modes: Desktop, Tablet, Mobile   (parallel)
```

**Two hard rules that make this work:**

1. **Interface may only alias Semantics.** Never a primitive, never a raw value.
   An Interface token that reaches past Semantics cannot be re-branded.
2. **Semantics may only alias Primitives.** Never another Semantics token.

Components bind **Interface** (and Breakpoint). They never bind Semantics or
Primitives for colour.

## Why the split is worth two layers

- **Semantics answers "what is this brand's red?"** — swap the mode, every brand
  changes. It does not know about light/dark.
- **Interface answers "what does an error border look like right now?"** — swap
  the mode, the theme changes. It does not know which hue error is.

Collapsing them means a new brand has to re-specify light _and_ dark for every
role. Keeping them separate means a new brand supplies 114 values and gets both
themes free.

---

# 1. Primitives — 143 tokens, 1 mode

**Four steps were added:** `radius/10, 14, 20, 32`, for concentric nesting
(section 2.4).

`color/gray/850` was added during the build and **removed again** — see the note
in section 3.3. Both the gray ramp and every other hue are a clean 50–900.

| Group                | Count | Tokens                                                          |
| -------------------- | ----- | --------------------------------------------------------------- |
| `color/<hue>/<step>` | 80    | blue, gray, green, orange, pink, purple, red, yellow × 50–900   |
| `color/base/*`       | 2     | white, black                                                    |
| `color/alpha/*`      | 7     | black-05/10/40/60, white-05/10/20                               |
| `spacing/*`          | 16    | 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, …            |
| `radius/*`           | 13    | 0, 2, 4, 6, 8, **10**, 12, **14**, 16, **20**, 24, **32**, full |
| `border-width/*`     | 3     | thin, default, thick                                            |
| `font/*`             | 22    | families, sizes 12–72, weights                                  |

**Rule:** nothing outside Semantics and Breakpoint may bind a primitive. Once v2
lands, scope primitives to `[]` so they vanish from every Figma picker.

---

# 2. Semantics — 114 tokens, mode: IonBase (one per brand)

This is where a brand becomes itself. Every token is an alias to a primitive.

## 2.1 Colour ramps — 60

Six meanings, ten steps each. The full ramp is exposed so Interface can pick
different steps for light and dark.

| Group                | Steps | IonBase mode aliases  |
| -------------------- | ----- | --------------------- |
| `primary/50…900`     | 10    | `color/blue/50…900`   |
| `neutral/50…900`     | 10    | `color/gray/50…900`   |
| `success/50…900`     | 10    | `color/green/50…900`  |
| `warning/50…900`     | 10    | `color/yellow/50…900` |
| `error/50…900`       | 10    | `color/red/50…900`    |
| `information/50…900` | 10    | `color/purple/50…900` |

All six ramps are exactly ten steps. A second brand adds a mode and re-points
these 60. Nothing downstream changes.

**Orange and pink carry no _intent_** — they are not a seventh and eighth
meaning. They earn their place in the chart palette below. If one ever needs to
mean something in the UI, it becomes a seventh ramp here and leaves the chart
set.

## 2.2 Data visualisation — 8

Categorical series colours. **Brand-owned**, so a second brand re-points them
with everything else.

`chart/1 … chart/8` → `blue/500, green/500, purple/500, orange/500, pink/500,
yellow/600, red/500, gray/500`

Not in use yet — added now because charts are inevitable at 1,000 components, and
the alternative is someone picking hex values at that point.

## 2.3 Static colour — 9

| Token                       | Alias               |
| --------------------------- | ------------------- |
| `base/white`, `base/black`  | `color/base/*`      |
| `alpha/black-05 … white-20` | `color/alpha/*` (7) |

## 2.4 Shape — 16

### Radius — 13

Concentric nesting needs **every step available**, not a curated six. The rule is
`inner = outer − padding`, so a 16 outer with 4 padding needs a 12 inner; a 20
outer with 6 needs 14. Curating the scale breaks that arithmetic and designers
compensate with off-scale values.

| Token         | Alias         | Typical use               |
| ------------- | ------------- | ------------------------- |
| `radius/none` | `radius/0`    | Squared edges             |
| `radius/2xs`  | `radius/2`    | Innermost nested elements |
| `radius/xs`   | `radius/4`    | Checkbox, small chips     |
| `radius/sm`   | `radius/6`    | Inputs, small buttons     |
| `radius/md`   | `radius/8`    | Buttons, badges           |
| `radius/lg`   | `radius/10`   | Inner card content        |
| `radius/xl`   | `radius/12`   | Cards                     |
| `radius/2xl`  | `radius/14`   | Nested panel              |
| `radius/3xl`  | `radius/16`   | Panels, dialogs           |
| `radius/4xl`  | `radius/20`   | Large surfaces            |
| `radius/5xl`  | `radius/24`   | Sheets, modals            |
| `radius/6xl`  | `radius/32`   | Hero containers           |
| `radius/full` | `radius/full` | Pills, avatars            |

**Primitives must gain `radius/10, 14, 20, 32`** — the current ramp jumps
8 → 12 → 16 → 24, so concentric math is impossible above 8.

### Border width — 3

`border-width/thin, default, thick` → `border-width/*`

Brand identity includes roundness and weight — a brand mode can make everything
sharp.

## 2.5 Type — 7

| Group           | Tokens                              |
| --------------- | ----------------------------------- |
| `font/family/*` | sans, serif, mono (3)               |
| `font/weight/*` | regular, medium, semibold, bold (4) |

`font/size/*` lives in Breakpoint, not here — size is responsive, family and
weight are brand.

## 2.6 Control scale — 13

Sizing for every interactive control. Brand-owned, because density is an identity
choice.

| Token                      | sm                    | md  | lg  |
| -------------------------- | --------------------- | --- | --- |
| `control/<step>/size`      | 32                    | 40  | 48  |
| `control/<step>/padding-x` | 12                    | 16  | 20  |
| `control/<step>/gap`       | 6                     | 8   | 8   |
| `control/<step>/icon-size` | 16                    | 20  | 24  |
| `control/border-width`     | thin — size-invariant |     |     |

**Total Semantics: 60 ramps + 8 chart + 9 static + 16 shape + 8 type + 13 control
= 114.** Counted from the live file, 29 Jul 2026.

Type is **8**, not 7: `font/family` carries `sans`, `serif`, `mono` **and**
`serif-display` — a fourth family the plan missed, found when seven bindings had
nowhere to go.

---

# 3. Interface — 103 tokens, modes: Light, Dark · **live**

Every token here aliases a Semantics token. Grammar:

```
<element> / <role> [ / <state> ]
```

`element` ∈ text, icon, surface, border, ring
`state` ∈ hover, pressed, selected, focus… — omitted when resting

## 3.1 `text/*` — 17

**Neutral ladder — 7.**

| Token              | Light         | Dark          | Use                      |
| ------------------ | ------------- | ------------- | ------------------------ |
| `text/default`     | `neutral/900` | `neutral/50`  | Headings, primary copy   |
| `text/secondary`   | `neutral/700` | `neutral/300` | Body, supporting copy    |
| `text/tertiary`    | `neutral/500` | `neutral/400` | Captions, metadata       |
| `text/placeholder` | `neutral/400` | `neutral/500` | Empty input text         |
| `text/disabled`    | `neutral/300` | `neutral/600` |                          |
| `text/on-color`    | `base/white`  | `base/white`  | On any solid accent fill |
| `text/inverse`     | `neutral/50`  | `neutral/900` | On `surface/inverse`     |

**Accent — 5.** `text/primary`, `text/error`, `text/success`, `text/warning`,
`text/information` → `<role>/700` light, `<role>/400` dark.

**Link — 3.** `text/link`, `text/link/hover`, `text/link/visited`.

**Interactive — 2.** `text/interactive` (`neutral/700` / `neutral/300`) and
`text/interactive/hover` (`neutral/900` / `neutral/50`) — nav items, menu items,
any text that darkens on hover. Already in the file as
`fg/neutral/secondary/hover`.

**Note:** `text/on-color` is white in both modes because it sits on a solid
accent, which is dark in both. `surface/warning` is the exception — pair it with
`text/default`.

## 3.2 `icon/*` — 13

**Every icon in the library binds one of these** — the 1,753 hardcoded black
vectors are the biggest live defect.

**Neutral ladder — 6:** `icon/default` (`neutral/700` / `neutral/300`),
`icon/secondary` (`500`/`400`), `icon/tertiary` (`400`/`500`), `icon/disabled`
(`300`/`600`), `icon/on-color` (white/white), `icon/inverse` (`50`/`900`).

**Accent — 5:** `icon/primary|error|success|warning|information` → `<role>/600`
light, `<role>/400` dark.

**Interactive — 2:** `icon/interactive` and `icon/interactive/hover` — for icon
buttons, where the icon _is_ the affordance.

## 3.3 `surface/*` — 46

Three families, each with a **fixed shape** so the next one is predictable rather
than invented.

### Structural — 12 (of 46)

| Token                    | Light            | Dark             | Layer                      |
| ------------------------ | ---------------- | ---------------- | -------------------------- |
| `surface/page`           | `neutral/50`     | `neutral/900`    | 0 — app background         |
| `surface/sunken`         | `neutral/100`    | `neutral/900`    | −1 — wells, insets         |
| `surface/default`        | `base/white`     | `neutral/850`    | 1 — cards, panels          |
| `surface/subtle`         | `neutral/50`     | `neutral/850`    | 1 — quieter card           |
| `surface/muted`          | `neutral/100`    | `neutral/800`    | 1 — table headers, chips   |
| `surface/raised`         | `base/white`     | `neutral/800`    | 2 — popovers, menus        |
| `surface/overlay`        | `base/white`     | `neutral/700`    | 3 — modals, sheets         |
| `surface/scrim`          | `alpha/black-40` | `alpha/black-60` | over everything            |
| `surface/inverse`        | `neutral/900`    | `neutral/50`     | tooltips                   |
| `surface/inverse-subtle` | `neutral/700`    | `neutral/200`    |                            |
| `surface/disabled`       | `neutral/100`    | `neutral/800`    |                            |
| `surface/placeholder`    | `neutral/300`    | `neutral/600`    | Avatar fallback, skeletons |

**The `gray/850` story, recorded because it reversed twice.** The plan first
called for `gray/950`. That was wrong — measured from the file, `gray/900` is
`#070a0d` (luminance 0.038), already near-black, so a step below it is invisible.
The real gap was in the middle: 800 (`#1d2735`, 0.149) → 900, nothing between. So
`gray/850` (`#121821`) was added instead, giving four dark layers.

It was then **removed** during the accessibility pass and the dark ladder re-tuned
by hand. Both ramps are a clean 50–900 today. The one casualty was
`surface/sunken` [Dark], left pointing at the deleted `neutral/850` — repointed to
`neutral/900` on 29 Jul 2026.

### The live ladder — measured 29 Jul 2026

The values below are what is **actually in the file** after the accessibility
pass, which is not what the table above proposes. Where they differ, the file wins
and the table records original intent.

| Token             | Light     | Dark      |
| ----------------- | --------- | --------- |
| `surface/page`    | `#f6f8f9` | `#131923` |
| `surface/sunken`  | `#f0f2f4` | `#131923` |
| `surface/default` | `#ffffff` | `#000000` |
| `surface/subtle`  | `#e5e7eb` | `#1d2735` |
| `surface/muted`   | `#f0f2f4` | `#1d2735` |
| `surface/raised`  | `#ffffff` | `#1d2735` |
| `surface/overlay` | `#ffffff` | `#000000` |

Two deliberate inversions of the documented ladder, left as-is:

- **Dark is OLED-style.** Cards (`#000000`) are _darker_ than the page
  (`#131923`), and `overlay` is pure black too. The documented ladder assumes
  cards sit above the page; this file goes the other way.
- **In light, `subtle` (`#e5e7eb`) is darker than `muted` (`#f0f2f4`)** — the
  reverse of the ordering in the table above.

### Interaction washes — 4

Alpha, not solid — they layer over whatever surface they land on, so one set
serves every component.

| Token                    | Light            | Dark             |
| ------------------------ | ---------------- | ---------------- |
| `surface/hover`          | `alpha/black-05` | `alpha/white-05` |
| `surface/pressed`        | `alpha/black-10` | `alpha/white-10` |
| `surface/selected`       | `primary/50`     | `primary/900`    |
| `surface/selected-hover` | `primary/100`    | `primary/800`    |

### Accent — 6 per role × 5 roles = 30

**Every role gets the same six.** No role is allowed a bespoke shape — that is
what let `border/brand/default` and `border/success/default` come to mean
different prominences.

| Slot                          | Light        | Dark         | Use               |
| ----------------------------- | ------------ | ------------ | ----------------- |
| `surface/<role>`              | `<role>/600` | `<role>/500` | Solid fill        |
| `surface/<role>/hover`        | `<role>/700` | `<role>/400` |                   |
| `surface/<role>/pressed`      | `<role>/800` | `<role>/300` |                   |
| `surface/<role>-subtle`       | `<role>/50`  | `<role>/900` | Banners, badges   |
| `surface/<role>-subtle/hover` | `<role>/100` | `<role>/800` |                   |
| `surface/<role>-tint`         | `<role>/100` | `<role>/800` | Second faint step |

Roles: `primary`, `error`, `success`, `warning`, `information`.

`warning` is the one exception on the solid step — yellow at 600 fails contrast
against white text, so `surface/warning` takes `warning/500` in both modes and
pairs with `text/default` rather than `text/on-color`. Recorded here so it is a
decision, not drift.

## 3.4 `border/*` — 24

**Neutral ladder — 7.**

| Token                | Light            | Dark             | Use                                         |
| -------------------- | ---------------- | ---------------- | ------------------------------------------- |
| `border/subtle`      | `neutral/100`    | `neutral/800`    | Dividers inside a card                      |
| `border/default`     | `neutral/200`    | `neutral/700`    | Cards, inputs at rest                       |
| `border/strong`      | `neutral/300`    | `neutral/600`    | Hover, emphasised outline                   |
| `border/stronger`    | `neutral/400`    | `neutral/500`    | Selected, high-contrast                     |
| `border/inverse`     | `neutral/900`    | `neutral/50`     | On inverse surfaces                         |
| `border/disabled`    | `neutral/200`    | `neutral/700`    |                                             |
| `border/transparent` | `alpha/black-05` | `alpha/white-05` | Reserves the 1px so nothing shifts on hover |

**Accent — 3 per role × 5 = 15.** Same shape every role:

| Slot                   | Light        | Dark         | Use                      |
| ---------------------- | ------------ | ------------ | ------------------------ |
| `border/<role>`        | `<role>/500` | `<role>/400` | Outline on a pale ground |
| `border/<role>-strong` | `<role>/700` | `<role>/600` | Outline on a solid fill  |
| `border/<role>-subtle` | `<role>/200` | `<role>/800` | Hairline on a tint       |

`-strong` is **required, not optional**. The file already pairs a 500 fill with a
700 outline (`bg/danger/default` `#ef4343` + `border/danger/strong` `#ba1c1c` on
Checkbox; same for brand). Without it a solid accent's border equals its fill and
disappears.

**Focus — 2:** `border/focus` (`primary/500` / `primary/400`) and
`border/focus-error` (`error/500` / `error/400`).

## 3.5 `ring/*` — 3

| Token         | Light         | Dark          |
| ------------- | ------------- | ------------- |
| `ring/focus`  | `primary/500` | `primary/400` |
| `ring/error`  | `error/500`   | `error/400`   |
| `ring/offset` | `base/white`  | `neutral/900` |

**Total Interface: 17 text + 13 icon + 46 surface + 24 border + 3 ring = 103.**
Verified against the live file, 29 Jul 2026.

Shadows stay effect styles — Figma variables cannot hold them.

---

# 4. Breakpoint — 30 tokens, modes: Desktop / Tablet / Mobile

Unchanged. Geometry and type scale only, never colour.

`type/*` (24), `grid/*` (3), `container/max-width` (1), `section/*` (2)

`grid/columns` keeps its `token-overrides.json` entry — it is a count, not a
length.

---

# 5. Component collection — deleted

Replaced by the promotion rule:

> **Default: components bind Interface directly.**
>
> A component MAY own colour tokens only if it has **≥3 colour-bearing variants**
> AND **≥3 states that change colour**. Cap: 12 tokens. Geometry never qualifies.
>
> Promotion is opt-in and one-way. Crossing the threshold never forces a
> migration.

Of the current 24 components, only **Button** qualifies. Everything else binds
Interface — and 17 of the 24 already do.

---

# 6. Totals — live, 29 Jul 2026

| Collection | Tokens  | Modes       | Grows when                                |
| ---------- | ------- | ----------- | ----------------------------------------- |
| Primitives | 143     | Value       | A ramp gains a step                       |
| Semantics  | 114     | IonBase     | Never — a brand adds a _mode_, not tokens |
| Interface  | 103     | Light, Dark | A genuinely new UI role appears           |
| Breakpoint | 30      | D / T / M   | Never                                     |
| Component  | 0       | —           | Deleted. Promotion only (section 5)       |
| **Total**  | **390** |             |                                           |

**390 variables at 24 components. 390 at 1,000.** Adding a brand adds a mode, not
tokens. Adding a theme adds a mode, not tokens.

The old `Semantic` (71) and `Component` (89) collections were deleted on
29 Jul 2026 after every binding was moved. 8,514 bindings across 2,672 component
nodes now resolve Interface → Semantics → Primitives, with zero ghosts.

---

# 6a. Accessibility — measured, not fixed

Contrast measured against the live file on 29 Jul 2026. **These are on the record
as known items, not defects to fix silently** — the values are a design decision.

**Passing comfortably (AA or better, both modes):** `text/default`,
`text/secondary` (10.15 / 15.86), `text/tertiary` (7.56 / 8.28), every accent
`text/*` on `surface/default`, and all three `icon/*` neutral steps.

| Pairing                                 | Light         | Dark          | Note                                                                                              |
| --------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `text/on-color` on `surface/warning`    | **2.64 FAIL** | **2.64 FAIL** | Light has an out: `text/default` gives 6.68 AA. **Dark has none** — `text/default` there is 2.48. |
| `text/placeholder` on `surface/default` | **2.54 FAIL** | 4.34 AA-large |                                                                                                   |
| `text/on-color` on `surface/success`    | 3.69 AA-large | 3.36 AA-large | Large text only                                                                                   |
| `text/on-color` on `surface/error`      | 4.8 AA        | 3.78 AA-large | Dark is large-text only                                                                           |

The warning pairing is the one with no passing combination in dark. If a solid
warning surface ever carries body text, that has to be resolved first.

---

# 7. Migration map — current 71 Semantic → Interface

Every current semantic token, and the v2 token that replaces it.

### Backgrounds → `surface/*`

| Current                                                          | Becomes                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `bg/neutral/default`                                             | `surface/default`                                            |
| `bg/neutral/subtle`                                              | `surface/page`                                               |
| `bg/neutral/muted`                                               | `surface/muted`                                              |
| `bg/neutral/disabled`                                            | `surface/disabled`                                           |
| `bg/neutral/inverse`                                             | `surface/inverse`                                            |
| `bg/neutral/emphasis` (+hover, +pressed)                         | `surface/inverse` — states drop; an inverse surface has none |
| `bg/scrim/default`                                               | `surface/scrim`                                              |
| `bg/scrim/subtle`                                                | `surface/hover`                                              |
| `bg/brand/default` (+hover, +pressed)                            | `surface/primary` (+`/hover`, +`/pressed`)                   |
| `bg/brand/subtle`                                                | `surface/primary-subtle`                                     |
| `bg/brand/tint`                                                  | `surface/primary-tint`                                       |
| `bg/danger/default` (+hover, +pressed)                           | `surface/error` (+states)                                    |
| `bg/danger/subtle`                                               | `surface/error-subtle`                                       |
| `bg/danger/emphasis`                                             | `surface/error`                                              |
| `bg/success/subtle`, `bg/warning/subtle`, `bg/info/subtle`       | `surface/<role>-subtle`                                      |
| `bg/success/emphasis`, `bg/warning/emphasis`, `bg/info/emphasis` | `surface/<role>`                                             |

### Foregrounds → `text/*`

| Current                                                                            | Becomes                     |
| ---------------------------------------------------------------------------------- | --------------------------- |
| `fg/neutral/default`                                                               | `text/default`              |
| `fg/neutral/body`, `fg/neutral/secondary`                                          | `text/secondary`            |
| `fg/neutral/secondary/hover`                                                       | `text/interactive/hover`    |
| `fg/neutral/subtle`, `fg/neutral/muted`                                            | `text/tertiary`             |
| `fg/neutral/disabled`                                                              | `text/disabled`             |
| `fg/on-brand`, `fg/on-neutral/emphasis`, `fg/on-danger`                            | `text/on-color` — **3 → 1** |
| `fg/link/default` (+hover)                                                         | `text/link` (+`/hover`)     |
| `fg/success/default`, `fg/warning/default`, `fg/danger/default`, `fg/info/default` | `text/<role>`               |

### Borders → `border/*`

| Current                                                                     | Becomes                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `border/neutral/muted`                                                      | `border/subtle`                                         |
| `border/neutral/default`                                                    | `border/default`                                        |
| `border/neutral/emphasized`, `border/neutral/strong`, `border/neutral/bold` | `border/strong` — **3 → 1**                             |
| `border/neutral/emphasis`                                                   | `border/inverse`                                        |
| `border/neutral/disabled`                                                   | `border/disabled`                                       |
| `border/brand/default`                                                      | `border/primary`                                        |
| `border/brand/strong`                                                       | `border/primary-strong`                                 |
| `border/brand/tint`                                                         | `border/primary-subtle`                                 |
| `border/brand/default/focus`                                                | `border/focus`                                          |
| `border/danger/default`                                                     | `border/error-subtle` — the current value is a 200 tint |
| `border/danger/strong`                                                      | `border/error-strong`                                   |
| `border/success/default`, `border/warning/default`, `border/info/default`   | `border/<role>-subtle` — all three are 200 tints today  |

### Unchanged

`control/*` moves to Semantics as-is (renaming `icon/size` → `icon-size`).

**Defects this closes by construction:**

- `fg/on-brand` / `fg/on-neutral/emphasis` / `fg/on-danger` collapse into one
  `text/on-color`, so `button/destructive/fg` cannot point at the wrong one.
- `badge/brand/fg` becomes `text/primary`, not the link colour.
- The uncalibrated ramp disappears. Today `border/brand/default` is a saturated
  blue-500 while `border/success/default` is a green-200 tint — the same word
  meaning two prominences. In v2 the _slot_ fixes the step: `-subtle` is always
  200, plain is always 500, `-strong` is always 700, for every role.
- `emphasized` / `strong` / `bold` collapse to `border/strong`, retiring three
  synonyms for two values.

---

# 8. Build order — complete

| #   | Step                                        | Status                    |
| --- | ------------------------------------------- | ------------------------- |
| 1   | Primitives — add `radius/10, 14, 20, 32`    | done                      |
| 2   | Semantics collection, aliasing Primitives   | done — 114                |
| 3   | Interface collection, Light + Dark          | done — 103                |
| 4   | Bind 1,753 Lucide icons to `icon/default`   | done — 1,757 fills        |
| 5   | Rebind every component to Interface         | done — all 19 pages       |
| 6   | Unbind, then delete Component collection    | done — 89 removed         |
| 7   | Delete old Semantic collection              | done — 71 removed         |
| 8   | Re-export, regenerate CSS, update the gates | **next — the code phase** |

## What step 8 involves

The repo still holds the **v1** export. `src/figma/semantic.json` and
`src/figma/component.json` describe collections that no longer exist, and
`primitives.json` predates the four radius steps. Nothing in the repo has been
regenerated.

Do not hand-edit those files — re-export them. `src/figma/breakpoint.json` is the
one export still accurate, because the Breakpoint collection was never touched.

The gates need rewriting too: `verify-tier.mjs`, `verify-bindings.mjs` and
`audit-names.mjs` all look up collections by the literal names `'Semantic'` and
`'Component'`, and will throw once the new export lands.
