# Token architecture v2 — Primitive / Semantics / Interface

**Status: SHIPPED.** Live in Figma and in code since 29 Jul 2026.
**381 variables**, four collections, checksum-matched with the repo at
`838923391` — re-exported and re-verified 3 Aug 2026.

Target: **~380 variables, fixed**, serving 1,000+ components. The one addition
since launch is `icon/placeholder`; the count tracks UI roles, not components.

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
role. Keeping them separate means a new brand supplies 106 values and gets both
themes free.

---

# 1. Primitives — 141 tokens, 1 mode

**Value-keyed only.** A primitive named for a role is the layering mistake v2
corrected: `radius/full` and `font/weight/regular` were roles wearing a
primitive's clothes, and they collided with the Semantics tokens of the same
name — twelve custom properties where two tokens claimed one `--var`.

| Group                | Count | Tokens                                                        |
| -------------------- | ----- | ------------------------------------------------------------- |
| `color/<hue>/<step>` | 80    | blue, gray, green, orange, pink, purple, red, yellow × 50–900 |
| `color/base/*`       | 2     | white, black                                                  |
| `color/alpha/*`      | 7     | black-05/10/40/60, white-05/10/20                             |
| `spacing/*`          | 16    | 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128    |
| `scale/*`            | 14    | 0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, full            |
| `font/family/*`      | 4     | host-grotesk, merriweather, space-mono, stix-two-text         |
| `font/size/*`        | 14    | 12–72                                                         |
| `font/weight/*`      | 4     | 400, 500, 600, 700                                            |

`scale/*` is the dimensionless ramp that radius and border-width draw from. It
carries the numbers; Semantics gives them names. `spacing/*` stays separate
because components bind it directly (see the exception in the chain rules) and
merging the two would have meant rebinding 845 nodes for no gain.

**Nothing outside Semantics and Breakpoint may bind a primitive**, with the two
exceptions noted under §5.

# 2. Semantics — 106 tokens, mode: IonBase (one per brand)

Where a brand becomes itself. Every token aliases a primitive.

| Group               | Count | Aliases                                                                |
| ------------------- | ----- | ---------------------------------------------------------------------- |
| Colour ramps        | 60    | `primary` `neutral` `success` `warning` `error` `information` × 50–900 |
| `chart/1…8`         | 8     | Categorical series colours                                             |
| `base/*`, `alpha/*` | 9     | white, black, and the seven alphas                                     |
| `radius/*`          | 13    | `none 2xs xs sm md lg xl 2xl 3xl 4xl 5xl 6xl full` → `scale/*`         |
| `border-width/*`    | 3     | `default` 1 · `thick` 2 · `thicker` 4                                  |
| `font/family/*`     | 4     | sans, serif, mono, serif-display → the raw font identities             |
| `font/weight/*`     | 4     | regular, medium, semibold, bold → 400/500/600/700                      |
| `icon-size/*`       | 5     | `xs 12 · sm 16 · md 20 · lg 24 · xl 32`                                |

## Colour ramps

Six meanings, ten steps each. A second brand adds a mode and re-points these 60;
nothing downstream changes. **Orange and pink carry no intent** — they earn their
place in the chart palette, and if one ever needs to mean something in the UI it
becomes a seventh ramp and leaves the chart set.

## Radius — every step, because concentric nesting needs the arithmetic

`inner = outer − padding`, so a 16 outer with 4 padding needs a 12 inner and a 20
outer with 6 needs 14. Curating the scale breaks that and designers compensate
with off-scale values. `radius/lg` = 10, `2xl` = 14, `4xl` = 20 and `6xl` = 32
exist for exactly this.

## Border width — 1 / 2 / 4

Was `thin` 1 · `default` 1.5 · `thick` 2. The 1.5 step was bound by nothing, and
a fractional default is a strange thing to have. Now `default` 1, `thick` 2,
`thicker` 4 — progressive and whole.

`control/border-width` used to sit alongside these at the same value; it was
merged into `border-width/default` (302 nodes rebound) so one weight has one
name.

## One icon scale

`icon-size/xs…xl` — 12/16/20/24/32 — for every icon, inside a control or not.

There were briefly two. `control/<step>/icon-size` held 16/20/24, aliasing the
same spacing primitives as `icon-size/sm|md|lg` — the same three values under a
second set of names. It went with the rest of the control group.

## Why there is no control group

`control/<size>/{size, padding-x, gap, icon-size}` existed and was deleted. The
reasoning is worth keeping, because it is the shape of mistake most likely to
recur as the component count grows.

**Twelve names, zero new values.** Every one was an alias of a spacing
primitive. Three duplicated the `icon-size` ladder outright.

**Bound by 3 of 26 components.** The numbers were reverse-engineered from
Button, so Button fitted perfectly and almost nothing else did. `control/md/
padding-x` is 16; Input and Select are 12; Menu Item is 12; Nav Item is 8. Each
bypassed the group and bound `spacing/*` directly, as 23 components already had.

