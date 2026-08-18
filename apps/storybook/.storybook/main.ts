import type { StorybookConfig } from '@storybook/react-vite';

import { dirname } from 'path';

import { fileURLToPath } from 'url';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-mcp'),
  ],
  framework: getAbsolutePath('@storybook/react-vite'),

  /*
   * `componentsManifest` publishes /manifests/components.json — every
   * component's import statement, JSDoc tags, prop table and a JSX snippet per
   * story — built from the stories that already exist. It is what
   * `@storybook/addon-mcp` serves; without it the addon is installed and inert.
   *
   * The flag was `experimentalComponentsManifest` when the feature landed and
   * is `componentsManifest` as of the 10.5 line. addon-mcp still reads the old
   * name as a fallback, so a stale spelling fails silently rather than
   * erroring — check /manifests/components.html, not the config, to confirm.
   *
   * `experimentalCodeExamples` is what makes the `snippet` fields read like the
   * source instead of a serialised args object. Still experimental, and the
   * manifest schema itself is explicitly pre-stable and React-only — treat the
   * output as a scaffold, not as a contract we publish against.
   */
  features: {
    componentsManifest: true,
    experimentalCodeExamples: true,
  },

  /*
   * NOTE — the manifest's prop tables are mostly empty, and that is expected
   * here rather than a misconfiguration to go fix.
   *
   * Docgen reads the file a component is DEFINED in. These stories import
   * `ionbase-ui`, a workspace link to `dist`, so react-docgen is handed
   * `dist/components/Button.js` — compiled JavaScript with every type erased —
   * and returns `props: []` for 19 of 26 components. The manifest still builds
   * and still looks plausible, which is the part worth knowing.
   *
   * Measured alternatives, all on 2026-08-18, all worse:
   *   - `features.experimentalReactComponentMeta` (TS LanguageService): 0/26.
   *   - `typescript.reactDocgen: 'react-docgen-typescript'`: 0/26, and it
   *     empties `reactDocgen` entirely — the vite docgen plugin only processes
   *     this project's own .tsx, never a linked package's dist/*.d.ts.
   *   - aliasing `ionbase-ui` to `../src`: this one works, and is still
   *     rejected. The interaction tests deliberately exercise the BUILT
   *     package; pointing Storybook at source would quietly stop testing what
   *     actually ships, to buy a prop table we can generate elsewhere.
   *
   * The prop table belongs in `packages/ionbase-ui`, generated from its own
   * source where docgen is trivial, and merged into the component meta
   * artifact — see docs/agent-readiness-plan.md phase 1. What the manifest is
   * genuinely good at, and what we keep it for, is the story snippets and the
   * import statements.
   */

  /*
   * GitHub Pages serves this repo at /ionbase-design-system/, not at the root.
   * Vite writes absolute asset URLs by default, so every chunk the preview
   * iframe loads would resolve to /assets/... and 404 — the manager shell
   * renders, the sidebar populates from a static index, and every story panel
   * comes up blank. It fails to look broken, which is what makes it expensive.
   *
   * Read from the environment rather than hardcoded so `pnpm dev` and the CI
   * interaction tests keep serving from `/`. The deploy workflow is the only
   * caller that sets it.
   */
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    base: process.env.STORYBOOK_BASE_PATH ?? '/',
  }),
};
export default config;
