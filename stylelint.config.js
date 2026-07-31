/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    // Prevent hex colors in styles
    'color-no-hex': true,

    // Allow BEM selectors (e.g. .ion-button--primary-brand, .ion-tabs__item)
    'selector-class-pattern': null,
    
    // Prevent raw values for design-critical properties and force design token variables
    'scale-unlimited/declaration-strict-value': [
      [
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
      ],
      {
        ignoreValues: [
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
          // System colours for `@media (forced-colors: active)` — not tokens,
          // and the only values that survive Windows High Contrast remapping.
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
        ],
        message: 'Raw CSS values are forbidden. Use design token variables defined in @ionbase-ui/tokens (e.g., var(--bg-neutral-default)) instead.',
      },
    ],

    /**
     * No raw colour inside a shadow.
     *
     * Shadows are the one property where geometry and colour share a value.
     * The offsets (`0 0 0 2px`) are inert and never theme, so requiring them to
     * be tokens would buy nothing — but a raw colour is a place dark mode has
     * to be fixed by hand, one per occurrence. This bans the colour half only,
     * which is why it is a disallowed-list rather than declaration-strict-value.
     *
     * Correct:  box-shadow: 0 0 0 2px var(--border-brand-default-focus);
     *           box-shadow: var(--ion-shadow-button-raised);
     * Rejected: box-shadow: 0 1px 2px rgb(0 0 0 / 40%);
     */
    'declaration-property-value-disallowed-list': {
      'box-shadow': [/rgba?\(/i, /hsla?\(/i, /#[0-9a-f]{3,8}/i],
    },
  },

  overrides: [
    {
      // elevation.css is where the raw shadow values are *supposed* to live —
      // it is the one file dark mode has to touch. Everywhere else must
      // reference --ion-shadow-*, so the override is deliberately this narrow.
      files: ['**/elevation.css'],
      rules: {
        'declaration-property-value-disallowed-list': null,
      },
    },
  ],

  ignoreFiles: ['**/dist/**', '**/node_modules/**'],
};
