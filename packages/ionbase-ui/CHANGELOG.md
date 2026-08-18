# Changelog

## 0.17.0 — 2026-08-18

Two things: the **success green now passes AA**, and every component now ships a
**machine-readable contract** at `ionbase-ui/meta`.

### Added — component contracts at `ionbase-ui/meta`

```ts
import index from 'ionbase-ui/meta/index' with { type: 'json' };
import button from 'ionbase-ui/meta/Button.json' with { type: 'json' };
```

Each contract carries `summary`, `useWhen`, `useInstead`, per-value `variants`
guidance, `slots`, `a11y`, `antiPatterns`, `deprecated`, a generated `props`
table and the tokens its stylesheet consumes.

Three tiers, and the tiering is the point. `meta/index` is 12KB and answers
"which component do I need"; `meta/<Name>.json` is one full contract;
`meta` is all 35 at 180KB and is not what you should load. Pick from the index,
then read one component.

Six carry full hand-written intent — `Button`, `Input`, `Select`, `Modal`,
`Table`, `Alert`. The other 29 ship the generated API and their source
documentation, and are being filled in.

Nothing about the runtime changed. This is additive: new export paths, no new
dependencies, no behaviour difference.

### Fixed — the success green

#### `surface/success` + `text/on-color` was 3.69:1

Long-standing and recorded as knowingly unfixed. It now measures **5.24:1** in
Light and 5.70:1 in Dark; hover and pressed clear 7:1 in both modes.

The fix shifted the green **primitives** one rung: the old `green/600` is the
new `green/500`, 700→600, 800→700, 900→800, a darker `#023c13` was added at
900, and 50/300/400 were retinted. Eight of ten rungs changed.

Which tier moved is the whole point. Every accent runs base/hover/pressed at
600/700/800 in Light and 500/400/300 in Dark, so re-pointing `surface/success`
at `success/700` would have made the base identical to its own hover — the
`surface/success-strong` defect again. Changing the values underneath left
every Interface role on the rung it already had, so **no Interface or Semantics
variable changed at all**; three of the four collections re-exported
byte-identical.

**What this means for you.** If you use `Button` with `variant="success"`,
`Badge`/`Alert` with the success intent, or any `--surface-success*`,
`--text-success`, `--icon-success` or `--border-success*` custom property, the
rendered green is darker in Light and unchanged in name. No API, class or token
name changed — this is a value change only, and nothing needs migrating.

`surface/information` + `text/on-color` in Dark remains at 3.44:1 and is still
unfixed. It is the same shape of problem and takes the same fix: move the
purple primitives, not the role bindings.

### Tokens

None added or removed — still 384. Eight primitive values changed.

## 0.16.0 — 2026-08-17

The serif is now **STIX Two Text**. One alias moved in Figma; nothing else
changed.

### Changed — `--font-family-serif`

`font/family/serif` was aliased to `font.family.merriweather` and now aliases
`font.family.stix-two-text`. The four `.ion-text-editorial-*` classes render in
STIX Two Text as a result. No class, token name or component changed, and no
text style was rebound — every one of them binds the Semantics alias, which is
exactly what that tier is for.

**If you load webfonts, swap Merriweather for STIX Two Text.** An app that
keeps loading Merriweather gets the Georgia fallback on editorial text, which
degrades quietly rather than breaking. STIX Two Text is variable across
400–700, so a single face covers the ramp where Merriweather needed a static 700.

### Why not a mode

A `Semantics` mode per font pairing is the general answer and it is deliberately
deferred — modes buy two brands resolving _at the same time_, and there is one
brand. `font/family/merriweather` stays in Primitives, bound by nothing, as the
first value a second mode will reach for. `--font-family-merriweather` is still
emitted, so an app can use it today.

### Still unresolved

`font/family/serif-display` now aliases the same primitive as `font/family/serif`
and is referenced by nothing in this package — two names for one family. It is
left in place rather than deleted, because deletion in Figma is the destructive
half of the decision and the display/text serif split may yet be wanted.

### Tokens

None added or removed — still 384. One alias target changed.

## 0.15.0 — 2026-08-14

`Popover`, designed in Figma first. **Nothing existing changes** — purely
additive.

### Added — `Popover`

Measured from Figma `Popover` (825:1853). Four placements x three sizes —
`sm` 280, `md` 320, `lg` 400. Sizes are **widths only**; height always hugs the
content, and the body scrolls once it passes 60vh.

**It sits between Tooltip and Modal.** A tooltip is a hint that cannot hold
focusable content; a modal is a task that takes over the page. A popover holds
interactive content but stays attached to the control that opened it. Focus is
contained, Escape and outside clicks close it, and the rest of the page is
hidden from assistive tech while it is open — the same guarantees Modal gives.
What differs is the framing: no visible scrim, anchored to its trigger, and
`surface/raised` rather than Modal's `surface/overlay`.

`placement` names where the POPOVER sits, not where the arrow points — `top` is
above the trigger, caret on the panel's bottom edge. It is a preference:
react-aria flips to the opposite side when there is no room, and the side class
is read back from the RESOLVED placement so the caret goes with it.

### Two things that had to be got right

**The panel is its own component, mounted only while open.** `useDialog`
focuses the panel and resolves the title's id in effects that run when the
component calling the hook mounts. Called next to `useOverlayTriggerState` in
the parent, that moment is when the TRIGGER mounts and the panel does not exist
yet — the dialog never takes focus (so Escape never reaches it) and
`aria-labelledby` is silently dropped. Both were caught by stories before this
shipped.

**One positioning call, not two.** `usePopover` runs `useOverlayPosition`
itself and returns the resolved placement and arrow offsets with it; calling
`useOverlayPosition` separately produces a second set of transforms that fight
the first.

### Smaller decisions

