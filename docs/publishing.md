# Publishing IonBase to npm

Same idea as Beacon: log in once, bump the version, build, publish. No CI tokens required.

## Org vs packages

You created the **organisation** `ionbase-ui` (`ionbase` was taken). That is enough.

Do **not** create a package named `ionbase-ui` or `@ionbase-ui` by hand. Publishing creates:

- `@ionbase-ui/tokens`
- `@ionbase-ui/styles`
- `@ionbase-ui/react`
- `@ionbase-ui/icons`

## First publish (and every publish after)

### 1. Log in to npm (once per machine)

```bash
npm login
```

Use the npm account that owns the `ionbase-ui` org. Confirm:

```bash
npm whoami
```

### 2. Set the version on all four packages

```bash
pnpm sync:version 0.1.0
```

Later releases: `0.1.1`, `0.2.0`, etc. Same command.

### 3. Build and publish

```bash
pnpm publish:packages
```

That runs `pnpm build`, then publishes in order: tokens → styles → icons → react (`--access public`).

You will be prompted to confirm each package. After it finishes, check:

- https://www.npmjs.com/package/@ionbase-ui/react
- https://www.npmjs.com/package/@ionbase-ui/styles
- https://www.npmjs.com/package/@ionbase-ui/tokens
- https://www.npmjs.com/package/@ionbase-ui/icons

### 4. Commit the version bump

```bash
git add packages/*/package.json
git commit -m "chore: release 0.1.0"
git push
```

Optional: `git tag v0.1.0 && git push --tags`

## Using it in a product

```bash
pnpm add @ionbase-ui/react @ionbase-ui/styles @ionbase-ui/icons lucide-react
```

```tsx
import '@ionbase-ui/styles/css';
import { Button } from '@ionbase-ui/react';
```

## One-package publish (rare)

```bash
pnpm build
pnpm publish:tokens    # or :styles :icons :react
```

## If publish fails

| Error                         | Fix                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Not logged in / 401           | `npm login` again                                                               |
| 403 / not allowed for scope   | Your user must be a member of the `ionbase-ui` org with publish rights          |
| Package name already taken    | Someone else owns that name; rename or transfer                                 |
| `workspace:*` left in tarball | Always publish with `pnpm publish` (not raw `npm publish` from a copied folder) |
