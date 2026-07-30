# Motion system — a plan, not an implementation

**Status: PROPOSAL.** Nothing in this document has been built. It exists to
answer one question before any component's motion gets more elaborate than it
is today: _when we do choreograph something, what makes it recognizably part
of the same system rather than a one-off?_

Scroll Progress is the component that raised the question — hovering its rail
reveals a panel of section links, and the reveal is currently "deliberately
plain" (see the header comment in
[`scroll-progress.css`](../packages/styles/src/scroll-progress.css)): an
opacity fade plus an 8px slide, same as every other transition in the system.
That was the right call for shipping the component — inventing a bespoke
reveal for one popover ahead of a system-wide decision would have been exactly
the kind of premature choreography this doc argues against. But it also means
Scroll Progress is the concrete example throughout: what would change, and why
it hasn't yet.

## 1. What exists today

Every transition in the codebase is the same literal, copy-pasted:

```css
transition: <property> 150ms cubic-bezier(0.4, 0, 0.2, 1);
```

It appears, unaliased, in `button.css`, `checkbox.css`, `input.css`,
`menu.css`, `nav-item.css`, `radio.css`, `scroll-progress.css`, `select.css`,
`table.css`, `tabs.css`, and `toggle.css` — eleven files, one number. It is
never aliased to a custom property, so "the system's transition timing" is
presently a convention enforced by nobody, not a token enforced by a build
gate the way colour and geometry are.

What it is used for, in every case, is a **state change**: colour, background,
border on hover/focus/selected/disabled. Nothing in the system currently
animates:

- an element entering or leaving the DOM (a toast, a dialog, a dropdown
  appearing) — Scroll Progress's panel is the first component with a
  reveal/hide transition at all, and it reuses the state-change value rather
  than introducing a new one
- a list reordering or filtering
- a value changing (a progress bar filling, a counter ticking)

`prefers-reduced-motion` is referenced nowhere in `packages/styles`. Every one
of the eleven files above would keep animating regardless of that setting.

This is not a crisis — 150ms/`ease-out`-ish is a reasonable default and every
current use is small enough that reduced-motion mostly doesn't matter yet. But
"mostly doesn't matter yet" is exactly the state in which a system either gets
a foundation retrofitted cheaply, or accretes ten more copy-pasted literals
first and then needs a bigger migration. Tokens and geometry both went through
that; motion hasn't, yet.

## 2. Proposed token layer

Following the same shape as the geometry ladders (`radius/*`,
`border-width/*`): a small, fixed set of **duration** and **easing**
Semantics, not a per-component recipe.

```
--motion-duration-instant   100ms   micro-feedback: checkbox check, toggle thumb
--motion-duration-fast      150ms   the current default — hover/focus state changes
--motion-duration-moderate  250ms   reveal/dismiss: popovers, panels, menus
--motion-duration-slow      400ms   larger surfaces: dialogs, drawers, page-level

--motion-easing-standard    cubic-bezier(0.4, 0, 0.2, 1)   the current default — most transitions
--motion-easing-decelerate  cubic-bezier(0, 0, 0.2, 1)      entering: starts fast, settles in
--motion-easing-accelerate  cubic-bezier(0.4, 0, 1, 1)      exiting: starts slow, leaves fast
```

Four durations and three easings, the same "small fixed ladder, not a
per-usage recipe" shape the geometry ladders already enforce — the
`control/*` postmortem in `CLAUDE.md` is the cautionary example of what
happens when a group grows one entry per consumer instead of being indexed by
value. `--motion-duration-fast` / `--motion-easing-standard` are exactly the
150ms/cubic-bezier(0.4, 0, 0.2, 1) pair every file already uses — the token
layer would replace the copy-pasted literal with a name, not change the
existing feel of a single component.

**Where these would live:** motion is not colour, not geometry, and has no
Figma representation (no variable type covers a duration or an easing curve),
so it doesn't belong in the Primitives → Semantics → Interface chain
`token-architecture-v2.md` describes. It would be hand-authored in
`packages/tokens`, the same way `elevation.css`'s shadows are hand-authored
from Figma effect styles rather than aliased variables — a parallel, smaller
output, not a fifth tier of the existing chain.