There is deliberately no `aria-haspopup` on the trigger. ARIA 1.1 allows
`dialog`, but react-aria emits the attribute only for menus and listboxes
because screen readers announce every other value as "menu". `aria-expanded`
and `aria-controls` already say a container opens from here.

The caret is a rotated square with two borders cleared, not a border triangle
as in Tooltip — this panel has a 1px outline for dark mode, and only a rotated
square keeps that outline continuous where the caret meets it.

`z-index: 1150`, between Modal's 1000 and Toast's 1200: a popover opened from a
control inside a dialog has to sit above the dialog, and a toast confirming
what it did has to sit above both.

### Tokens

None added — still 384. `bindings.json` gains `Popover/Popover` with 24
bindings, taking the snapshot to 40 components and 917 bindings.

## 0.14.0 — 2026-08-14

`Toast`, designed in Figma first. **Nothing existing changes** — purely additive.

### Added — `Toast`, `ToastProvider`, `useToast`

Measured from Figma `Toast` (820:1655). Six intents on **neutral chrome** —
`surface/raised` with `Shadow/lg`, intent carried by the icon alone. A tinted
panel floating over unknown content competes with whatever is behind it, and
makes Toast and Alert indistinguishable at a glance. First consumer of
`surface/raised`.

`ToastProvider` owns the queue, the placement and the limit; the toast itself
knows none of it. `useToast()` returns `{ toast, dismiss }`.

### Three behaviours worth knowing

**Every intent is `role="status"`, including error.** Alert derives its role
from intent, because an error there is content the user navigated to. A toast
arrives unbidden and often several at once, so an assertive region would
interrupt whatever is being read each time one lands — anything urgent enough
to interrupt should not be transient.

**The live region is the container and it always exists**, empty or not. A
region announced into existence at the same moment as its content is not
reliably read; assistive tech has to be watching the node before text lands in
it.

**Auto-dismiss pauses on hover and focus** (WCAG 2.2.1). A toast that keeps
counting down while being read, or while its action has keyboard focus, takes
the action away mid-reach. The timer restarts rather than resumes, which is the
forgiving direction.

### Smaller decisions

One action, not a row — a toast is transient and a second choice belongs in a
dialog that will still be there. The action is a quiet text button rather than
a `Button` instance: the smallest Button is 32 tall with its own padding and
border, which makes a 400px toast noticeably taller for one word.

The region is `pointer-events: none` with `auto` on each toast, so a fixed box
spanning a corner of the viewport does not swallow clicks where nothing is
drawn. It sits at `z-index: 1200`, above Modal's 1000 and Tooltip's 1100 — a
toast confirming what a dialog just did has to be visible over it.

### Tokens

None added — still 384. `bindings.json` gains `Toast/Toast` with 25 bindings.

## 0.13.1 — 2026-08-14

`Alert`, designed in Figma first. **Nothing existing changes** — purely additive.

> `0.13.0` was published to npm from a branch, before `0.12.1` and `0.12.2` had
> merged, so it contains Alert but not the `Link` DOM-prop fix or the dark-mode
> contrast fix. This release is that same Alert plus both. Nothing is missing
> from `0.13.0`; it is simply incomplete, and `0.13.1` supersedes it.

### Added — `Alert`

Measured from Figma `Alert` (812:1902). `Intent` x `Emphasis` x `Layout`, with
the parts as props: `title`, `icon`/`hideIcon`, `actions`, `onDismiss`.

Intents match `Badge` exactly — `surface/<intent>-subtle`,
`border/<intent>-subtle`, `text/<intent>`, `icon/<intent>`, neutral on
`surface/muted` — so a status mapped to a Badge intent can be passed here.

**The ARIA role is chosen by intent, not passed in.** `error` and `warning`
render `role="alert"`, an assertive live region that interrupts a screen
reader; the rest render `role="status"`, which waits for a pause. Both
directions of getting this wrong are common: a page of assertive status
messages talks over the user, and an error announced politely is missed. The
icon is `aria-hidden` — it repeats what the colour and copy already say.

**Each intent has its own glyph** — check for success, triangle for warning,
x for error, info otherwise. In Figma these briefly collapsed to a single
`info` because binding the icon to one instance-swap default discards the
per-intent value; there is a story asserting they stay distinct.

**Banner is not a width.** It meets its container edges, so the radius goes and
the side borders go with it — a 1px rule at the viewport edge is invisible one
side and a seam the other. The block edges keep theirs.

### Tokens

None added — still 384. First consumers of `surface/warning`,
`surface/information`, `border/warning-strong` and `border/information-strong`.
`bindings.json` gains `Alert/Alert` with 53 bindings.

### Known — two solid intents fall short of AA

`surface/success` + `text/on-color` is 3.69:1 in Light and
`surface/information` is 3.44:1 in Dark, against 4.5:1 for normal text. Neither
is a one-step fix: every accent runs base/hover/pressed at 600/700/800, so
moving a base onto 700 makes it identical to its own hover. Recorded in
`AGENTS.md` and in the component, pending an accent-ramp decision.

## 0.12.2 — 2026-08-14

Two WCAG AA contrast failures in dark mode, both shipped. **Colour change** —
`text/error` and `text/information` are one ramp step lighter in dark.

### Fixed — two intent pairings failed AA in dark

| pairing                                            | before     | after  |
| -------------------------------------------------- | ---------- | ------ |
| `text/error` on `surface/error-subtle`             | **3.38:1** | 5.56:1 |
| `text/information` on `surface/information-subtle` | **4.12:1** | 7.65:1 |

Badge ships both. Its label is `type/body-sm` (14px regular), which is normal
text under WCAG 1.4.3, so the bar is 4.5:1 — the 3:1 large-text allowance does
not apply.

Fixed in Figma, not in CSS: `text/error` dark moves `error.400` → `error.300`
and `text/information` dark moves `information.400` → `information.300`. Both
are text roles rather than ramp steps with hover/pressed siblings, so nothing
collides, and every other pairing they appear in improves — `text/error` on the
page surface goes 6.04 → 9.94.

