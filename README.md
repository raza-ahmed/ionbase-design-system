# IonBase Design System Monorepo

IonBase is a modern, high-performance design system monorepo built to deliver cohesive, accessible, and fast user interfaces. The workspace is powered by `pnpm workspaces` and `Turborepo` for efficient task execution and caching, utilizing strict TypeScript (ESM) and modern linting/formatting standards (ESLint flat config, Prettier) to ensure code consistency across all packages and applications.

**[Browse the components →](https://raza-ahmed.github.io/ionbase-design-system/)**
Storybook, published from `main` on every push.

## Using IonBase in a product

The whole system ships as one package, `ionbase-ui`:

```bash
pnpm add ionbase-ui
```

```tsx
import 'ionbase-ui/styles';
import { Button } from 'ionbase-ui';
```

Icons are not bundled — `Icon` takes the icon as a prop, so any SVG component
works and you pick the library:

```tsx
import { Icon } from 'ionbase-ui';
import { Plus } from 'lucide-react';

<Icon as={Plus} size="sm" />;
```

Install / theme / publish (same local `npm publish` flow as Beacon): [`docs/publishing.md`](docs/publishing.md).

## Getting started (this repo)

```bash
pnpm install
pnpm build      # also lint / typecheck / format
```

## Where things are documented

| If you want to…                             | Read                                                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| See the components running                  | [Storybook](https://raza-ahmed.github.io/ionbase-design-system/) — live, deployed from `main` by [`ci.yml`](.github/workflows/ci.yml)   |
| Install / publish the packages              | [`docs/publishing.md`](docs/publishing.md)                                                                                              |
| Change a design token                       | [`packages/tokens/README.md`](packages/tokens/README.md) — **start here**, the workflow has a Figma half that is not runnable from Node |
| Name a token                                | [`docs/variable-naming-spec.html`](docs/variable-naming-spec.html) — the grammar, and the validator that enforces it                    |
| Know which tokens exist and what they hold  | [`docs/token-architecture-v2.md`](docs/token-architecture-v2.md) — the full inventory, four collections, 381 variables                  |
| Understand why a rule is what it is         | [`docs/naming-decisions.md`](docs/naming-decisions.md) — dated decisions, newest first                                                  |
| Work on this repo, by hand or with an agent | [`AGENTS.md`](AGENTS.md) — the traps worth knowing before editing tokens. Vendor-neutral; tool-specific files are pointers to it        |

> **Architecture v2 is live.** Four collections — Primitives → Semantics →
> Interface, with brand modes in Semantics and light/dark in Interface, plus a
> parallel Breakpoint collection. 381 variables, in sync with Figma as of
> 3 Aug 2026 (checksum `838923391`). The inventory is in
> [`docs/token-architecture-v2.md`](docs/token-architecture-v2.md).

> **Tokens come from Figma, not from this repo.** File `gaLbGd0QNb1fUl6BjSpfBA`.
> Token names and values are changed in Figma and re-exported; editing the JSON
> by hand is reverted by the next export. The export, rename and verification
> scripts live in [`packages/tokens/`](packages/tokens) — `scripts/` runs in
> Node, [`figma/`](packages/tokens/figma) runs inside Figma.

## Folder Layout

```text
ionbase-design-system/
├── apps/
│   └── storybook/          # Storybook application workspace
├── packages/
│   ├── tokens/             # Token pipeline — PRIVATE, never published
│   │   ├── src/figma/      #   committed Figma export — the source of truth
│   │   ├── scripts/        #   Node: build, audit, verify
│   │   └── figma/          #   Plugin API scripts, run inside Figma
│   └── ionbase-ui/         # The ONLY published package (ionbase-ui)
│       ├── src/components/ #   React components
│       ├── src/styles/     #   component CSS; styles/tokens/ is generated
│       ├── src/Icon.tsx    #   icon wrapper — takes any SVG component
│       └── scripts/        #   sync-tokens, copy-css, verify-icons
├── docs/                   # Documentation workspace (@ionbase-ui/docs)
├── eslint.config.js        # ESLint flat config
├── .prettierrc             # Prettier configuration
├── tsconfig.base.json      # Base TypeScript strict config
├── tsconfig.json           # Root TypeScript config references
├── turbo.json              # Turborepo task pipeline configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
└── package.json            # Root monorepo package configuration
```