## 3. Rules for when a component gets more than a state-change transition

The eleven-file audit above shows the system has never needed to decide this,
because nothing has needed more than a colour fade yet. Scroll Progress's
panel is the first candidate, so the rule this doc proposes is shaped by it:

1. **State changes (hover, focus, selected, disabled) get `fast` +
   `standard`** — exactly what exists today, just named. No component needs a
   design decision to add a hover transition; it uses the default.

2. **Reveal/dismiss (popovers, menus, panels) get `moderate`, and enter/exit
   get different easings** — `decelerate` on the way in, `accelerate` on the
   way out. This is the one substantive change Scroll Progress's panel would
   make under this system: not a longer duration for its own sake, but an
   asymmetric one, because entering and leaving are different motions (something
   arriving should settle, something leaving should get out of the way) and
   right now both directions share one symmetric curve.

3. **Anything more choreographed than a single opacity/transform pair — a
   staggered per-row reveal, a sequence, a spring — needs a design decision
   made against the real component in Figma, the same way colour mapping
   does.** `CLAUDE.md` is explicit that "which grey is body text" is a design
   decision made in Figma against real components, not something an agent
   infers from the spec being tidier; staggered motion is the same category of
   decision, and Figma's `reactions` data being empty on every Scroll Progress
   node (checked directly via the Plugin API while building the component) is
   exactly the current evidence that this decision hasn't been made yet. A
   ladder can be adopted unilaterally because it's a convention; a stagger
   pattern is a design choice about how the product feels, and inventing one
   ahead of that decision would be indistinguishable from the "agent renames
   tokens to make the spec tidier" mistake the same doc already warns against,
   just in a different register.

4. **Nothing animates on mount by default.** A component appearing because its
   parent re-rendered is not the same event as a user opening it — the former
   animating unprompted is more often a distraction than a signal.

## 4. `prefers-reduced-motion`

Proposed as a single rule applied at the token layer, not per-component:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-instant: 0ms;
    --motion-duration-fast: 0ms;
    --motion-duration-moderate: 0ms;
    --motion-duration-slow: 0ms;
  }
}
```

Every component that uses the duration tokens (rather than a hardcoded `150ms`)
gets reduced motion for free, with no component-level media query and no risk
of one component being missed — the same leverage the existing token system
already gets from centralizing colour. This is also the concrete argument for
migrating the existing eleven literals to tokens even before any new
choreography is built: today, satisfying `prefers-reduced-motion` means
touching eleven files instead of one.

## 5. What this doc deliberately does not do

- **It does not change Scroll Progress's CSS.** The reveal stays exactly as
  measured and shipped: opacity + an 8px slide at the current shared
  `150ms`/`cubic-bezier(0.4, 0, 0.2, 1)`.
- **It does not introduce `--motion-*` custom properties into any `.css`
  file.** The values above are a proposal for what those tokens would be, not
  a diff.
- **It does not design a staggered reveal, a spring curve, or any per-row
  choreography for Scroll Progress's panel or anything else.** That is
  explicitly out of scope until it's a real design decision made in Figma —
  see §3, rule 3.
- **It does not touch `prefers-reduced-motion` in any shipped stylesheet.**
  §4 is a proposed pattern, not a change.

## 6. If this is adopted

Rough shape of the work, for whenever it is:

1. Add the duration/easing tokens to `packages/tokens` (hand-authored, per
   §2) and the `prefers-reduced-motion` override.
2. Migrate the eleven existing literals to reference the tokens — a
   find-and-replace with no visual change, since `fast`/`standard` are defined
   to match the current value exactly.
3. Revisit Scroll Progress's panel specifically: split its one symmetric
   transition into `moderate`/`decelerate` entering and `moderate`/`accelerate`
   leaving, and only then, as a separate decision, take the "does this deserve
   a staggered per-row reveal" question to Figma.
4. Any _new_ component with a reveal/dismiss interaction (a future Toast,
   Dialog, Drawer) is built against the token layer from the start rather than
   inventing its own literal.
