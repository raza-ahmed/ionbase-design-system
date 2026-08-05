# ionbase-icons

The IonBase icon set. One React component per icon, tree-shakeable, and
**optional** — `ionbase-ui` does not depend on it and never will.

```bash
npm install ionbase-icons
```

```tsx
import { Copy } from 'ionbase-icons/icons/copy';
import { Button, Icon } from 'ionbase-ui';

<Button startIcon={<Icon as={Copy} />}>Copy email</Button>;
```

## Why this is a separate package and not a re-split

[`AGENTS.md`](../../AGENTS.md) says the four original packages (`tokens`,
`styles`, `react`, `icons`) were collapsed into one and must not be re-split.
That rule stands, and this does not breach it — the reason it was written was
that all four moved in **lockstep**, so the split bought four manifests and no
independent versioning.

This package has no version relationship to `ionbase-ui`. Nothing in
`ionbase-ui` imports it, a consumer who never installs it loses nothing, and
either can release without the other. That is the thing the old split could not
say.

Icons stay out of `ionbase-ui` for the reason in
[`Icon.tsx`](../ionbase-ui/src/Icon.tsx): a barrel of a thousand-plus icons
defeats tree-shaking in several bundlers, and pinning an icon library forces it
on every consumer. `Icon` still takes the icon as a prop, so lucide, heroicons
and your own SVGs all work exactly as before.

## Import one icon, not the barrel

```tsx
import { Copy } from 'ionbase-icons/icons/copy'; // preferred
import { Copy } from 'ionbase-icons'; // works, but relies on the bundler
```

Both resolve to one module. The subpath does it by construction; the barrel does
it only because the manifest sets `sideEffects: false`, and that is exactly the
assumption that fails quietly in the bundlers this package exists to avoid.

## `svg/` is the source of truth

Everything under `src/` is generated from `svg/` and is gitignored — never edit
it, and never commit it. See [`svg/README.md`](svg/README.md) for the naming
rules and what the generator rewrites.

```bash
pnpm --filter ionbase-icons icons:audit      # inspect the set BEFORE generating
pnpm --filter ionbase-icons build            # generate + compile
```

Run the audit first. It reports viewBox consistency, stroke-vs-fill, stroke
weight spread and name collisions — the things that are unsafe to assume across
a set this size and expensive to correct once they are components.

## Licensing

If any icon is derived from another set, its licence travels with it. **Lucide
is ISC**, which permits use, modification, renaming and redistribution
(commercial included) on one condition: the copyright and permission notice must
appear in all copies. Lucide's own `LICENSE` additionally carries an **MIT**
notice from Feather (Cole Bemis) covering ~110 derived icons.

So a set that includes anything Lucide-derived must ship Lucide's `LICENSE`
verbatim alongside this package's own, and credit it here. Copyright is not
trademark: do not brand the package in a way that implies Lucide endorsement.

If every icon here is original artwork, none of that applies and this section
should be deleted rather than left standing as decoration.