### Known, unfixed — two solid pairings

`surface/success` + `text/on-color` is 3.69:1 in Light (Button's `success`
variant) and `surface/information` is 3.44:1 in Dark. Neither is a one-step
fix: every accent runs base/hover/pressed at 600/700/800, so moving a base onto
700 makes it identical to its own hover. Fixing them means shifting those two
ramps, which is a design decision rather than a contrast patch. Recorded in
`AGENTS.md`.

Also corrected there: the long-standing note that `surface/warning` has no
passing text pairing in dark. It measures **5.83:1** today — the values moved
and the note did not.

## 0.12.1 — 2026-08-14

Two interaction debts, both previously identified and neither started. No API
changes.

### Fixed — `Link` leaked React Aria props to the DOM

`onPress` and friends survived into the rest-props spread and landed on the
element, so every consuming app logged "Unknown event handler property
`onPress`. It will be ignored." on every render. Harmless at runtime — the
handler still fired, because `useLink`/`useButton` were handed the full props
object — but it is exactly the noise `dom-props.ts` exists to prevent, and
Button has been guarded against it since 0.7.x.

Found in a CI log rather than by a test, which is why `Link` now has the same
guard Button does — negative-tested by reverting the fix and confirming the
story goes red.

The button branch strips more than the anchor branch: `target`, `rel`,
`download` and the rest are real anchor attributes and meaningless on a
`<button>`. Two lists rather than one, because merging them would silently drop
`target` and `rel` from real links — there is a story asserting they survive.

### Fixed — `Tabs` polled a hover attribute instead of observing it

`StateAttributes` used `waitFor` on `data-hovered`, which is a pulse in
headless Chromium: the browser drops `:hover` a few ticks after the pointer
arrives and the attribute is removed. Polling cannot catch a value that has
already gone, so the story was green only because it kept winning the race —
NavItem's identical line eventually lost it on CI. Now observed with a
`MutationObserver`, matching Button and NavItem.

The disabled half of that story deliberately keeps its plain assertion: it
checks an ABSENCE, and a value that never appears cannot be missed.

### Not changed — `ScrollProgress` and `Badge`

Both were on the list and both turned out not to be defects.

`ScrollProgress` looks like the same hover hazard and is not: it schedules its
close on a 100ms timeout, so `isOpen` outlives the dropped hover and `waitFor`
is the right tool there.

`Badge` uses `text/link` for its primary variant, which is the wrong role name
— but `text/link` is `primary.700` and `text/primary` is `primary.600`, while
the sibling intents run `text/success` 700, `text/error` 700 and
`text/information` 700. "Correcting" the role would make the primary badge
visibly lighter than every badge beside it. The real gap is that `text/primary`
sits a step off the other intent text roles, which is a decision for Figma, not
a rename here.

## 0.12.0 — 2026-08-14

`Tooltip`, designed in Figma first. **Nothing existing changes** — purely additive.

### Added — `Tooltip`

Measured from Figma `Tooltip` (801:1568). Four placements, wrapping its trigger
so the common case is one element deep:
`<Tooltip label="..."><Button/></Tooltip>`.

**`placement` names where the tooltip sits, not where the arrow points.** `top`
is above the trigger, arrow on the bubble's bottom edge — the same convention
react-aria uses, so the Figma variant and the code prop mean the same thing. It
is a preference rather than a guarantee: react-aria flips to the opposite side
when there is no room, and the arrow modifier follows the **resolved**
placement, not the requested one. An arrow driven by the prop would keep
pointing at a side the tooltip is no longer on.

**Focus opens it, not just hover.** A hover-only tooltip is invisible to
keyboard and switch users. Escape dismisses it while the trigger keeps focus,
and only one tooltip is open at a time.

A tooltip is a hint, not a container: text only, wrapping at 280px. Anything
focusable or scrollable belongs in a popover.

### `text/inverse` finally has a consumer

`surface/inverse` with `text/inverse` is the only pairing in the system that
inverts as a unit, so the tooltip is dark on a light theme and light on a dark
one with no second variant and no media query of its own. Both tokens were
defined long before anything used them; this is the first consumer of
`text/inverse` anywhere.

The arrow is a border triangle rather than a rotated box — a rotated square
inherits the bubble's `box-shadow` and casts a second, offset one, and rounds
its corners with the bubble's radius.

### Tokens

None added — still 384. `bindings.json` gains `Tooltip/Tooltip` with 11
bindings.

## 0.11.0 — 2026-08-14

`Modal`, designed in Figma first. **Nothing existing changes** — purely additive.

### Added — `Modal`

Measured from Figma `Modal` (792:1537). Four sizes x two alignments, with the
sections as props rather than variants: `title`, `description`, `media`,
`footer`, `showClose`, and the body as `children`.

**Renders nothing when closed, and portals when open.** Both matter: a modal
left in the tree while closed is still keyboard-focusable, and one rendered
inline inherits any `overflow: hidden` or stacking context from wherever it was
written.

Focus trap, outside-click, Escape, scroll lock and `aria-hidden` on the rest of
the page all come from React Aria's `useModalOverlay` and `useDialog`. None of
it is reimplemented, and a story asserts Escape specifically — so if the modal
is ever rebuilt on a plain div, something notices that the focus trap left with
it.

`media` is a featured slot above the title: a circular container that hugs
whatever goes in it, so an icon and a spot illustration both sit correctly
without a second variant.

### Two things Figma cannot express, added here

**The panel is capped to the viewport and the body scrolls.** Figma panels hug
their content because a Figma frame has no viewport to overflow. A real one
does, and a dialog taller than the screen is unreachable at both ends — so the
header and actions stay put while long content moves underneath them.

**The scrim is part of this component.** Figma models the panel alone so it can
be dropped into any layout, and binds `surface/scrim` on a separate usage
frame. In code that split is useless: nothing renders a modal without also
rendering what sits behind it.

