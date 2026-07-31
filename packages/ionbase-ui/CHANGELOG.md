# Changelog

## Unreleased

Four correctness fixes found auditing the published 0.2.0 dist. No breaking
changes; the `InputProps` and `TabsProps` changes are both widenings.

### Added — `'use client'` on the nine modules that need it

No directive shipped at all, so every React Server Components consumer — the
default in the Next.js App Router — had to hand-write a re-export shim before
the library could be imported.

The directive is per-module, not blanket. Nine components use client-only React
APIs and carry it; **`Avatar`, `Badge`, `Divider`, `Header`, `Logo`, `Menu`,
`Table` and `Icon` stay renderable from a Server Component**, because
`forwardRef` and `memo` do exist in React's server build. A page using only
those ships no client JavaScript for them. Importing from the root entry works
either way — the barrel re-exports both kinds and the bundler resolves per
module.

`scripts/verify-client-boundaries.mjs` now runs as part of the build. It
derives which modules need the directive from what they import, and fails both
when one is missing and when the build drops it from `dist/`.

### Fixed — `Tabs` ignored `orientation` for keyboard navigation

`orientation` was destructured out before the rest of the props reached
`useTabListState` / `useTabList`, so React Aria always assumed horizontal: a
vertical track kept left/right arrow keys and announced
`aria-orientation="horizontal"`.

`TabsProps['orientation']` widens from `'horizontal'` to
`'horizontal' | 'vertical'`, and `.ion-tabs__track--vertical` now stacks the
track. Vertical is keyboard-, ARIA- and layout-complete, but still wears the
horizontal _decoration_ — which edge the underline moves to is a Figma
decision, not one to invent here.

### Fixed — `Radio` discarded the consumer's `onChange` when the group was controlled

The controlled branch replaced the caller's handler where the uncontrolled
branch chained it, so `<Radio onChange={…}>` fired inside an uncontrolled
`RadioGroup` and was silently dead inside a controlled one. Both branches now
share one handler.

### Fixed — `Input` silently dropped unrecognised props

`Input` never built a rest object, so anything outside `AriaTextFieldProps`
never reached the `<input>`. It now spreads the rest, with React Aria's non-DOM
props stripped the same way `Button` strips them.

`InputProps` widens to accept plain `<input>` attributes — `title`, `list`,
`onClick`, `style` and so on. Without that the runtime change would have been
unusable, since the type refused the props it now forwards.

Note for anyone who hit this: `data-*` and `aria-*` attributes were **not**
affected. React Aria's own `filterDOMProps` already forwarded those. What was
lost was everything else.

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
