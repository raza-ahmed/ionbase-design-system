# IonBase Design System Monorepo

IonBase is a modern, high-performance design system monorepo built to deliver cohesive, accessible, and fast user interfaces. The workspace is powered by `pnpm workspaces` and `Turborepo` for efficient task execution and caching, utilizing strict TypeScript (ESM) and modern linting/formatting standards (ESLint flat config, Prettier) to ensure code consistency across all packages and applications.

## Folder Layout

```text
ionbase-design-system/
├── apps/
│   └── storybook/          # Storybook application workspace
├── packages/
│   ├── tokens/             # Design tokens package (@ionbase/tokens)
│   ├── styles/             # Global/component style styles package (@ionbase/styles)
│   ├── react/              # React component library package (@ionbase/react)
│   └── icons/              # Icon set and asset package (@ionbase/icons)
├── docs/                   # Documentation workspace (@ionbase/docs)
├── eslint.config.js        # ESLint flat config
├── .prettierrc             # Prettier configuration
├── tsconfig.base.json      # Base TypeScript strict config
├── tsconfig.json           # Root TypeScript config references
├── turbo.json              # Turborepo task pipeline configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
└── package.json            # Root monorepo package configuration
```