**The lever it promised did not exist.** It was justified as one place to
re-scale controls per brand. Changing `control/md/padding-x` moved Button and
Tabs and left everything else — a break, not a re-scale.

The distinction that matters: **Semantics holds ladders, not recipes.** A ladder
is indexed by value — `radius/xs…6xl`, `icon-size/xs…xl`, `border-width/*`, the
colour ramps — and a component picks a rung. A recipe is indexed by usage
(_"a medium control shall have this padding"_) and needs a new entry for every
usage pattern, which is precisely what stops it scaling to 1,000 components.

So component geometry is a component fact. Button is 40 tall with 16 padding;
Input is 40 tall with 12. Both are recorded in the component, and both pick from
`spacing/*`. The scale is the shared contract; the rung is not.

What guards it instead — because the group never did — is
[`scripts/verify-geometry.mjs`](../packages/tokens/scripts/verify-geometry.mjs),
which asserts every geometry binding sits on `spacing/*` or a Semantics ladder,
and [`figma/audit-geometry.js`](../packages/tokens/figma/audit-geometry.js),
which reports raw numbers in Figma that no export can see. Between them they
catch what the group was supposed to prevent, at any component count, with no
tokens at all.

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

Live aliases, as in the file today.

| Token                    | Light            | Dark             | Layer                      |
| ------------------------ | ---------------- | ---------------- | -------------------------- |
| `surface/page`           | `neutral/50`     | `neutral/900`    | 0 — app background         |
| `surface/sunken`         | `neutral/100`    | `neutral/900`    | −1 — wells, insets         |
| `surface/default`        | `base/white`     | `base/black`     | 1 — cards, panels          |
| `surface/subtle`         | `neutral/200`    | `neutral/800`    | 1 — quieter card           |
| `surface/muted`          | `neutral/100`    | `neutral/800`    | 1 — table headers, chips   |
| `surface/raised`         | `base/white`     | `neutral/800`    | 2 — popovers, menus        |
| `surface/overlay`        | `base/white`     | `base/black`     | 3 — modals, sheets         |
| `surface/scrim`          | `alpha/black-40` | `alpha/black-60` | over everything            |
| `surface/inverse`        | `neutral/900`    | `base/white`     | tooltips, Primary Neutral  |
| `surface/inverse-subtle` | `neutral/700`    | `neutral/200`    |                            |
| `surface/disabled`       | `neutral/100`    | `neutral/800`    |                            |
| `surface/placeholder`    | `neutral/300`    | `neutral/600`    | Avatar fallback, skeletons |

**Dark is OLED-style, and that is deliberate.** Cards (`#000000`) sit _darker_
than the page (`#131923`), and `overlay` is pure black too — the reverse of the
usual "cards float above the page" ladder. In light, `subtle` (`neutral/200`) is
also darker than `muted` (`neutral/100`). Both were set by hand during the
accessibility pass; the file wins over any earlier proposal.

**The `gray/850` story, recorded because it reversed twice.** The plan first
called for `gray/950`. Wrong — measured from the file, `gray/900` was already
near-black, so a step below it is invisible. The real gap was in the middle:
800 → 900, nothing between. So `gray/850` was added instead, giving four dark
layers. It was then **removed** during the accessibility pass and the ladder
re-tuned by hand. Both ramps are a clean 50–900 today.

The one casualty: `surface/sunken` [Dark] was left pointing at the deleted
`neutral/850` and dangled until it was repointed to `neutral/900`. **Deleting a
variable orphans aliases exactly as it orphans node bindings** — `verify-tier.mjs`
now catches that class.

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

# 6. Totals — shipped

| Collection | Tokens  | Modes                     | Grows when                                |
| ---------- | ------- | ------------------------- | ----------------------------------------- |
| Primitives | 141     | Value                     | A ramp gains a step                       |
| Semantics  | 106     | IonBase                   | Never — a brand adds a _mode_, not tokens |
| Interface  | 104     | Light, Dark               | A genuinely new UI role appears           |
| Breakpoint | 30      | Desktop / Tablet / Mobile | Never                                     |
| Component  | 0       | —                         | Deleted; promotion only (§5)              |
| **Total**  | **381** |                           |                                           |

**381 variables at 34 components. 381 at 1,000.** A new brand adds a mode. A new
theme adds a mode. Neither adds tokens.

The old `Semantic` (71) and `Component` (89) collections were deleted after every
binding was moved. Bindings across every component node resolve
Interface → Semantics → Primitives, with zero ghosts.

**Sync state:** names `838923391`, 381 variables, verified 3 Aug 2026. Computed
independently on each side and compared — see `scripts/verify-export.mjs`.

---

# 6b. Text styles are bound to Semantics, and nothing else checks it

The tier chain in §1–4 is enforced by `tokens:tier`, which walks the **variable**
graph. Figma text styles are not variables, so they sit entirely outside it —
and they carry two of the same bindings, `fontFamily` and `fontStyle`.

A text style may bind either tier:

| Bound to                                   | Renders  | Follows a brand mode |
| ------------------------------------------ | -------- | -------------------- |
| `font/family/sans` (Semantics)             | the same | **yes**              |
| `font/family/host-grotesk` (the Primitive) | the same | **no**               |

