# Publishing IonBase to npm

Log in once, bump the version, build, publish. No CI tokens required.

## Two published packages, and why that is not a re-split

The design system ships as **`ionbase-ui`** — unscoped, same shape as
`beacon-ui`. Components, stylesheets and design tokens are all inside it.

There used to be four packages (`tokens`, `styles`, `react`, `icons`). They were
consolidated before the first release: nothing had shipped to npm yet, and
`sync-version` had always moved all four in lockstep, so the split was buying
four manifests and a cross-package CSS import with no independent versioning to
show for it.

**`ionbase-icons` is the second published package, and it does not reopen that
decision.** The test the old split failed was lockstep: four manifests that
never moved independently. This one has no version relationship to `ionbase-ui`,
nothing in `ionbase-ui` imports it, and a consumer who never installs it loses
nothing — `Icon` still takes any SVG component as a prop. Release them in either
order, at unrelated versions.

It is separate rather than folded in for the reason in `Icon.tsx`: a barrel of a
thousand-plus icons defeats tree-shaking in several bundlers, and pinning an
icon set would force it on every consumer of the components. Hence per-icon
subpaths (`ionbase-icons/icons/copy`) and `sideEffects: false`.

Its artwork is derived from Lucide (ISC), so `packages/ionbase-icons/LICENSE`
carries Lucide's notice and Feather's, and is listed in the manifest's `files`
so it ships in the tarball. That is a condition of the ISC grant, not a
courtesy.

`packages/tokens` still exists and is **private**. It holds the Figma export,
the generators and the five token gates; its output is copied into
`packages/ionbase-ui` at build time by `scripts/sync-tokens.mjs`. It is never
published, and it must keep `"private": true` — publishing it would put a
second, competing source of token values on npm.

## Releasing

The version is set in the PR that changes the package: its `package.json`
version and its `CHANGELOG.md` entry land together. So `main` is always
releasable at the version it says, and a release is publishing a commit that
is already there. Nothing is committed after it, except the tag.

### 1. Log in to npm (once per machine)

```bash
npm login
npm whoami
```

`ionbase-ui` is unscoped, so no organisation membership is required.

### 2. Check `main`

```bash
git checkout main && git pull --ff-only
pnpm build
pnpm release:check
```

`release:check` (`scripts/verify-release.mjs`) is everything but the upload.
It checks:

- the tree is clean, on `main`, level with `origin`;
- the version is not on npm yet, and is the changelog's top entry;
- the tarball, packed the way `pnpm publish` packs it, has no `workspace:`
  range;
- installed into an empty project outside the monorepo, every export
  resolves to a real file, the package runs in Node and server-renders
  Button, and the patterns' worked examples type-check against its types.

Lint, typecheck and the stories prove the code; this proves the tarball. It
ends by printing the next three commands.

### 3. Publish

```bash
pnpm --filter ionbase-ui publish --access public
```

If npm asks for a one-time password and fails with `EOTP`, add
`--otp <code>`. Check it landed: `npm view ionbase-ui version`.

### 4. Tag it

```bash
git tag v0.138.0 && git push origin v0.138.0
```

Tags stopped at v0.74.0: the releases after it, up to 0.138.0, were
published untagged.

`pnpm sync:version <semver>` still exists, for a version set outside a PR.

## Using it in a product

```bash
npm i ionbase-ui
```

```tsx
import 'ionbase-ui/styles';
import { Button } from 'ionbase-ui';
```

Icons are not bundled into `ionbase-ui` — `Icon` takes the icon as a prop, so
bring whichever library you like:

```tsx
import { Icon } from 'ionbase-ui';
import { Plus } from 'lucide-react';

<Icon as={Plus} size="sm" />;
```

Or use `ionbase-icons`, which is optional and versioned independently. Import
the per-icon subpath rather than the barrel:

```tsx
import { Copy } from 'ionbase-icons/icons/copy';

<Icon as={Copy} size="sm" />;
```

## If publish fails

| Error                          | Fix                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Not logged in / 401            | `npm login` again                                                                        |
| Package name already taken     | Someone else owns `ionbase-ui`; rename or transfer                                       |
| `workspace:*` left in tarball  | Always publish with `pnpm publish`, not raw `npm publish` from a copied folder           |
| Tarball has no `dist/index.js` | `tsc` skipped emit against a stale tsbuildinfo — `copy-css.mjs` now fails loudly on this |
| Git tree not clean             | `publish:package` has no `--no-git-checks`; commit first                                 |
