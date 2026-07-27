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
    ],
  },
  {
    // Build scripts run under Node, not in a browser.
    files: ['**/scripts/**/*.mjs', '**/*.config.{js,mjs}'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
);
