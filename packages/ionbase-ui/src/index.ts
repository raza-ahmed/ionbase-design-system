/**
 * ionbase-ui — the whole design system in one package.
 *
 * Components, the icon wrapper, the stylesheets and the generated design
 * tokens all ship from here. There is deliberately no second package: every
 * release moved the four old ones in lockstep, so the split cost four
 * manifests and a cross-package CSS import while buying no independent
 * versioning.
 *
 *   import 'ionbase-ui/styles';            // tokens + components, one import
 *   import { Button, Icon } from 'ionbase-ui';
 *
 * Icons are not bundled. `Icon` takes the icon as a prop, so any SVG component
 * works — lucide-react, heroicons, react-icons, your own. See ./Icon.tsx.
 */
export * from './components/index.js';

export { Icon } from './Icon.js';
export type { IconProps, IconSize } from './Icon.js';

/**
 * Generated token values, as `var(--…)` references. Copied in from the token
 * pipeline at build time by scripts/sync-tokens.mjs — never hand-edited, and
 * git-ignored, because Figma owns these names and values.
 */
export * as tokens from './tokens/index.js';