Because both render identically, a primitive-bound ramp is invisible until a
second brand exists — at which point every heading and every body size quietly
stops re-branding, all at once, with no error anywhere.

**Rule: a text style binds `font/family/{sans,serif,serif-display,mono}` and
`font/weight/{regular,medium,semibold,bold}`. Never a Primitive.**

On 3 Aug 2026, 38 of the 21 styles' family/weight fields were found bound
straight to Primitives and were rebound. `build-typography.mjs` now warns on any
that return, naming each field. It warns rather than fails because the fix is a
Figma edit and the CSS emitted in the meantime is still correct — but a warning
that is ignored is the same as no gate, so treat it as a build break.

The same reasoning applies to any future Figma construct that carries variable
bindings without being a variable. `tokens:tier` will not see it; it needs its
own check.

---

# 6a. Accessibility — measured, recorded, not silently changed

Re-measured 29 Jul 2026 after the `text/on-color` fix.

`text/on-color` is **white in light, black in dark**. That was a correction, not
a preference: `surface/inverse` flips between modes while `text/on-color` did
not, so Primary Neutral rendered white-on-white in dark — invisible. Contrast
there went 1.0 → 21.0.

It changes every solid accent, so all six were measured:

| Solid surface         | Light         | Dark          |
| --------------------- | ------------- | ------------- |
| `surface/primary`     | 5.38 AA       | 4.58 AA       |
| `surface/error`       | 4.80 AA       | 5.55 AA       |
| `surface/success`     | 3.69 AA-large | 6.25 AA       |
| `surface/warning`     | 3.83 AA-large | 7.95 AA       |
| `surface/information` | 7.47 AA       | 3.44 AA-large |
| `surface/inverse`     | 17.63 AA      | 21.00 AA      |

Passing comfortably in both modes: `text/default`, `text/secondary`
(10.15 / 15.86), `text/tertiary`, every accent `text/*` on `surface/default`, and
all three neutral `icon/*` steps.

**Still open:** light `surface/warning` at 3.83 and light `surface/success` at
3.69 are AA-large, not AA. Dark `surface/information` is 3.44. If any of the
three ever carries body text rather than a short label, that has to be resolved
first. `text/placeholder` on `surface/default` is 2.54 in light.

**The dark warning pairing that had no passing option is fixed** — it was 2.64
with white and 2.48 with `text/default`; it is now 7.95.

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

# 8. What shipped

| #   | Step                                      | Result                                        |
| --- | ----------------------------------------- | --------------------------------------------- |
| 1   | Primitives — add the scale steps          | done                                          |
| 2   | Semantics collection                      | 106                                           |
| 3   | Interface collection, Light + Dark        | 103                                           |
| 4   | Bind 1,753 Lucide icons to `icon/default` | 1,757 fills                                   |
| 5   | Rebind every component to Interface       | all 19 pages                                  |
| 6   | Unbind, then delete Component             | 89 removed                                    |
| 7   | Delete old Semantic                       | 71 removed                                    |
| 8   | Re-export, rebuild, rewrite the gates     | done                                          |
| 9   | Repoint the CSS layer                     | 133/133 resolve                               |
| 10  | Align the Badge API                       | brand/danger/info → primary/error/information |

## React coverage

| Shipped                                                                                            | Not yet                                             |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Button · Tabs · Badge · Input · Select · Checkbox · Radio · Toggle · Menu · Avatar · Header · Icon | Table · Nav Item · Divider · Scroll Progress · Logo |

## Open items

- **Contrast**, per §6a — three AA-large pairings and `text/placeholder`.
- **Off-ladder geometry is derived, never a raw ramp step.** No component reads
  `scale/*`. Four values sit off every ladder and are stated as arithmetic on
  rungs that do exist:

  | Value                              | Off-ladder because               | Derived as       |
  | ---------------------------------- | -------------------------------- | ---------------- |
  | Checkbox mark 12/14/16             | both ladders skip 14             | `box / 2 + 4`    |
  | Radio dot 6/8/10                   | spacing jumps 8 → 12             | `box / 2 − 2`    |
  | Toggle track 36/44/52 × 20/24/28   | spacing skips all four           | `thumb`, `inset` |
  | Header desktop height 56           | spacing jumps 48 → 64            | `64 − 8`         |
  | Avatar Group overlap −6/−8/−10/−12 | negative space cannot be a token | `size / 4`       |

  Each is pinned by a test against Figma's measured pixels, and those tests are
  negative-tested — a wrong formula fails them.

- **`Logo` carries an unbound `itemSpacing` of 5.333** at Large — the only
  fractional geometry left in the file. Deliberately not rounded: the Large logo
  is a scaled lockup (4 × 4⁄3), so a round number would change the wordmark's
  proportions. It needs a design decision, not a sweep.
- **Button's variant names** keep `Primary Brand` and `Destructive`. Left
  deliberately: they name a hierarchy and an action, not token roles, and Figma
  agrees. `destructive` says what the button does to your data.