A consequence worth knowing: `bindings.json` records the panel's tokens but not
the scrim, because the export only walks components and the scrim sits on a
frame. `surface/scrim` therefore still reads as unbound in any "which roles
have no consumer" sweep. It has one — `modal.css`.

### Fixed before shipping — centred content was 24px off centre

`align="center"` centres the heading inside the header **minus** the close
button, landing the title and media 24px left of the panel's true centre — half
the close plus its gap.

Caught in Figma by measuring rather than looking, then caught **again** in CSS
by a story that asserted the same thing, because the assumption that flexbox
would not have the problem was wrong. Both sides now carry a spacer of matching
width, gated on the close button's presence so the pair appears and disappears
together; a spacer that outlived the button would push content 24px the other
way. There is a story for that case too.

### Tokens

None added — still 384. `bindings.json` gains `Modal/Modal` with 34 bindings,
and `surface/overlay` gets its first consumer.

## 0.10.0 — 2026-08-07

`Link`. **Nothing existing changes** — this is purely additive.

### Added — `Link`

Designed in Figma first (`Link`, 774:1516), then built here. Two types, five
states, and **no new tokens**: `text/link/hover`, `text/link/visited` and
`ring/focus` were already defined and had no consumer anywhere.

`variant="inline"` is underlined in **every** state — a link inside a paragraph
distinguished only by colour fails WCAG 1.4.1. `variant="standalone"` earns its
lack of underline from context (a table cell, a list, a card footer) and
underlines on hover, so the affordance is deferred rather than absent.

**There is no `size` prop, and that is the design.** A link is inline: it takes
the type of the sentence around it. `font-size` and `line-height` inherit, and
the icons are `1em`, so a 14px link gets a 14px icon without being told. Figma
draws its variants at 16/24 because a Figma variant must have a concrete size —
that is one sample of an inheriting element, not a specification.

Renders an `<a>` with `href` and a `<button>` without one, the same judgment
`NavItem` makes. A disabled link drops its `href` and leaves the tab order:
`aria-disabled` alone announces the state and changes nothing else, leaving the
link clickable, focusable and middle-clickable.

### Icons inherit, and that is load-bearing

Both slots are `currentColor` and `em` rather than an `icon/*` token and an
`icon-size` rung. The icon cannot drift from the text it belongs to, in any
state, without a single rule keeping them in step.

This is deliberately **not** the usual v2 split between `text/*` and `icon/*`,
because the icon here makes no colour decision of its own. The Figma component
binds the label's colour token onto the icon vectors to depict the same
relationship, since Figma has no inheritance — where the icons were
`icon/default` (near-black) on a blue link until that was caught in review.

### Tokens

None added — still 384. `bindings.json` gains `Link/Link` with 15 bindings, and
three Interface roles get their first consumer in the system.

## 0.9.0 — 2026-08-07

`PhoneInput`, the last unbuilt component on the Input page. **Nothing existing
changes** — `Input` gains one optional prop and is otherwise untouched.

### Added — `PhoneInput`

Measured from Figma `Input/Phone` (80:372). A dial-code block butted against an
`Input`, sharing one outline: the block carries the left radii and the control
the right, so the seam is square on both sides and the pair reads as a single
control.

Three sizes and no State axis. Every interaction state is the `Input`'s, reached
through the ordinary props, because Figma composes this from the same `Input`
instance rather than redrawing it. `type` defaults to `tel`.

**It does not pick countries, deliberately.** The chevron implies a menu and
Figma specifies no open state for it — no list, no flags, no search, no selected
state. Which territories, what to call them and what order to show them in are
editorial decisions with real weight, and inventing them here would be designing
rather than implementing. The trigger is a real `<button>` with an accessible
name, and `countryButtonProps` is how you attach a `Menu`, a popover or your own
listbox — including the `aria-haspopup` and `aria-expanded` that only the thing
owning the popup can set honestly.

Disabling the field disables the trigger too. A dial-code button that stays live
beside a field you cannot edit offers an action that goes nowhere.

### Added — `Input` accepts `leadingAddon`

The mechanism `PhoneInput` is built on. Distinct from `leadingIcon`, which sits
_inside_ the control box: an addon has its own surface and border and is a
sibling of the box.

It lives on `Input` rather than inside `PhoneInput` because the `.ion-field`
wrapper has to enclose the addon and the control **together**. Building the block
outside `Input` would put the label above only half the control and leave the
addon outside the wrapper — visually almost right, and wrong in the
accessibility tree. There is a story asserting exactly that, through
`getByLabelText` rather than DOM shape.

Phone is the only addon Figma specifies, so this is a slot, not a system. There
is deliberately no trailing counterpart and no addon variant ladder.

### Tokens

None. `PhoneInput` binds `surface/page`, `border/default`, `text/secondary`,
`icon/tertiary`, the `radius` and `spacing` rungs the Input already uses, and
adds nothing — the component is a composition, not a new vocabulary.

One measured divergence worth knowing: the block's internal gap is `spacing/4`
at **every** size, where the Input's runs 6/8/8. Reproduced as measured; it holds
two tightly-related glyphs rather than an icon and a sentence.

## 0.8.0 — 2026-08-07

Two new Button variants and a fourth size. **Nothing existing changes** — every
current `variant` and `size` renders exactly as it did in 0.7.0, so this is
additive and the minor is not carrying a breaking change this time.

### Added — `variant="primary-soft"` and `variant="success"`

`primary-soft` is the tinted counterpart to `primary-brand`: brand colour on the
label rather than the surface, for a brand-weighted action that should not
compete with a solid primary beside it. It is the only raised variant whose text
is `text/primary` rather than `text/on-color`.

