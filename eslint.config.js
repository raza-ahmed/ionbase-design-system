// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  ignores: [
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/storybook-static/**',
    // Machine-written token data — reviewed as a Figma diff, not as source.
    'packages/tokens/src/dtcg/**',
    'packages/tokens/src/generated/**',
  ],
}, {
  // Build scripts run under Node, not in a browser.
  files: ['**/scripts/**/*.mjs', '**/*.config.{js,mjs}'],
  languageOptions: {
    globals: { console: 'readonly', process: 'readonly' },
  },
}, {
  // Any packages/*/figma/* file never runs here — it is pasted into the Figma
  // Plugin API, where `figma` is a global and top-level await is allowed.
  files: ['packages/*/figma/**/*.js'],
  languageOptions: {
    sourceType: 'module',
    globals: { figma: 'readonly' },
  },
}, storybook.configs["flat/recommended"]);
