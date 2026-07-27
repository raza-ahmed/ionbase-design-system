/**
 * @ionbase/icons
 *
 * The IonBase icon set is Lucide — the 1,753 components on the Figma "Icons-
 * Lucide" page are the stock set, unmodified. So this package does NOT export
 * icons; `lucide-react` already ships every one, tree-shakeable and maintained,
 * and re-exporting them from Figma would fork us from upstream for no gain.
 *
 * What this package owns is how an icon is *used*: sizing bound to tokens,
 * colour inherited from context, and the accessibility defaults.
 *
 *   import { Plus } from 'lucide-react';
 *   import { Icon } from '@ionbase/icons';
 *
 *   <Icon as={Plus} size="sm" />
 *   <Icon as={Plus} label="Add item" />   // meaningful, gets an a11y name
 *
 * `pnpm --filter @ionbase/icons icons:verify` checks that the Figma page and the
 * installed lucide-react still describe the same set.
 */
export { Icon } from './Icon.js';
export type { IconProps, IconSize } from './Icon.js';
