/**
 * Repo stylelint config.
 *
 * The token rules live in the PUBLISHED package —
 * `packages/ionbase-ui/stylelint-config.js` — and this file extends them, so the
 * rules we ship to consumers are the exact rules we enforce on ourselves. They
 * used to be declared here and only here, which protected this repo and nothing
 * built with it.
 *
 * Imported by relative path rather than by the `ionbase-ui/stylelint-config`
 * specifier: the workspace root has no dependency on the package, and adding one
 * to satisfy a lint config would be the tail wagging the dog.
 *
 * Edit rules in that file, not this one. What belongs here is only what is true
 * of this repo and false of a consumer.
 */
import ionbase from './packages/ionbase-ui/stylelint-config.js';

/** @type {import('stylelint').Config} */
export default {
  ...ionbase,
  extends: ['stylelint-config-standard'],
};
