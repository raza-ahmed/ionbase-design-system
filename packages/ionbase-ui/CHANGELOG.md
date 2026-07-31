# Changelog

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
