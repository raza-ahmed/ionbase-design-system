/**
 * ionbase-ui/eslint-plugin — the design system's rules, shipped.
 *
 *   // eslint.config.js
 *   import ionbase from 'ionbase-ui/eslint-plugin';
 *   export default [ionbase.configs.recommended];
 *
 * The premise of IonBase is that the code consuming it may be written by an
 * agent with no developer reviewing the output. Guidance in a README does not
 * survive that; a lint error naming the fix does.
 *
 * Every rule's data comes from dist/meta/components.json — deprecations,
 * measured contrast failures, which components require an accessible name, the
 * spacing scale, even Button's default variant. Nothing is hardcoded here, so
 * when a defect is fixed in Figma the rule stops firing without anyone editing
 * this package.
 *
 * Two rules from the plan are deliberately absent. `destructive-needs-confirm`
 * wants to know whether a Modal wraps the action, which is almost always in
 * another file — ESLint's per-file model would make it a false-positive
 * generator. `no-nested-interactive` needs the same. Both belong in a checker
 * with whole-tree visibility, or in the eval harness.
 */
import noDeprecatedProps from './rules/no-deprecated-props.js';
import noKnownContrastFailure from './rules/no-known-contrast-failure.js';
import noRawStyleValues from './rules/no-raw-style-values.js';
import needsAccessibleName from './rules/needs-accessible-name.js';
import onePrimaryAction from './rules/one-primary-action.js';

const rules = {
  'no-deprecated-props': noDeprecatedProps,
  'no-known-contrast-failure': noKnownContrastFailure,
  'no-raw-style-values': noRawStyleValues,
  'needs-accessible-name': needsAccessibleName,
  'one-primary-action': onePrimaryAction,
};

const plugin = { meta: { name: 'ionbase-ui' }, rules };

plugin.configs = {
  /** Everything, as errors. The defaults are what the system considers wrong. */
  recommended: {
    name: 'ionbase-ui/recommended',
    plugins: { 'ionbase-ui': plugin },
    rules: {
      'ionbase-ui/no-deprecated-props': 'error',
      'ionbase-ui/no-known-contrast-failure': 'error',
      'ionbase-ui/no-raw-style-values': 'error',
      'ionbase-ui/needs-accessible-name': 'error',
      'ionbase-ui/one-primary-action': 'error',
    },
  },
  /** Same rules, as warnings — for adopting the system in an existing app. */
  warn: {
    name: 'ionbase-ui/warn',
    plugins: { 'ionbase-ui': plugin },
    rules: Object.fromEntries(
      Object.keys(rules).map((r) => [`ionbase-ui/${r}`, 'warn']),
    ),
  },
};

export default plugin;
export { rules };
