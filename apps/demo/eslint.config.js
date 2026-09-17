/**
 * The demo is the repo's one consumer app, so it takes the design system's
 * rules the way a consumer does: through the package specifier, all five on,
 * none relaxed. The root config turns two of them off for Storybook, and says
 * why that does not generalise — this file is where they are finally exercised
 * against product code. See docs/demo-app-plan.md.
 *
 * If a rule fires here, fix the code, not this file. A demo that needs an
 * exemption is showing the system can't be used as documented, and that is a
 * finding for ionbase-ui, not a lint setting.
 */
import ionbase from 'ionbase-ui/eslint-plugin';

import root from '../../eslint.config.js';

export default [
  ...root,
  { files: ['src/**/*.{ts,tsx}'], ...ionbase.configs.recommended },
];
