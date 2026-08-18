# ionbase-ui

The IonBase Design System: accessible React components, their stylesheets, and
the design tokens they are built on — in one package.

```bash
npm i ionbase-ui
```

React 18 or 19 is a peer dependency.

**[Browse every component in Storybook →](https://raza-ahmed.github.io/ionbase-design-system/)**

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

Two families are used by the shipped components and type scale:

| Family            | Token                 | Weights       | Used by                                       |
| ----------------- | --------------------- | ------------- | --------------------------------------------- |
| **Host Grotesk**  | `--font-family-sans`  | 400, 500, 600 | Body, every component, most of the type scale |
| **STIX Two Text** | `--font-family-serif` | 700           | `.ion-text-editorial-*`                       |

Both are also used in italic where your content uses italic; none of the
components require it.

Three more families exist as tokens but are referenced by nothing in this
package — load them only if you use the variable yourself:

| Token                         | Family        | Note                                    |
| ----------------------------- | ------------- | --------------------------------------- |
| `--font-family-mono`          | Space Mono    | 400/700                                 |
| `--font-family-serif-display` | STIX Two Text | resolves to the same family as `-serif` |
| `--font-family-merriweather`  | Merriweather  | primitive only, held for a future brand |

**These two swap points are supported API.** `--font-family-sans` and
`--font-family-serif` are the intended place to put your own typefaces —
re-declare them after importing the stylesheet and the whole type scale
follows, because every text class references the token rather than a family
name. See [next/font](#nextfont) below for the shape of that override.

### If you skip this

Text degrades, it does not break. Every font token carries a generic fallback:

```css
--font-family-sans:
  'Host Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-family-serif: 'STIX Two Text', Georgia, 'Times New Roman', serif;
```

So an app that loads nothing renders in the platform UI font with serif
headings — wrong, but deliberately wrong in the right category, and legible.

### next/font

```tsx
// app/layout.tsx
import { Host_Grotesk, STIX_Two_Text } from 'next/font/google';
import 'ionbase-ui/styles';
import './ionbase-fonts.css';

const sans = Host_Grotesk({ subsets: ['latin'], variable: '--app-sans' });
const serif = STIX_Two_Text({ subsets: ['latin'], variable: '--app-serif' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

Both are variable fonts, so `next/font` covers their whole weight range without
a `weight` list.

Then point the IonBase tokens at them:

```css
/* ionbase-fonts.css — imported AFTER 'ionbase-ui/styles' so it wins */
:root {
  --font-family-sans: var(--app-sans), system-ui, sans-serif;
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
  src: url('/fonts/stix-two-text.woff2') format('woff2-variations');
  font-weight: 400 700;
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
`2xs` 12, `xs` 14, `sm` 16, `md` 20, `lg` 24, `xl` 32 — or takes any CSS length.
Omit it and the icon inherits the surrounding font size, which is what lets an
icon sit correctly inside a Button.

> **Changed in 0.7.0.** `xs` is now 14, not 12; the old 12 is `2xs`. A 14px rung
> was inserted for the small Button and the ladder is indexed by value, so the
> bottom shifted rather than gaining a seventh out-of-order name. `size="xs"`
> still type-checks — it just renders 2px larger — so this will not fail loudly.
> If you meant 12, ask for `2xs`.

## Entry points

| Import                        | What it is                                          |
| ----------------------------- | --------------------------------------------------- |
| `ionbase-ui`                  | Components, `Icon`, and the `tokens` object         |
| `ionbase-ui/styles`           | Everything: tokens + typography + components        |
| `ionbase-ui/styles/*`         | One component stylesheet, e.g. `button.css`         |
| `ionbase-ui/tokens`           | Token custom properties only, no component CSS      |
| `ionbase-ui/tokens/*`         | One token layer, e.g. `theme-dark.css`              |
| `ionbase-ui/meta/index`       | Component index — names, summaries, variants (12KB) |
| `ionbase-ui/meta`             | Every component's full contract in one file (180KB) |
| `ionbase-ui/meta/*`           | One component's contract, e.g. `Button.json`        |
| `ionbase-ui/eslint-plugin`    | Lint rules generated from the contracts             |
| `ionbase-ui/stylelint-config` | Token rules for your own CSS                        |

## Lint rules that ship with the system

```js
// eslint.config.js
import ionbase from 'ionbase-ui/eslint-plugin';
export default [ionbase.configs.recommended];
```

```js
// stylelint.config.js
export default { extends: ['ionbase-ui/stylelint-config'] };
```

| rule                        | catches                                         |
| --------------------------- | ----------------------------------------------- |
| `no-deprecated-props`       | `<Button disabled>` — autofixes to `isDisabled` |
| `no-known-contrast-failure` | prop combinations measured to fail WCAG AA      |
| `no-raw-style-values`       | `style={{ color: '#1a73e8', padding: 16 }}`     |
| `needs-accessible-name`     | icon-only controls announced as just "button"   |
| `one-primary-action`        | more than one primary Button in a Modal         |

The rules read their data from the component contracts, so they stay correct on
their own: when a contrast defect is fixed the measurement changes, the contract
loses the entry, and the rule stops firing.

Messages name the fix, not the principle — a raw `13px` reports that it is not
on the scale and that the neighbouring rungs are `var(--spacing-12)` and
`var(--spacing-14)`.

Use `ionbase.configs.warn` instead if you are adopting IonBase in an existing
app and want the same rules without failing the build. Both configs need peer
dependencies you may already have (`eslint`, `stylelint`,
`stylelint-declaration-strict-value`); all are optional, so nothing is installed
unless you opt in.

## Machine-readable component contracts

Every component ships a JSON contract describing not just its API but when to
use it, what to use instead, and what tends to go wrong:

```ts
import index from 'ionbase-ui/meta/index' with { type: 'json' };
import button from 'ionbase-ui/meta/Button.json' with { type: 'json' };
```

Each contract carries `summary`, `useWhen`, `useInstead`, `variants` with
per-value guidance, `slots`, `a11y`, `antiPatterns`, `deprecated`, the generated
`props` table, and the tokens its stylesheet consumes.

This exists because the thing consuming a design system is increasingly a coding
agent rather than a person reading documentation. **Start from
`ionbase-ui/meta/index`** — 12KB, every component with its variants — then load
the single contract you need. Loading all of them costs 180KB to answer a
question the index already answered.

Six components carry full intent today (`Button`, `Input`, `Select`, `Modal`,
`Table`, `Alert`). The rest ship the generated API plus their source
documentation, and are being filled in.

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
