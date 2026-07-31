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

That single import pulls in the design tokens, the typography (Host Grotesk,
Merriweather, Space Mono), and every component stylesheet. Dark mode is
`data-theme="dark"` on any ancestor — no separate import, no JS.

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
