/**
 * The config candidates are graded with. Deliberately ONLY the IonBase rules —
 * a candidate should not lose points for a missing semicolon.
 */
import ionbase from '../../packages/ionbase-ui/eslint-plugin/index.js';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.tsx', '**/*.jsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    ...ionbase.configs.recommended,
  },
];
