# Motion system

**Status: IMPLEMENTED** as of 0.4.0. This document described a proposal until
then; it now describes what shipped, and the parts of the proposal that were
deliberately not taken.

Motion answers one question: _when a component animates, what makes it
recognizably part of the same system rather than a one-off?_ The answer is a
small ladder of durations and easings that every stylesheet reads from, and a
rule for which rung to pick.

## 1. Where the values live

Source: [`packages/tokens/motion.json`](../packages/tokens/motion.json) →
[`build-motion.mjs`](../packages/tokens/scripts/build-motion.mjs) →
`dist/css/motion.css`, synced into the published package and imported by
`ionbase-ui/tokens`.

`motion.json` sits at the package root, beside `token-overrides.json` and
deliberately **outside `src/figma/`** — a re-export overwrites everything in
there, and this file is repo-owned.

### These are not tokens, and the prefix says so

The proposal claimed motion "has no Figma representation." That was wrong.
Figma expresses motion as **prototype reactions**, readable at
`node.reactions[].action.transition`:

```js
{ trigger: { type: 'ON_HOVER' },
  action: { transition: { type: 'SMART_ANIMATE',
    duration: 0.2,
    easing: { type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0, y2: 1 } } } } }
```

Note that neither `get_motion_context` nor `manualKeyframeTracks` sees these —
both come back empty. Absence there is not evidence of absence.

But a reaction is not a **variable**, so there is still nothing for a token to
alias. That is the same situation as effect styles, and it gets the same
answer: commit the values, generate the CSS, and mark it with the `--ion-`
prefix. Anything named `--duration-*` would have come from the token pipeline;
none of this does.

This is why the shipped names are `--ion-duration-*` / `--ion-ease-*` rather
than the proposal's `--motion-duration-*` / `--motion-easing-*`. The prefix
carries information, and a second convention for the same category of value
would have thrown it away.

## 2. The ladder

```
--ion-duration-fast     120ms   press and release
--ion-duration-base     200ms   any state colour change — the default
--ion-duration-slow     320ms   things that travel or resize
--ion-duration-cycle   1200ms   one turn of a loop that runs until the work ends

--ion-ease-out          cubic-bezier(0.2, 0, 0, 1)     entering a state — the default
--ion-ease-in           cubic-bezier(0.4, 0, 1, 1)     leaving: dismiss, collapse
--ion-ease-in-out       cubic-bezier(0.4, 0, 0.2, 1)   two-way travel on one path
--ion-ease-linear       linear                          continuous progress only
```

Indexed by value; a component picks a rung. There is deliberately no
`--ion-duration-hover` — that is indexed by _usage_, so it needs a new entry
per usage pattern. The `control/<size>/*` postmortem in
[`AGENTS.md`](../AGENTS.md) is the cautionary example.

### What changed from the proposal, and why

The proposal defined `fast` as 150ms and `standard` as
`cubic-bezier(0.4, 0, 0.2, 1)` specifically so that adopting the ladder would
be "a find-and-replace with no visual change." That turned out to be the wrong
goal: the pair being preserved was the defect.

- **150ms → 200ms.** Short enough that a colour change reads as a jump rather
  than a change.
- **`in-out` → `out` as the default.** `cubic-bezier(0.4, 0, 0.2, 1)` is
  symmetric, so it has a slow _start_; on a short colour change the new value
  appears to arrive late and then snap. `ease-out` leaves immediately and
  decelerates in, so the same change reads as settling. This is the larger of
  the two fixes.

The proposal's four-duration ladder also collapsed to three: `instant` and
`fast` were 100/150ms for "micro-feedback" and "state change", a distinction
no component turned out to draw. `ease-in-out` survived for exactly one
consumer — the Toggle knob — and is documented as such.

Figma's one authored curve was `cubic-bezier(0.4, 0, 1, 1)`, its Ease In
preset: flat start, arriving at full velocity. It is the wrong shape for a
colour hold and is **not** the default here. It is preserved as
`--ion-ease-in` for the case it does suit, things leaving.

**Figma now follows the code.** On 29 Sep 2026 both hover reactions in the
file were set to `base` + `out`, 200ms `cubic-bezier(0.2, 0, 0, 1)`: Button's
Primary Brand Small (`21:11`) and Medium (`21:41`), which were 300ms Ease In,
and the one instance that inherits Small; and Nav Item's `State=Default`
(`53:9`), whose hover swap had no transition at all. A prototype now previews
what ships, and nobody re-derives the ladder from an old value. The ladder is
the source; a change to a rung either component uses changes its reaction in
the same PR.

## 3. Which rung to pick

1. **State changes (hover, focus, selected, disabled) get `base` + `out`.** No
   design decision needed; this is the default. **The same curve both ways**:
   a quicker enter and gentler leave was considered and declined on 29 Sep
   2026 (§6). Not every stylesheet follows this rule yet: 18 of the 48 with a
   hover rule have no transition at all. Some of those are deliberate, some
   are gaps, and they are being sorted in the open-items checklist.

