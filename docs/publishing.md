# Publishing IonBase to npm

Log in once, bump the version, build, publish. No CI tokens required.

## One package

The whole design system ships as **`ionbase-ui`** — unscoped, same shape as
`beacon-ui`. Components, stylesheets and design tokens are all inside it.

There used to be four packages (`tokens`, `styles`, `react`, `icons`). They were
consolidated before the first release: nothing had shipped to npm yet, and
`sync-version` had always moved all four in lockstep, so the split was buying
four manifests and a cross-package CSS import with no independent versioning to
show for it.

`packages/tokens` still exists and is **private**. It holds the Figma export,
the generators and the five token gates; its output is copied into
`packages/ionbase-ui` at build time by `scripts/sync-tokens.mjs`. It is never
published, and it must keep `"private": true` — publishing it would put a
second, competing source of token values on npm.

## First publish (and every publish after)

### 1. Log in to npm (once per machine)

```bash
npm login
npm whoami
```

`ionbase-ui` is unscoped, so no organisation membership is required. The
`ionbase-ui` org exists and owning it does no harm, but nothing depends on it.

### 2. Set the version

```bash
pnpm sync:version 0.1.0
```

### 3. Build and publish

```bash
pnpm publish:package
```

That runs `pnpm build` — which runs the token pipeline first, then syncs its
output into the package — and then publishes with `--access public`.

Check it landed: https://www.npmjs.com/package/ionbase-ui

### 4. Commit and tag

```bash
git add packages/ionbase-ui/package.json
git commit -m "chore: release 0.1.0"
git push
git tag v0.1.0 && git push origin v0.1.0
```

## Verify from outside the monorepo

Worth doing on a first release, because a broken entry point is invisible to
lint, typecheck and format:

```bash
cd $(mktemp -d) && npm init -y && npm i ionbase-ui react react-dom
node -e "import('ionbase-ui').then(m => console.log(Object.keys(m)))"
```

## Using it in a product

```bash
npm i ionbase-ui
```

```tsx
import 'ionbase-ui/styles';
import { Button } from 'ionbase-ui';
```

Icons are not bundled — `Icon` takes the icon as a prop, so bring whichever
library you like:

```tsx
import { Icon } from 'ionbase-ui';
import { Plus } from 'lucide-react';

<Icon as={Plus} size="sm" />;
```

## If publish fails

| Error                          | Fix                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Not logged in / 401            | `npm login` again                                                                        |
| Package name already taken     | Someone else owns `ionbase-ui`; rename or transfer                                       |
| `workspace:*` left in tarball  | Always publish with `pnpm publish`, not raw `npm publish` from a copied folder           |
| Tarball has no `dist/index.js` | `tsc` skipped emit against a stale tsbuildinfo — `copy-css.mjs` now fails loudly on this |
| Git tree not clean             | `publish:package` has no `--no-git-checks`; commit first                                 |
