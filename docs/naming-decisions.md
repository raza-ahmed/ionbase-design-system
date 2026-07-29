# Naming decisions — why the rules are what they are

The spec ([variable-naming-spec.html](variable-naming-spec.html)) says **what** the
rules are. It is built to be looked up, so it carries no justification. This file
carries the justification. Read it once; you should rarely need it again.

Newest first.

---

## 2026-07-30 (later still) — nothing reads the raw ramp, and `icon-size` means one thing

### Two off-ladder sizes turned out to be derivable

`--scale-14` and `--scale-10` were the only places a component reached past a
ladder into the raw `scale/*` ramp. Both follow from the box they sit in:

    Checkbox mark = box / 2 + 4      16->12   20->14   24->16
    Radio dot     = box / 2 - 2      16->6    20->8    24->10

So the ramp is now referenced by nothing, and the components state one number
per size instead of two. Both are pinned by tests against Figma's pixels, and
both tests were negative-tested — breaking the formula to `+ 2` fails with
`expected 10 to be 12`, which is the only way to know an assertion is real.

That is the fourth time this pattern has paid: the toggle track, the avatar
overlap, the pill radii, and now these. **An off-ladder value is a question
about what it is derived from.** Reach for arithmetic on real rungs before
either rounding it or minting a token.

### `icon-size/md` and `size="md"` finally agree

`@ionbase/icons` exposed `sm`=16 and `md`=**24**. That made `md` name
`icon-size/lg`, so the word meant different things in code and in Figma — the
exact ambiguity a ladder exists to remove. The prop now mirrors the ladder
one-to-one: `xs` 12, `sm` 16, `md` 20, `lg` 24, `xl` 32.

Breaking, and unavoidable — a rename is the only fix for a name that is wrong.
Callers wanting the old `md` ask for `lg`. Nothing internal broke, because
Button and Tabs size icons in CSS from `--icon-size-*` and never through the
prop. The Icon stories were passing `size` inside Buttons where the CSS
overrides it, so those props are gone too: a prop that looks like it matters and
does nothing is worse than no prop.

Note there was never really a choice of ladder. `control/<step>/icon-size` was
the other candidate and it had already been deleted, since its three values
duplicated `icon-size/sm|md|lg` exactly.

### Three stories were painting with deleted tokens

`--fg-neutral-muted`, `--fg-danger-default`, `--border-neutral-muted` and five
others are v1 names that no longer exist. The stories using them had been
rendering with inherited colour since the migration and looked plausible enough
that nobody noticed. Twelve references repointed at `text/*`, `icon/*` and
`border/*`.

Worth noting what did **not** catch this: `tokens:gate` validates the token
graph and the Figma bindings, not CSS custom properties referenced from JSX. A
dead `var()` fails silently by design — that is what fallbacks are for.

### Avatar Group's corners matched the Avatar at only two of four sizes

The reported disagreement was Medium. Checking all four found Mini wrong too:

    Mini    group radius/sm   standalone radius/xs
    Small   group radius/sm   standalone radius/sm   ok
    Medium  group radius/sm   standalone radius/md
    Large   group radius/md   standalone radius/md   ok

All twenty child instances now bind the standalone ladder. The lesson is small
and keeps recurring: when one instance of a discrepancy is reported, enumerate
the axis rather than fixing the reported case.

---

## 2026-07-30 (latest) — the off-ladder radii were pills all along

Six components implemented in React (Checkbox, Radio, Toggle, Menu, Avatar,
Header) and the geometry they exposed fixed in Figma first.

### 18 / 22 / 26 was never arbitrary

The audit reported Tabs at radius 18/22/26, Radio at 10/12/14 and Toggle at
12/14/16 — all on no ladder, all looking like someone had typed a number. Each
is exactly **half the height** of its box:

    Radio focus ring   10 on 20x20   12 on 24x24   14 on 28x28   -> circle
    Toggle focus ring  12 on h=24    14 on h=28    16 on h=32    -> pill
    Tabs focus ring    18 on h=36    22 on h=44    26 on h=52    -> pill

They are pills and circles written the long way. `radius/full` says the same
thing and renders identically, so binding them costs nothing and removes nine
off-ladder values. Rounding them to the nearest rung — the obvious reading of
"fix the random numbers" — would have squared off three focus rings.

The lesson generalises: **an off-ladder value is a question, not a defect.**
Ask what it is half of, or twice, before rounding it.

### Only one real change

`gap: 10` on the Large size of Checkbox, Radio and Toggle is genuinely off the
scale with no derivation behind it. Small and Medium are 8; Large clearly wanted
more, so it went to 12 rather than collapsing onto 8. That is a 2px design
change, and the only one in the batch.

### Two things derived rather than measured

Toggle's track is 36x20 / 44x24 / 52x28 — four numbers on no ladder. But the
track is exactly the thumb plus its inset:

    height = thumb + 2 x inset      width = 2 x thumb + 2 x inset

