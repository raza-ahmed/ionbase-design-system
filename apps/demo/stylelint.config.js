/**
 * Consumer-shaped on purpose: extends the published config by its package
 * specifier, not by relative path as the root config has to. A hex, a raw px
 * or a raw shadow colour in the demo's own CSS fails lint.
 */
/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'ionbase-ui/stylelint-config'],
};