Its press is a two-step no other variant makes — the surface moves
`primary-subtle` → `primary-tint` **and** the border jumps two rungs,
`border/primary-subtle` → `border/primary`. Everything else either holds its
border or steps it once. It presses flush like `secondary`, because a tinted
surface has too little contrast for the lifted inset to register.

`success` is structurally identical to `destructive` — solid accent surface,
`text/on-color`, a `*-strong` border held across every state, lifted press. That
is the v2 ramps working as intended rather than a coincidence: `success/*` and
`error/*` carry identical slots, so the variant needed **zero new colour
tokens**.

### Added — `size="xl"`

56 tall, 24 padding, `Body/Large Emphasis` (20/32), `icon-size/lg`.

Two things worth knowing before you reach for it. Its icon is 24 — the same as
`lg` — so `xl` is the one rung where the icon does **not** run ahead of its
label (24 vs 20, where `lg` is 24 vs 18). And its elevation is the `lg` rung,
not a new one: `Raised/Lifted/xl` exists as an effect style but the _inset_
families stop at `lg`, so there is no complete `xl` rung to press into.

### Tokens

One new variable, 383 → 384 (net; see below). `spacing/56` (Primitives) — the
scale ran 40, 48, 64, so the XLarge height had been typed onto the Figma frame
as a raw number that no export could see. Now bound on all 35 XLarge variants
and covered by `verify-geometry.mjs`.

Figma sync state: names `944350191`, 384 variables.

### Fixed — small `success` buttons rendered permanently pre-hovered

`Success` at Small bound `surface/success-strong` on Default and Focus, where
the other eighteen Success variants bound `surface/success`. It resolved to
`success/700` — the same value as `surface/success/hover` — so the two states
were indistinguishable and hovering a small success button did nothing.

Only reachable in Figma, so no released version shipped it; recorded because the
variant is new in this release and the fix is why `success` is uniform across
all four sizes. `surface/success-strong` was the only `surface/*-strong` in the
whole Interface collection and has been removed (385 → 384).

### Fixed — the XLarge label was a detached text style

Its font size had been typed in by hand, which drops the Figma text style
silently. The label carried no style at all, so it sat outside the type ramp and
did not respond to breakpoint. Reattached to `Body/Large Emphasis`; line height
moves 28 → 32, which shifts nothing visually inside a fixed 56px button.

Neither of these was reachable by any gate — text styles are not variables, and
a one-off role token is a legal alias. Both surfaced from binding **counts**
disagreeing, and that heuristic is now written down in `AGENTS.md`.

### Added — a height test

`Button` gained a story asserting the rendered box is 32 / 40 / 48 / 56 across
all four sizes, and the icon-geometry story now covers `xl`.

## 0.7.0 — 2026-08-06

A 14px icon rung, for the small Button. Minor rather than patch: it is breaking,
and pre-1.0 this repo carries breaking changes in the minor as 0.4.0 and 0.6.0
did.

### Breaking — `<Icon size="xs" />` is now 14px, was 12px

**This raises no type error.** `xs` is still a valid rung; it means something
else. Nothing in your build will fail — icons that asked for `xs` simply render
2px larger. If you meant 12, ask for **`2xs`**.

The `icon-size` ladder gained a rung and shifted at the bottom:

| Rung  | Before | After  |
| ----- | ------ | ------ |
| `2xs` | —      | **12** |
| `xs`  | 12     | **14** |
| `sm`  | 16     | 16     |
| `md`  | 20     | 20     |
| `lg`  | 24     | 24     |
| `xl`  | 32     | 32     |

It could not simply be appended. A ladder in this system is **indexed by value**
— that is what lets you order the rungs without looking up what they mean — and
14 belongs between 12 and 16. A seventh out-of-order name (`xs-plus`) would have
preserved every binding and destroyed the property that makes the ladder
readable. `2xs` is not a new convention: `radius/2xs` already existed.

### Changed — the small Button's icon is 14px, was 16px

The reason for all of the above. Small's label is 14px, and a 16px icon
out-weighted the text it was meant to sit beside. **Medium (20) and Large (24)
are unchanged** — their icons run ahead of their labels (20 vs 16, 24 vs 18) and
read correctly, because at those sizes an icon has room to carry detail.

Button heights are untouched: 32 / 40 / 48.

`Icon Button` Small moves to 14px too, so the two Button families agree at every
size. Its box is unchanged at 32 / 40 / 48.

### Tokens

Two new variables, 381 → 383. `spacing/14` (Primitives) and the reshuffled
`icon-size` rungs (Semantics). `spacing/14` rather than the existing `scale/14`
because `scale/*` is the dimensionless ramp radius and border-width draw from,
while the whole `icon-size` ladder aliases `spacing/*`.

Figma sync state: names `4048145791`, 383 variables. The Figma `Icon` component
gained a `Size=14` variant, and all 25 `Size=Small` Button variants were rebound.

### Fixed — the mini Avatar stays at 12px

`avatar.css` was the only other consumer of `--icon-size-xs` and moved to
`--icon-size-2xs`. Left alone it would have silently grown to 14 inside a 24px
avatar. Found by grep; no gate would have caught it.

### Added — the first test that measures icon geometry

`Button` gained a story asserting the rendered icon box is 14 / 20 / 24 across
sm / md / lg, and that each still centres against its label to within 0.5px.
Before this the suite asserted hover, focus, press and prop leakage, and not one
pixel of icon geometry — so this change had no coverage in either direction.

## 0.6.1 — 2026-08-05

### Fixed — `.ion-icon` had no stylesheet

`Icon` has always emitted an `.ion-icon` class and nothing ever styled it. New
[`icon.css`](src/styles/icon.css) supplies the rule that was missing:

```css
.ion-icon {
  display: inline-block;
  vertical-align: middle;
}
```

