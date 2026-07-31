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
    duration: 0.3,
    easing: { type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: 0.4, y1: 0, x2: 1, y2: 1 } } } } }
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

--ion-ease-out          cubic-bezier(0.2, 0, 0, 1)     entering a state — the default
--ion-ease-in           cubic-bezier(0.4, 0, 1, 1)     leaving: dismiss, collapse
--ion-ease-in-out       cubic-bezier(0.4, 0, 0.2, 1)   two-way travel on one path
--ion-ease-linear       linear                          continuous progress only
```

Indexed by value; a component picks a rung. There is deliberately no
`--ion-duration-hover` — that is indexed by _usage_, so it needs a new entry
per usage pattern. The `control/<size>/*` postmortem in `CLAUDE.md` is the
cautionary example.

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

Figma's one authored curve, `cubic-bezier(0.4, 0, 1, 1)`, is its Ease In
preset: flat start, arriving at full velocity. It is the wrong shape for a
colour hold and is **not** the default here. It is preserved as
`--ion-ease-in` for the case it does suit, things leaving.

## 3. Which rung to pick

1. **State changes (hover, focus, selected, disabled) get `base` + `out`.** No
   design decision needed; this is the default and every stylesheet uses it.

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

## 4. `prefers-reduced-motion`

Already handled, and better than the proposal suggested. The proposal wanted
the duration variables zeroed under the media query at `:root`. What ships is a
single global block in the package's `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  [class^='ion-'],
  [class*=' ion-'],
  [class^='ion-'] *,
  [class*=' ion-'] * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    /* … */
  }
}
```

This is strictly stronger: it also covers `animation`, and anything that has
not yet adopted the ladder. `0.01ms` rather than `0` so the browser still fires
`transitionend` / `animationend` for code that listens. **Do not** add a second
reduced-motion override in `motion.css` — one place, not two.

## 5. Adoption

All 16 hardcoded `150ms cubic-bezier(0.4, 0, 0.2, 1)` literals across the 12
component stylesheets now read from the ladder. The only remaining `ms`
literals in `packages/ionbase-ui/src/styles` are the `0.01ms` reduced-motion
values and prose in comments.

Nothing enforces that. The gate worth adding, and not yet built, is a check
that fails the build on a raw `ms` literal in a component stylesheet —
otherwise the ladder decays back into magic numbers the first time someone is
in a hurry. Colour and geometry both have gates; motion does not.

## 6. Still open

- **The gate above.**
- **Asymmetric hover enter/leave.** Standard practice is a quicker in and a
  gentler out. Not implemented, because Figma specifies only the enter
  direction and the value of the change is small next to §2's two fixes. It is
  roughly three lines per component if wanted.
- **Button's Figma prototype reaction now disagrees with the code** (300ms
  Ease In vs 200ms ease-out). It is the only authored motion in the file —
  every other component page has zero reactions, and Nav Item's `State=Default`
  has an `ON_HOVER` trigger with `transition: null`, an empty interaction
  rather than a spec. Either delete it or treat it as a mockup, so nobody
  re-derives from it later.
- **Getting `box-shadow` off Button's transition list.** The raised/inset
  shadows are four-layer composites; interpolating four layers per frame
  repaints rather than composites. Moving the elevation to a `::before` and
  transitioning its `opacity` would make it compositor-only. Independent of the
  ladder.
