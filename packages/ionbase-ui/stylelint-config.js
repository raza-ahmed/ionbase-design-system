/**
 * IonBase stylelint config — the token rules, shipped.
 *
 *   // stylelint.config.js
 *   export default { extends: ['ionbase-ui/stylelint-config'] };
 *
 * This exists because the premise of IonBase is that the code consuming it may
 * be written by an agent with no developer reviewing the result. A rule that
 * lives only in this repo protects only this repo; the app is where the drift
 * actually happens, and a lint error naming the fix is the one form of guidance
 * an agent reliably acts on.
 *
 * It is deliberately NOT a superset of stylelint-config-standard. That config
 * is about CSS hygiene and is the consumer's choice; this one is about design
 * tokens, and pairs with whatever else they already run.
 *
 * Requires `stylelint-declaration-strict-value` alongside `stylelint`. Both are
 * optional peer dependencies — installed only by projects that opt in.
 *
 * REPO NOTE: the root stylelint.config.js extends this file directly rather
 * than re-declaring the rules. One source, many pointers — the same reason
 * CLAUDE.md is a pointer to AGENTS.md. If you edit rules, edit them here.
 */

/** Properties where a raw value is a theming bug rather than a style choice. */
export const TOKENISED_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-bottom-color',
  'border-left-color',
  'border-right-color',
  'outline-color',
  'font-size',
  'font-family',
  'font-weight',
  'line-height',
  'margin',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'gap',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'border-width',
  'border-top-width',
  'border-bottom-width',
  'border-left-width',
  'border-right-width',
];

/**
 * Values that are not tokens and never should be.
 *
 * The forced-colors block is the important half: under Windows High Contrast
 * every authored colour is remapped, and these system keywords are the only
 * values that survive. A token there would be silently discarded.
 */
export const ALLOWED_RAW_VALUES = [
  'inherit',
  'transparent',
  'currentColor',
  'currentcolor',
  '0',
  'none',
  'auto',
  'normal',
  '100%',
  'max-content',
  'min-content',
  'Canvas',
  'CanvasText',
  'Highlight',
  'HighlightText',
  'GrayText',
  'ButtonText',
  'ButtonFace',
  'LinkText',
  'Field',
  'FieldText',
  'SelectedItem',
  'SelectedItemText',
];

/** @type {import('stylelint').Config} */
const config = {
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'color-no-hex': true,

    // BEM. `.ion-button--primary-brand`, `.ion-tabs__item`.
    'selector-class-pattern': null,

    'scale-unlimited/declaration-strict-value': [
      TOKENISED_PROPERTIES,
      {
        ignoreValues: ALLOWED_RAW_VALUES,
        message:
          'Raw CSS values are forbidden here. Use a design token — see `ionbase-ui/tokens` for the custom properties, or `ionbase-ui/meta/<Component>.json` for the tokens a given component consumes.',
      },
    ],

    /*
     * No raw colour inside a shadow.
     *
     * Shadows are the one property where geometry and colour share a value.
     * The offsets (`0 0 0 2px`) are inert and never theme, so requiring them to
     * be tokens would buy nothing — but a raw colour is a place dark mode has to
     * be fixed by hand, once per occurrence. This bans the colour half only,
     * which is why it is a disallowed-list rather than declaration-strict-value.
     *
     * Correct:  box-shadow: 0 0 0 2px var(--border-primary-strong);
     *           box-shadow: var(--ion-shadow-button-raised);
     * Rejected: box-shadow: 0 1px 2px rgb(0 0 0 / 40%);
     */
    'declaration-property-value-disallowed-list': {
      'box-shadow': [/rgba?\(/i, /hsla?\(/i, /#[0-9a-f]{3,8}/i],
    },
  },

  overrides: [
    {
      // Wherever a project keeps its own elevation ramp, that file is where raw
      // shadow values are SUPPOSED to live — it is the one place dark mode has
      // to touch. Everywhere else must reference the token.
      files: ['**/elevation.css'],
      rules: { 'declaration-property-value-disallowed-list': null },
    },
  ],

  ignoreFiles: ['**/dist/**', '**/node_modules/**'],
};

export default config;
