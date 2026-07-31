# IonBase Design System Monorepo

IonBase is a modern, high-performance design system monorepo built to deliver cohesive, accessible, and fast user interfaces. The workspace is powered by `pnpm workspaces` and `Turborepo` for efficient task execution and caching, utilizing strict TypeScript (ESM) and modern linting/formatting standards (ESLint flat config, Prettier) to ensure code consistency across all packages and applications.

## Using IonBase in a product

```bash
pnpm add @ionbase-ui/react @ionbase-ui/styles @ionbase-ui/icons lucide-react
```

```tsx
import '@ionbase-ui/styles/css';
import { Button } from '@ionbase-ui/react';
```

Install / theme / publish (same local `npm publish` flow as Beacon): [`docs/publishing.md`](docs/publishing.md).

## Getting started (this repo)

```bash
pnpm install
pnpm build      # also lint / typecheck / format
```

## Where things are documented

| If you want to…                            | Read                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Install / publish the packages             | [`docs/publishing.md`](docs/publishing.md)                                                                                              |
| Change a design token                      | [`packages/tokens/README.md`](packages/tokens/README.md) — **start here**, the workflow has a Figma half that is not runnable from Node |
| Name a token                               | [`docs/variable-naming-spec.html`](docs/variable-naming-spec.html) — the grammar, and the validator that enforces it                    |
| Know which tokens exist and what they hold | [`docs/token-architecture-v2.md`](docs/token-architecture-v2.md) — the full inventory, four collections, ~392 variables                 |
| Understand why a rule is what it is        | [`docs/naming-decisions.md`](docs/naming-decisions.md) — dated decisions, newest first                                                  |
| Work on this repo with an AI agent         | [`CLAUDE.md`](CLAUDE.md) — the traps worth knowing before editing tokens                                                                |

> **Architecture v2 is agreed but not yet migrated.** The collections are moving
> to Primitives → Semantics → Interface, with brand modes in Semantics and
> light/dark in Interface. The plan is in
> [`docs/token-architecture-v2.md`](docs/token-architecture-v2.md); what is in the
> file today is still v1. Docs first, then Figma, then code.

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
│   ├── tokens/             # Design tokens package (@ionbase-ui/tokens)
│   │   ├── src/figma/      #   committed Figma export — the source of truth
│   │   ├── scripts/        #   Node: build, audit, verify
│   │   └── figma/          #   Plugin API scripts, run inside Figma
│   ├── styles/             # Global/component style styles package (@ionbase-ui/styles)
│   ├── react/              # React component library package (@ionbase-ui/react)
│   └── icons/              # Icon set and asset package (@ionbase-ui/icons)
├── docs/                   # Documentation workspace (@ionbase-ui/docs)
├── eslint.config.js        # ESLint flat config
├── .prettierrc             # Prettier configuration
├── tsconfig.base.json      # Base TypeScript strict config
├── tsconfig.json           # Root TypeScript config references
├── turbo.json              # Turborepo task pipeline configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
└── package.json            # Root monorepo package configuration
```