An `<svg>` is inline-level and replaced, so when it shares a line box with
anything else it sits on the text baseline and the font's descender space opens
underneath it — the icon reads high and its box grows taller than the icon.
Every slot in this system hid that, because `.ion-button__icon-start`,
`.ion-menu__icon`, `.ion-input__icon-start` and the rest are flex or grid
containers, and a flex/grid item is blockified. Measured: a direct icon, an icon
in an `inline-grid` swap wrapper, and an icon in a `display: block` wrapper all
centre to within 0.00px of the label.

So alignment was correct as a side effect of the container, not because the icon
defended itself. It failed once the icon stopped being alone on its line: with
one text node beside it inside a wrapper, the icon measured 3px above the label
centre and the button grew from 40px to 46px. Consumers nest icons inside their
own wrappers routinely — swap and crossfade animations do it by construction —
so "the parent is always a flex container" was not an invariant to rely on.

`inline-block` rather than `block`, which is what most resets reach for:
`display: block` forces an icon used mid-sentence onto its own line (measured, a
600px paragraph went 2 lines to 3) and made the failing case worse — 12px off, a
48px button. Both declarations are inert wherever it already worked, since a
flex or grid item is blockified regardless of the `display` it was given and
`vertical-align` does not apply to one.

**Scope.** The rule matches `.ion-icon`, which only exists on SVGs rendered
through `<Icon as={...} />`. Icons passed as raw components — `startIcon={<Copy
/>}` — carry no class and are unaffected; sizing still reaches them because the
component rules match on descendant `svg`.

No visual change is expected in any component. All 12 icon slots — Button,
Menu icon and check, Input start and end, NavItem, Tabs, Badge, Select,
Table, Checkbox, Header toggle, Avatar — measured identical host height and
icon offset before and after.

**Not done:** an optical nudge. Icons centre on the line box while text is read
on its cap-height band, so the two centres differ. Measured from rendered pixels
against a descender-free label at Medium, the gap is 0.31px — below a device
pixel at 1x, and smaller than the variation between individual Lucide glyphs.

## 0.6.0 — 2026-08-03

A Figma re-export and a rebuilt `Header`. Colour, shadow and typography values
moved, so **every component renders slightly differently even where its code did
not change** — that is the token layer working, not drift.

### Changed — `Header`, rebuilt for four device variants

Figma now ships Desktop, Tablet, Mobile-Closed and Mobile-Open. Those are two
axes, not one, and they are modelled differently because they are known by
different people:

- **Breakpoint stays a media query.** It is the one variant axis the browser
  already knows the answer to. Unchanged from 0.5.0.
- **Open/closed is new, and it is a prop:** `open`, `defaultOpen`,
  `onOpenChange`, plus `menuLabel` for the toggle's accessible name.

```tsx
<Header
  brand={<Logo size="sm" wordmark="vector" />}
  center={navItems}
  end={actions}
  onOpenChange={(open) => console.log(open)}
/>
```

`center` and `end` are rendered **once**. Above 896px they sit inline in the bar;
below it the same elements become the dropped Menu-Container. They are not
duplicated per breakpoint, so a nav link appears once in the accessibility tree
and slot state survives a resize.

#### Breaking, in ways that will not raise a type error

1. **DOM structure.** `.ion-header__center` and `.ion-header__end` are now nested
   inside a new `.ion-header__menu` wrapper (`display: contents` above 896px).
   Custom CSS using a child combinator from `.ion-header` no longer matches.
2. **`Header` is now a client component.** It carries `'use client'` because the
   menu is stateful. It still works inside a Server Component — it becomes a
   client boundary rather than an error — but it is no longer server-rendered.
3. **A toggle `<button>` is always in the DOM**, `display: none` above 896px.
   Snapshot tests and `getAllByRole('button')` counts will see it.
4. **The centre slot is no longer hidden on Tablet.** Figma's Tablet variant
   ships it populated; 0.5.0 collapsed it below 1216px, which was right for the
   old design and wrong for this one.
5. **Tablet geometry changed** — 56 tall with 8/24 padding, was 64 with 12/32.

Escape closes the menu while focus is inside the header. It is a disclosure, not
a modal: no focus trap, no scroll lock.

### Changed — tokens re-exported from Figma

Repo and Figma verified in sync: 381 variables, checksum `838923391`.

- **Colour.** `text/placeholder` [Dark] `neutral.500 → neutral.600`;
  `text/warning` [Light] `warning.700 → warning.600`; new `icon/placeholder`.
- **Shadow.** The `Raised` family's top inner shadow was a flat 25% at every
  size and is now a graduated ramp — `xs` 12%, `sm` 15%, `lg` 20%, `xl`
  unchanged, across both `Lifted` and `Flush`. This reaches `Button`,
  `Checkbox`, `Radio` and `Toggle` through `--ion-shadow-*` with no component
  code change: their bevels are softer and now scale with size.
- **Typography.** `.ion-text-h1` and `.ion-text-h2` move from the serif display
  face to the sans — **headings are no longer serif.** `.ion-text-caption` drops
  from medium to regular, and a `Caption Emphasis` style now pairs with it via
  the existing `.ion-text--emphasis` modifier.

### Fixed

- `icon/placeholder` advertised `var(--icon-disabled)` in Figma Dev Mode, copied
  from `icon/disabled`. CSS was always generated from the token path, so no
  value was ever wrong — only what Dev Mode displayed.
- Every text style bound its family and weight straight to Primitives rather than
  the Semantics aliases. Nothing rendered differently, and nothing would have
  until a second brand mode existed, at which point the whole type ramp would
  have stopped re-branding at once. 38 fields rebound; `build-typography.mjs`
  now warns on any that return.

## 0.5.0 — 2026-08-01

One new component. Nothing existing moved, so this is additive for every
consumer — no import changes, no token changes, no CSS that touches another
component's selectors.

### Added — `FullCard`

The full-bleed case study band from Figma `Full Card` (592:857): a text column
beside a framed media panel, split down the middle and mirrored by `alignment`.

