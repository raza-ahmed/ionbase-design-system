import { spacingScale } from '../meta-data.js';

const COLOUR_PROPS =
  /^(color|backgroundColor|borderColor|border.*Color|outlineColor|fill|stroke)$/;
const SPACE_PROPS =
  /^(padding|margin|gap|rowGap|columnGap|(padding|margin)(Top|Right|Bottom|Left|Block|Inline)|borderRadius|top|right|bottom|left)$/;
const RAW_COLOUR = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i;

/**
 * An inline `style={{ color: '#1a73e8' }}` is the single most common way a
 * generated UI drifts from the system: it type-checks, it renders, and it is
 * invisible to every other check. It is also the thing a model reaches for when
 * it cannot recall a token name.
 *
 * Spacing suggestions name the exact rung, because "use a token" is advice and
 * "use var(--spacing-16)" is a fix.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw colour and spacing values in inline style props',
    },
    schema: [],
    messages: {
      colour:
        'Raw colour `{{value}}` in an inline style. Use an IonBase token — `var(--text-default)`, `var(--surface-default)` and the rest are listed in `ionbase-ui/tokens`.',
      spacingExact:
        'Raw spacing `{{value}}` in an inline style. That is `var({{token}})`.',
      spacingOff:
        'Raw spacing `{{value}}` in an inline style, and it is not on the scale. Nearest rungs are `var({{lower}})` and `var({{upper}})`.',
    },
  },
  create(context) {
    const rungs = Object.keys(spacingScale)
      .map(Number)
      .sort((a, b) => a - b);

    const check = (prop) => {
      if (prop.type !== 'Property' || prop.computed) return;
      const key =
        prop.key.type === 'Identifier'
          ? prop.key.name
          : prop.key.type === 'Literal'
            ? String(prop.key.value)
            : null;
      if (!key) return;
      const v = prop.value;
      if (v.type !== 'Literal') return;

      if (
        COLOUR_PROPS.test(key) &&
        typeof v.value === 'string' &&
        RAW_COLOUR.test(v.value)
      ) {
        context.report({
          node: v,
          messageId: 'colour',
          data: { value: v.value },
        });
        return;
      }

      if (SPACE_PROPS.test(key)) {
        let px = null;
        if (typeof v.value === 'number' && v.value !== 0) px = v.value;
        else if (typeof v.value === 'string') {
          const m = v.value.match(/^(\d+(?:\.\d+)?)px$/);
          if (m && Number(m[1]) !== 0) px = Number(m[1]);
        }
        if (px === null || !rungs.length) return;

        if (spacingScale[px]) {
          context.report({
            node: v,
            messageId: 'spacingExact',
            data: { value: String(v.value), token: spacingScale[px] },
          });
        } else {
          const lower = [...rungs].reverse().find((r) => r < px) ?? rungs[0];
          const upper = rungs.find((r) => r > px) ?? rungs[rungs.length - 1];
          context.report({
            node: v,
            messageId: 'spacingOff',
            data: {
              value: String(v.value),
              lower: spacingScale[lower],
              upper: spacingScale[upper],
            },
          });
        }
      }
    };

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style')
          return;
        if (node.value?.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr.type !== 'ObjectExpression') return;
        for (const p of expr.properties) check(p);
      },
    };
  },
};