So the CSS states only the thumb (16/20/24, all on the scale) and the inset
(spacing/2). Avatar Group's overlap is the same shape of answer: -6/-8/-10/-12
is a quarter of the avatar size, and negative space cannot be a spacing token
because the scale has no negative rungs. Deriving beats inventing four literals
or four tokens.

### A specificity bug the linter caught

`.ion-checkbox--disabled .ion-checkbox__indicator` is (0,2,0);
`.ion-checkbox__input:checked + .ion-checkbox__indicator` is (0,3,0). A disabled
checked box would have kept its full colour **regardless of rule order**.
Stylelint's `no-descending-specificity` flagged it as an ordering complaint; the
real fix was to drive disabled off the input's own `:disabled`, which makes
`:checked:disabled` (0,4,0) and lets it win. Pinned by a test.

### Stacking order is Figma's, and it is the less common one

Avatar Group paints each avatar OVER the previous, so the `+N` overflow ends up
on top. The first implementation reversed the row to put the first avatar on
top — the commoner convention in other systems, and wrong here. No assertion
caught it; comparing a screenshot against the Figma render did.

---

## 2026-07-30 (later) — stroke weights are whole numbers, and bound

Every stroke in the file now resolves to `border-width/default` (1),
`border-width/thick` (2) or `border-width/thicker` (4). 414 stroke nodes; zero
decimals, zero unbound.

### The decimals

Checkbox, Radio and Table Row drew their `Indicator` at **1.5px**, which is on
no ladder — `border-width` runs 1 / 2 / 4.

It rounds **down to 1, not up to 2**, and that direction is forced rather than
chosen: the `Focus Ring` beside it is already 2. Rounding up would have made the
resting border exactly as heavy as the focus ring and erased the distinction
between a control at rest and a control with keyboard focus.

### Why 1.5 was there at all

Nothing was bound. Not one stroke weight in the file referenced a token — the
numbers were typed in, so nothing held any two components together and nothing
could report a value off the ladder. That is the same root cause as Input and
Select disagreeing about the Invalid border, 1px against 2px, a week earlier.

So the fix is not "change 1.5 to 1". It is binding all 414, which is what stops
the next 1.5 being typed in. Rounding alone would have left the mechanism
intact.

### Reach

Checkbox 108 · Radio 36 · Avatar 63 · Tabs 30 · Toggle 27 · Table 29 ·
Scroll Progress 22 · Badge 6 · Menu 2.

Table's `Indicator` had already corrected itself by the time it was reached —
it is an instance of Checkbox, so it inherited the fix.

No code changed: Checkbox, Radio, Toggle and Avatar have no React
implementation yet, so this is entirely a Figma correction landing ahead of
them.

---

## 2026-07-30 — the control group is deleted

380 variables; names `3840062063`. Semantics drops 118 -> 106.

`control/<size>/{size, padding-x, gap, icon-size}` is gone. It was the last
group in Semantics that described a component rather than a value.

### What it actually was

Twelve names over **zero new values**. Every one aliased a spacing primitive:

    control/sm/size       -> spacing/32       control/sm/gap  -> spacing/6
    control/md/padding-x  -> spacing/16       control/md/gap  -> spacing/8
    control/lg/icon-size  -> spacing/24       control/lg/gap  -> spacing/8

Three of them — `control/<size>/icon-size` — were exact duplicates of
`icon-size/sm|md|lg`, the same three values under a second set of names. Two
more, `control/md/gap` and `control/lg/gap`, were the same token twice.

### Why nobody used it

**3 of 26 components bound it.** The values had been reverse-engineered from
Button, so Button fitted perfectly and almost nothing else did:

    Button      padding-x  12 / 16 / 20     <- what the group encodes
    Input       padding-x  12 / 12 / 16
    Select      padding-x  12 / 12 / 16
    Menu Item   padding-x  12
    Nav Item    padding-x  8
    Table Cell  padding-x  16

Every component whose numbers differed had to bypass the group and bind
`spacing/*` directly. Twenty-three did. When most components route around an
abstraction, the abstraction is wrong — not the components.

### The lever it promised did not exist

It was justified as _one place to re-scale controls per brand_. It never was.
Changing `control/md/padding-x` would have moved Button and Tabs and left Input,
Select, Menu Item, Nav Item and Table Cell exactly where they were. That is a
break, not a re-scale. The lever had been an illusion since the second component
was built.

### The rule that replaces it

**Semantics holds ladders, not recipes.**

A _ladder_ is indexed by value — `radius/xs…6xl`, `icon-size/xs…xl`,
`border-width/default|thick|thicker`, the colour ramps. A component picks a
rung. Ladders are flat in component count, because a new component picks from
what exists.

A _recipe_ is indexed by usage — "a medium control shall have 16px padding". It
needs a new entry for every usage pattern that does not fit, which is exactly
the growth curve v2 was built to avoid. `control/*` was the only recipe left,
and it was already failing at 26 components.

