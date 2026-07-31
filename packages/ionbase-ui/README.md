# ionbase-ui

The IonBase Design System: accessible React components, their stylesheets, and
the design tokens they are built on — in one package.

```bash
npm i ionbase-ui
```

React 18 or 19 is a peer dependency.

## Usage

Import the stylesheet once, at your app entry:

```tsx
import 'ionbase-ui/styles';
import { Button } from 'ionbase-ui';

export function App() {
  return <Button intent="primary">Save</Button>;
}
```

That single import pulls in the design tokens, the type scale, and every
component stylesheet. Dark mode is `data-theme="dark"` on any ancestor — no
separate import, no JS.

It does **not** load any webfonts. That is a required extra step — see below.

## Fonts

**Loading the fonts is your app's job.** This package names the families in its
tokens but never fetches them: your framework knows its own font strategy
(`next/font`, Fontsource, self-hosted `@font-face`, a corporate CDN) and a
design system reaching out to a third-party host at CSS parse time is not a
decision it should make for you.

Three families are used by the shipped components and type scale:

| Family            | Token                         | Weights       | Used by                                       |
| ----------------- | ----------------------------- | ------------- | --------------------------------------------- |
| **Host Grotesk**  | `--font-family-sans`          | 400, 500, 600 | Body, every component, most of the type scale |
| **STIX Two Text** | `--font-family-serif-display` | 600           | `.ion-text-h1`, `.ion-text-h2`                |
| **Merriweather**  | `--font-family-serif`         | 700           | `.ion-text-editorial-*`                       |

All three are also used in italic where your content uses italic; none of the
components require it.

`--font-family-mono` (Space Mono, 400/700) also exists as a token, but nothing
in this package references it. Load it only if you use that variable yourself.

### If you skip this

Text degrades, it does not break. Every font token carries a generic fallback:

```css
--font-family-sans:
  'Host Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-family-serif: Merriweather, Georgia, 'Times New Roman', serif;
--font-family-serif-display: 'STIX Two Text', Georgia, 'Times New Roman', serif;
```

So an app that loads nothing renders in the platform UI font with serif
headings — wrong, but deliberately wrong in the right category, and legible.

### next/font

```tsx
// app/layout.tsx
import { Host_Grotesk, Merriweather, STIX_Two_Text } from 'next/font/google';
import 'ionbase-ui/styles';
import './ionbase-fonts.css';

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

Host Grotesk and STIX Two Text are variable fonts, so `next/font` covers their
whole weight range without a `weight` list. Merriweather is requested static
here because only 700 is used.

Then point the IonBase tokens at them:

```css
/* ionbase-fonts.css — imported AFTER 'ionbase-ui/styles' so it wins */
:root {
  --font-family-sans: var(--app-sans), system-ui, sans-serif;
  --font-family-serif-display: var(--app-display), Georgia, serif;
  --font-family-serif: var(--app-serif), Georgia, serif;
}
```

Import order matters: both files land at the same specificity, so the later one
wins. Override after, not before.

### Plain @font-face

Self-hosting works the same way — declare the faces, then leave the tokens
alone, because they already name these families:

```css
@font-face {
  font-family: 'Host Grotesk';
  src: url('/fonts/host-grotesk.woff2') format('woff2-variations');
  font-weight: 400 600;
  font-display: swap;
}

@font-face {
  font-family: 'STIX Two Text';
  src: url('/fonts/stix-two-text-600.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}

@font-face {
  font-family: 'Merriweather';
  src: url('/fonts/merriweather-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

No token override is needed in this case: `--font-family-sans` already begins
with `'Host Grotesk'`, so a matching `@font-face` is picked up automatically.

If you would rather use the Google CDN, put the `@import` or `<link>` in your
own entry — at the top of your own CSS, where `@import` ordering is yours to
control.

## Icons

The system does not ship an icon set. `Icon` takes the icon as a prop, so any
SVG component works — [lucide-react](https://lucide.dev), heroicons,
react-icons, or your own:

```tsx
import { Icon } from 'ionbase-ui';
import { Plus } from 'lucide-react';

<Icon as={Plus} size="sm" />
<Icon as={Plus} label="Add item" />   // meaningful icon, gets an a11y name
```

Omit `label` for decorative icons and they are hidden from assistive tech
instead of announced twice. `size` picks a rung on the `icon-size` ladder —
`xs` 12, `sm` 16, `md` 20, `lg` 24, `xl` 32 — or takes any CSS length. Omit it
and the icon inherits the surrounding font size, which is what lets an icon sit
correctly inside a Button.

## Entry points

| Import                | What it is                                     |
| --------------------- | ---------------------------------------------- |
| `ionbase-ui`          | Components, `Icon`, and the `tokens` object    |
| `ionbase-ui/styles`   | Everything: tokens + typography + components   |
| `ionbase-ui/styles/*` | One component stylesheet, e.g. `button.css`    |
| `ionbase-ui/tokens`   | Token custom properties only, no component CSS |
| `ionbase-ui/tokens/*` | One token layer, e.g. `theme-dark.css`         |

Token values are also available as JavaScript, as `var(--…)` references:

```ts
import { tokens } from 'ionbase-ui';
```

## Tokens come from Figma

Every token name and value in this package is generated from the IonBase Figma
file. They are not authored here and should not be edited here — see
[the repo](https://github.com/raza-ahmed/ionbase-design-system) for the
pipeline and its gates.

## License

MIT