```tsx
import { FullCard, Badge, Button } from 'ionbase-ui';

<FullCard
  alignment="right"
  eyebrow={<Badge>Case Study</Badge>}
  headline="AI Native Clinical Copilot"
  description="…"
  actions={
    <Button variant="secondary" size="sm">
      Explore
    </Button>
  }
  media={<img src="…" alt="" />}
/>;
```

`headline` is the only required prop. It is a server component — no
`'use client'` — since nothing in it is stateful; the interactive parts arrive
through `actions` and carry their own boundary.

Stylesheet at `ionbase-ui/styles/full-card.css`, already included in
`ionbase-ui/styles`.

**Figma's `Show Eyebrow` / `Show Description` / `Show Actions` booleans are not
in the API.** A Figma instance always holds every layer and needs a switch to
hide one; React does not, so an absent prop is the switch — the same call Badge
made with `Show Dot`. Carrying both would let `showActions` and `actions`
disagree.

**Size is a media query, not a prop**, as with Header's Device axis. The split
holds from 1080 and stacks below it, media above content in _both_ alignments —
`alignment` names a horizontal side and stops meaning anything once there is one
column, so it does not get to decide the vertical order too. Content stays first
in the DOM at every width; the mirror and the stack are both CSS reversals, so
reading and focus order never change.

The even split has a floor: below roughly 1190 the media column holds at the
panel plus a 48px gutter and the text column absorbs the difference. A paragraph
reflows; a panel with no gutter is a different design.

**Four things in Figma were not reproduced literally**, each recorded in
[full-card.css](src/styles/full-card.css): the 366px height falls out of the box
model so it is not restated; the body gap reads 9px, which is not on the spacing
ladder, so it is `spacing/8`; and the `Alignment=Left` variant puts its media
rule on the card's outer edge and hard-codes a 48px padding where
`Alignment=Right` binds `spacing/48`. The last two read as mirroring oversights
and are worth fixing in the Figma file — the two variants disagree with each
other today.

## 0.4.0 — 2026-07-31

A Figma re-sync and the first motion layer. No API changes — every change here
is visual or additive, so no code needs to move.

### Added — motion custom properties

A shared ladder of durations and easings, new at `ionbase-ui/tokens`:

```css
--ion-duration-fast: 120ms; /* press and release */
--ion-duration-base: 200ms; /* any state colour change — the default */
--ion-duration-slow: 320ms; /* things that travel or resize */

--ion-ease-out: cubic-bezier(0.2, 0, 0, 1); /* entering a state — the default */
--ion-ease-in: cubic-bezier(0.4, 0, 1, 1); /* leaving: dismiss, collapse */
--ion-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* two-way travel */
--ion-ease-linear: linear; /* continuous progress only */
```

Also reachable individually at `ionbase-ui/tokens/motion.css`. The `--ion-`
prefix means the same thing it does for `--ion-shadow-*`: generated from
committed values, not from the Figma variable pipeline.

Source is `packages/tokens/motion.json`, which is repo-owned. See
[docs/motion-system.md](../../docs/motion-system.md).

### Changed — transitions are slower and no longer symmetric

Every component stylesheet used a hardcoded
`150ms cubic-bezier(0.4, 0, 0.2, 1)` — 16 occurrences across 12 files. Both
halves were wrong for a state change, and both are fixed:

- **150ms → 200ms.** Short enough that a colour change read as a jump.
- **`ease-in-out` → `ease-out`.** The old curve is symmetric, so it has a slow
  _start_; a hover colour appeared to arrive late and then snap. The larger of
  the two fixes.

Three deliberate exceptions: Button's press drops to `fast`, the Toggle knob
keeps `ease-in-out` (the only element that travels the same path both ways),
and Scroll Progress's panel stays on `base` rather than `slow`.

`prefers-reduced-motion` is unaffected — the existing global override still
neutralises all of it.

### Changed — Button, re-synced from Figma

- **Primary Neutral** now has a visible hover. It resolves
  `--surface-inverse-subtle`; the stylesheet was repeating `--surface-inverse`,
  so the variant did not change on hover at all.
- **Secondary** no longer moves its border on hover. Figma binds `border/strong`
  on Default, Hover and Focus alike.
- **Secondary** pressed now steps to `--border-stronger`, which is where that
  step actually belongs.

### Changed — token values re-exported from Figma

- `--surface-inverse` (light) `#131923` → `#1d2735`. Dark is unchanged. Affects
  Button Primary Neutral, Toggle `neutral`, and anything else on an inverse
  surface.
- The top inner-shadow alpha on all eight `Raised/*` elevations is normalised to
  25% — `--ion-shadow-raised-lifted-*` and `--ion-shadow-raised-flush-*` at xs,
  sm, lg and xl were 40/30/40/35%. `Inset/*` and `Focus/*` are unchanged.

Variable names and count are unchanged (380, checksum `3840062063`), so nothing
resolves differently by name.

## 0.3.0 — 2026-07-31

Correctness, accessibility, and API/packaging cleanup since the published
0.2.0 dist. Breaking changes are called out first.

### Breaking — JS tokens leave the main barrel

`export * as tokens from './tokens/index.js'` is gone from the root entry.
Importing a single component no longer pulls ~48KB of token JSON into bundlers
that do not tree-shake namespace re-exports.

```ts
// before
import { tokens } from 'ionbase-ui';

// after
import { semantic, tokens } from 'ionbase-ui/tokens-js';
```

CSS custom properties are unchanged at `ionbase-ui/tokens` / `ionbase-ui/styles`.

### Breaking — Input / Select `className` always lands on the control

`className` used to move: on the control box when there was no label/helper, on
the `.ion-field` wrapper when there was. It now always targets `.ion-input` /
`.ion-select`. Style the wrapper with the new `wrapperClassName` prop.

### Breaking — AvatarGroup no longer force-overwrites children