So component geometry is a **component fact**. Button is 40 tall with 16
padding; Input is 40 tall with 12. Both are recorded in the component, and both
pick from `spacing/*`. The scale is the shared contract; the rung is not. This
is what Carbon, Polaris, Radix and Tailwind all do.

### What guards it now

The group never provided a guarantee, so deleting it removed none. What was
actually missing was enforcement, and there are now two gates:

- [`scripts/verify-geometry.mjs`](../packages/tokens/scripts/verify-geometry.mjs)
  — every geometry binding sits on `spacing/*` or a Semantics ladder.
- [`figma/audit-geometry.js`](../packages/tokens/figma/audit-geometry.js)
  — raw numbers in Figma, which no export can see, because a hard-coded value is
  the _absence_ of a binding and leaves no trace in `bindings.json`.

Both are negative-tested. They catch the two defects that shipped while
`control/*` existed and watched: a literal 10px padding on Input Small, off a
scale that runs 8/12/16/20, and every stroke weight in Input and Select unbound,
which let Invalid drift to 1px on one and 2px on the other.

### Migration

730 bindings rebound — 600 on Button, 130 on Tabs — then the twelve variables
deleted. Instances on the Table and Design pages followed automatically; they
had inherited rather than overridden. Verified by re-scanning all 20 pages for
any remaining `control/*` binding before deleting, since deletion does not
unbind.

---

## 2026-07-29 (late) — v2 shipped end to end

Figma, the export, the gates, the CSS and the component API are all on v2.
392 variables; names `932422769`, values `555 / 1505770699`.

### Primitives hold values; Semantics holds names

`radius/full`, `border-width/thin`, `font/family/sans`, `font/weight/regular` —
all of these were **roles living in the Primitives collection**. They collided
with the Semantics tokens of the same name: twelve CSS custom properties where
two tokens claimed one `--var` and the build silently dropped one.

The fix was to key primitives by value and let Semantics name them:

    radius/0…32, full     ->  scale/0…32, scale/full
    border-width/thin     ->  scale/1
    font/family/sans      ->  font/family/host-grotesk
    font/weight/regular   ->  font/weight/400

Renames are non-destructive, so no binding moved. The collisions went to zero
without a build-script prefix hack.

`spacing/*` and `scale/*` hold the same numbers and were deliberately **not**
merged — components bind `spacing/*` directly, so merging meant rebinding 845
nodes for no functional gain.

### border-width is 1 / 2 / 4

Was `thin` 1 · `default` 1.5 · `thick` 2. A fractional default is strange, and
the 1.5 step was bound by nothing at all. `control/border-width` sat at the same
value under a second name; it was merged into `border-width/default` (302 nodes
rebound), leaving the control scale purely dimensional.

### Two icon scales, on purpose

`control/<step>/icon-size` is the icon inside a control and moves with it
(16/20/24). `icon-size/xs…xl` is standalone (12/16/20/24/32) for icons in text,
tables and empty states. Conflating them would force every standalone icon to
pretend it lives in a control.

### text/on-color flips; that was a correction, not a preference

Rendering both themes found Primary Neutral as white text on a white button in
dark. `surface/inverse` flips between modes and `text/on-color` did not, so the
pairing worked in light and failed completely in dark. Contrast 1.0 → 21.0.

It reaches every solid accent, so all six were measured — all pass, three only at
AA-large. Recorded in [token-architecture-v2.md](token-architecture-v2.md) §6a
rather than quietly adjusted.

**This is the argument for rendering.** Every automated check passed: the names
parsed, the tiers held, all 133 CSS references resolved, 30 tests were green. A
resolved value is not a legible one.

### Badge speaks the token vocabulary; Button does not

`intent="danger"` became `intent="error"`, plus `brand` → `primary` and `info` →
`information`. Those three were v1 words the tokens had already retired.
**Renamed in Figma first, then in code** — the React API mirrors the Figma
variant names, so changing one side alone moves the mismatch rather than
removing it.

Button keeps `Primary Brand`, `Primary Neutral`, `Destructive`. Those name a
hierarchy and an action, not token roles. `destructive` tells a reader what the
button does to their data, which is more useful at a call site than `error`, and
Figma agrees. Consistency is worth a lot, but not the loss of a better word.

### A gate that cannot fail is worse than no gate

`audit-names.mjs` branched on the collection names `'Semantic'` and
`'Component'`. After the migration neither existed, so every structural check was
skipped and it reported a clean **0 errors, 0 warnings** while validating
essentially nothing. An unknown collection is now a loud error. Every gate was
negative-tested — 22 cases for the audit, 3 injected failures each for the tier
and bindings checks — because a green light nobody earned is the most expensive
kind.

The same lesson applies to `src/dtcg/`: a renamed collection left its old file
behind, and `build-css.mjs` sources files by name. The generator now clears the
directory first.

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
