// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import ionbase from './packages/ionbase-ui/eslint-plugin/index.js';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      // Machine-written token data — reviewed as a Figma diff, not as source.
      'packages/tokens/src/dtcg/**',
      'packages/tokens/src/generated/**',
      // A/B candidates. This is the output UNDER TEST — a model's answer to a
      // prompt, graded by evals/score/score.mjs against its own rule set. Held
      // to the repo's lint config it would fail on its own terms and, worse,
      // tempt someone to fix it, which is tampering with the measurement.
      'evals/results/**',
    ],
  },
  {
    // Build scripts run under Node, not in a browser.
    files: ['**/scripts/**/*.mjs', '**/*.config.{js,mjs}', 'evals/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
  {
    // Any packages/*/figma/* file never runs here — it is pasted into the Figma
    // Plugin API, where `figma` is a global and top-level await is allowed.
    files: ['packages/*/figma/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { figma: 'readonly' },
    },
  },
  {
    /*
     * The design system's own rules, applied to the design system's own stories.
     *
     * Imported by relative path for the same reason the stylelint config is: the
     * workspace root has no dependency on the package, and adding one to satisfy
     * a lint config would be the tail wagging the dog. Consumers write
     * `import ionbase from 'ionbase-ui/eslint-plugin'`.
     *
     * Two of the five rules are deliberately OFF here, and the reasons do not
     * generalise to a consumer:
     *
     * - `no-known-contrast-failure` — Button.stories.tsx exists to render every
     *   variant, `primary-soft` included. A design system has to be able to show
     *   a component that carries a recorded defect; that is what the story and
     *   its docs are for. In an app it is an error, and it should be.
     *
     * - `no-raw-style-values` — the hits are all story DECORATORS: `padding:
     *   '120px'` to give a Popover room to open, `gap: '24px'` to space a demo
     *   row. That is fixture scaffolding, not product UI, and the off-scale
     *   values are arbitrary on purpose. Worth stating plainly: this repo
     *   contains no consumer app code, so the rule's real target is not
     *   dogfooded here — it is covered by the plugin's own fixtures instead.
     */
    files: ['apps/storybook/src/**/*.tsx'],
    plugins: { 'ionbase-ui': ionbase },
    rules: {
      'ionbase-ui/no-deprecated-props': 'error',
      'ionbase-ui/needs-accessible-name': 'error',
      'ionbase-ui/one-primary-action': 'error',
    },
  },
  storybook.configs['flat/recommended'],
);
