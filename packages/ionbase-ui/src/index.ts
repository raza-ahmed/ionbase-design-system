/**
 * ionbase-ui — the whole design system in one package.
 *
 * Components, the icon wrapper, the stylesheets and the generated design
 * tokens all ship from here. The four old packages — tokens, styles, react,
 * icons — were collapsed into this one because every release moved them in
 * lockstep: the split cost four manifests and a cross-package CSS import and
 * bought no independent versioning.
 *
 *   import 'ionbase-ui/styles';            // tokens + components, one import
 *   import { Button, Icon } from 'ionbase-ui';
 *   import { semantic } from 'ionbase-ui/tokens-js';  // JS token values
 *
 * Icons are still not bundled here, and that is a different decision from the
 * one above. `Icon` takes the icon as a prop, so any SVG component works —
 * lucide-react, heroicons, react-icons, your own. See ./Icon.tsx.
 *
 * `ionbase-icons` is a separate, OPTIONAL package. It is not a re-split: it
 * carries no version relationship to this one, nothing here depends on it, and
 * a consumer who never installs it loses nothing. That is precisely what the
 * old four-way split could not say for itself. `IconComponent` is exported
 * below so a consumer can type their own icon prop without reaching into this
 * package's internals.
 *
 * JS token values used to re-export from this barrel as `tokens`. That pulled
 * ~48KB into any consumer whose bundler does not tree-shake a namespace
 * re-export. They live at `ionbase-ui/tokens-js` now.
 */
export * from './components/index.js';

export { Icon } from './Icon.js';
export type { IconComponent, IconProps, IconSize } from './Icon.js';