2. **Press gets `fast`.** A press must resolve while the pointer is still down
   or the feedback reads as lag. Button does this with a single
   `transition-duration` override on `:active` / `[data-pressed]`; release
   returns to `base` automatically, because the override only holds while the
   pressed state does.

3. **Two-way travel on one path gets `in-out`.** Currently only the Toggle
   knob. A symmetric curve is what makes on and off feel like one gesture
   reversed; everything else enters a state and stays there.

4. **Reveal/dismiss gets `base` or `slow` depending on distance.** Scroll
   Progress's panel stays on `base`: an 8px slide reads as a reveal, not as
   travel. `slow` is for surfaces that genuinely cross the screen.

5. **Anything more choreographed than a single opacity/transform pair — a
   staggered per-row reveal, a sequence, a spring — needs a design decision
   made against the real component in Figma**, the same way colour mapping
   does. Inventing one ahead of that decision is the same category of mistake
   as an agent renaming tokens to make the spec tidier.

6. **Nothing animates on mount by default.** A component appearing because its
   parent re-rendered is not the same event as a user opening it.

7. **A shadow does not transition — it snaps.** A `box-shadow` list only
   interpolates when every layer pairs with one of the same kind, inset with
   inset. Button's raised bevel, its insets and the focus ring do not, so its
   `box-shadow` transition mostly never ran, and the three changes that did
   pair morphed one shadow into an unrelated one, repainting every frame.
   Measured and removed in 0.136.0; the colour still fades over it. If a
   shadow ever needs to move, crossfade two layers' `opacity` — do not
   interpolate the list.

8. **A loop gets `cycle` + `linear`.** The working glyphs in AgentActivity,
   StatusIndicator and ToolCall turn once per `cycle`. Added in 0.135.0, when
   the gate below found all three on a raw `1.2s`; nothing finishes on it, so
   it is not for a state change. Spinner and the indeterminate ProgressBar
   predate it and turn on `slow`.

## 4. `prefers-reduced-motion`

Already handled, and better than the proposal suggested. The proposal wanted
the duration variables zeroed under the media query at `:root`. What ships is a
single global block in the package's `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  [class^='ion-'],
  [class*=' ion-'],
  [class^='ion-'] *,
  [class*=' ion-'] *,
  /* …and the ::before / ::after of each */ {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    /* … */
  }
}
```

This is strictly stronger: it also covers `animation`, and anything that has
not yet adopted the ladder. `0.01ms` rather than `0` so the browser still fires
`transitionend` / `animationend` for code that listens. **Do not** add a second
reduced-motion override in `motion.css` — one place, not two.

**Nor in a component stylesheet.** Six carried their own
`transition-duration: 1ms`; the global block already beat five of them, and
they were removed in 0.135.0. The sixth, Slider's thumb halo, was the one
doing work, because `*` does not match `::before` — so the block now lists the
pseudo-elements, which also caught Table's resize handle, which nothing
covered.

**Two loops out-rank it, deliberately.** A still spinner cannot be told from a
hung one, so Spinner and the indeterminate ProgressBar are slowed, not
stopped: `calc(var(--ion-duration-cycle) * 2)` and `* 2.5`, with
`animation-iteration-count: infinite`. Both need `!important` and two classes
to get there. Until 0.135.0 they had neither, the global block won, and under
reduced motion both stopped after one frame — since Spinner shipped in
0.55.0. A loop whose shape carries the meaning without moving — the working
glyphs — sets `animation: none` instead, which the block does not fight.

`Foundations/Reduced motion` in Storybook checks all of this with the query
emulated (`commands.reducedMotion`, reset before every story).

## 5. Adoption

All 16 hardcoded `150ms cubic-bezier(0.4, 0, 0.2, 1)` literals across the 12
component stylesheets read from the ladder since 0.4.0.

**It had decayed anyway.** By 0.134.0 there were 14 raw durations again, in
components that shipped after the ladder: three glyphs at `1.2s`, a cursor at
`1s`, two reduced-motion loops at `2400ms` and `3000ms`, and six
`transition-duration: 1ms`. Nothing enforced the ladder, so nothing noticed.

**The gate, since 0.135.0,** is `declaration-property-unit-disallowed-list` in
the published `ionbase-ui/stylelint-config`: no `ms` or `s` in any
`transition*` or `animation*` declaration. A consumer's own CSS gets it too,
which is the point — an agent writing an app reaches for `150ms` as readily as
the system once did. `calc()` over a rung passes, since it carries no unit of
its own. Two lines are exempt, each with a `stylelint-disable` giving its
reason: the `0.01ms` in the global reduced-motion block, which is the "no
motion" value itself, and StreamingText's `1s` caret blink.

## 6. Decided against

- **Asymmetric hover, enter vs leave** (29 Sep 2026). Common practice is a
  quicker enter and a gentler leave. It was declined because:
  - **Figma:** Button's and Nav Item's hover reactions were set to the
    code's 200ms ease-out, which Figma plays both ways. Asymmetry would put
    them out of step again.
  - **Cost:** it would touch 30 stylesheets and 113 hover selectors.
  - **Payoff:** the gain is small next to §2's two fixes.
