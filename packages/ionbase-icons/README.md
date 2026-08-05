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

The package is MIT. **The icon designs are derived from [Lucide](https://lucide.dev),
which is ISC**, and that notice travels with them — see [`LICENSE`](LICENSE),
which carries all three: this package's MIT, Lucide's ISC, and the MIT notice
from [Feather](https://feathericons.com) (Cole Bemis) that Lucide itself carries
for the subset derived from it.

This is not a formality. ISC permits use, modification, renaming and commercial
redistribution on exactly one condition — _"the above copyright notice and this
permission notice appear in all copies"_ — so shipping the notice is what makes
the rest of it lawful. `LICENSE` is listed in the manifest's `files` so it goes
out with the tarball rather than living only in the repo.

Provenance, measured rather than assumed: 1654 of these 1753 ids match Lucide's
taxonomy exactly, and effectively all of the remaining 99 are the same icons
under a different tokenisation (`arrow-down-a-z` for `ArrowDownAZ`, `clock-1`
for `Clock1`). The artwork has been redrawn as filled outlines rather than
strokes, which changes the rendering, not the authorship.

Neither notice grants a trademark. This package is not affiliated with or
endorsed by Lucide or Feather, and should not be branded as though it were.
