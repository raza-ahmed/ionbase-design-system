# @ionbase-ui/styles

Component CSS for IonBase, plus fonts and the token layer.

```bash
pnpm add @ionbase-ui/styles
```

```ts
import '@ionbase-ui/styles/css';
```

That single import pulls in Host Grotesk / Merriweather / Space Mono, `@ionbase-ui/tokens`, and every component stylesheet. Dark mode uses `data-theme="dark"` on an ancestor.

Monorepo Storybook may import `@ionbase-ui/styles/src/index.css` so CSS edits apply without a rebuild. Published consumers should use `@ionbase-ui/styles/css` only — `src` is not in the npm tarball.
