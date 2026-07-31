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
 *   import { semantic } from 'ionbase-ui/tokens-js';  // JS token values
 *
 * Icons are not bundled. `Icon` takes the icon as a prop, so any SVG component
 * works — lucide-react, heroicons, react-icons, your own. See ./Icon.tsx.
 *
 * JS token values used to re-export from this barrel as `tokens`. That pulled
 * ~48KB into any consumer whose bundler does not tree-shake a namespace
 * re-export. They live at `ionbase-ui/tokens-js` now.
 */
export * from './components/index.js';

export { Icon } from './Icon.js';
export type { IconProps, IconSize } from './Icon.js';
