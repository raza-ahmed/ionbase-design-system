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