Group `size` / `shape` only fill in when a child `Avatar` omitted them. Explicit
child props win. Non-Avatar children are left alone (no invalid DOM props).

### Changed — `isDisabled` is the library-wide disabled prop

Canonical name is React Aria's `isDisabled`. Checkbox, Toggle, Radio and
MenuItem join Button, NavItem, Select, Input and RadioGroup. Native `disabled`
remains accepted as a `@deprecated` alias for one minor; when both are passed,
`isDisabled` wins.

### Added — accessibility fixes

- Table: `<th>` gets `scope` (inferred `col`/`row`, overridable); scroll
  container is a named, focusable `role="region"`; row `selection` requires a
  label and renders `<th scope="col">` in thead (select-all).
- Global `prefers-reduced-motion` and `forced-colors` handling in the stylesheet.
- Disabled NavItem links strip activation handlers and leave the tab order.
- Avatar falls through to initials/icon when `src` errors.

### Added — `ARIA_TAB_LIST_NON_DOM_PROPS`

Same typed omit list as Button/Input. Tabs can spread HTML attributes onto the
root without leaking collection/selection props to the DOM.

### Added — `'use client'` on modules that need it

No directive shipped in 0.2.0, so every RSC consumer had to shim imports.
Per-module now: client-only APIs get the directive; `Badge`, `Divider`,
`Header`, `Logo`, `Menu` and `Icon` stay server-renderable. **Avatar and Table
are client modules** after the a11y work (`useState` / context).

`scripts/verify-client-boundaries.mjs` runs as part of the build.

### Fixed — `Tabs` ignored `orientation` for keyboard navigation

`orientation` was destructured out before the hooks saw it, so React Aria
always assumed horizontal. Vertical is keyboard-, ARIA- and layout-complete;
decoration is still horizontal pending Figma.

### Fixed — `Radio` discarded the consumer's `onChange` when the group was controlled

Both controlled and uncontrolled branches now chain the caller's handler.

### Fixed — `Input` silently dropped unrecognised props

Rest props spread onto the `<input>`, with React Aria non-DOM props stripped
first. `InputProps` widens to plain `<input>` attributes.

## 0.2.0 — 2026-07-31

### Breaking — the package no longer loads any webfonts

`dist/styles/index.css` opened with a Google Fonts `@import`. It has been
removed. **Apps relying on that implicit load must now load the fonts
themselves**, or fall back to the generic families (see below).

This is a fix as much as a break: the implicit load already failed for anyone
using a bundler, which is most consumers. CSS requires `@import` to precede all
other rules, and a bundler that concatenates stylesheets puts other rules ahead
of it, so the browser dropped it silently. Confirmed in a Next.js 16 /
Turbopack app — the built bundle contained no `@import` and no
`fonts.googleapis` string at all, so no font ever loaded.

Font delivery belongs to the consuming app, which knows whether it wants
`next/font`, Fontsource, self-hosted `@font-face` or a corporate CDN. It is
also not a design system's place to open a render-blocking request to a
third party, bypass `next/font`, and hand visitor IPs to Google on the
consumer's behalf.

**Before** — fonts arrived (or appeared to) with the stylesheet:

```tsx
import 'ionbase-ui/styles';
```

**After** — load the three families your UI actually uses. With `next/font`:

```tsx
// app/layout.tsx
import { Host_Grotesk, Merriweather, STIX_Two_Text } from 'next/font/google';
import 'ionbase-ui/styles';
import './ionbase-fonts.css'; // must come after, so it wins

const sans = Host_Grotesk({ subsets: ['latin'], variable: '--app-sans' });
const display = STIX_Two_Text({
  subsets: ['latin'],
  variable: '--app-display',
});
const serif = Merriweather({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--app-serif',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${serif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

```css
/* ionbase-fonts.css */
:root {
  --font-family-sans: var(--app-sans), system-ui, sans-serif;
  --font-family-serif-display: var(--app-display), Georgia, serif;
  --font-family-serif: var(--app-serif), Georgia, serif;
}
```

Self-hosting needs no token override at all — the tokens already name these
families, so a matching `@font-face` is picked up automatically. Full guidance,
including the weights each family needs, is in the README under "Fonts".

### Fixed — font tokens carry generic fallbacks

Font tokens named bare families:

```css
--font-family-sans: Host Grotesk;
```

So when the webfonts did not load, the families resolved to nothing and text
fell through to the browser default — a serif. The symptom read as a token bug
rather than a font-loading one, which is what made it slow to diagnose. Tokens
now end in the right generic:

```css
--font-family-sans:
  'Host Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-family-serif: Merriweather, Georgia, 'Times New Roman', serif;
--font-family-serif-display: 'STIX Two Text', Georgia, 'Times New Roman', serif;
--font-family-mono:
  'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
```

An app that loads no fonts now renders in the platform UI font with serif
headings: still wrong, but wrong in the right category and legible.

The stacks live in `token-overrides.json`, not in Figma — a Figma font variable
holds one real family it has to be able to render. The CSS build fails if any
family lacks a stack, so a new font in Figma cannot ship bare.

## 0.1.1

### Fixed — React Aria props no longer reach the DOM

`Button` spread its leftover props onto `<button>`, so `onPress` and the rest of
the React Aria surface hit the DOM. React logged "Unknown event handler property
`onPress`. It will be ignored." on every render. Handlers always fired —
`useButton` receives the full props object — so the leak was the only defect.

Dropped from the spread: `onPress`, `onPressStart`, `onPressEnd`,
`onPressChange`, `onPressUp`, `onFocusChange`, `excludeFromTabOrder`,
`preventFocusOnPress`, `elementType`, `href`, `target`, `rel`. The list is
derived from `AriaButtonProps` at compile time rather than hand-maintained.

### Removed — the `./src/*` export subpath

It could not resolve for anyone installing from npm, because `src/` is not in
`files`. Nothing that worked at 0.1.0 stopped working.

## 0.1.0

First release.
