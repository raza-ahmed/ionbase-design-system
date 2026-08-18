import { contrastIssues } from '../meta-data.js';

/**
 * Warn on prop combinations measured to fail WCAG AA.
 *
 * The data is whatever verify-contrast.mjs found this build — no list is
 * maintained here. When a defect is fixed in Figma the measurement changes, the
 * contract loses the entry, and this rule stops firing on its own.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow IonBase prop combinations with measured contrast failures',
    },
    schema: [],
    messages: {
      fails:
        '{{component}} {{combo}} measures {{ratio}}:1 against a {{required}}:1 requirement in {{mode}} mode (WCAG {{sc}}{{states}}). Known and not yet fixed.',
    },
  },
  create(context) {
    const literal = (attr) => {
      if (!attr.value) return true; // bare prop = true
      if (attr.value.type === 'Literal') return attr.value.value;
      if (
        attr.value.type === 'JSXExpressionContainer' &&
        attr.value.expression.type === 'Literal'
      ) {
        return attr.value.expression.value;
      }
      return undefined; // dynamic — cannot judge, so do not
    };

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        const name = node.name.name;

        for (const issue of contrastIssues) {
          if (issue.appliesTo.component !== name) continue;

          const props = new Map();
          for (const a of node.attributes) {
            if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier')
              continue;
            props.set(a.name.name, literal(a));
          }

          const wanted = Object.entries(issue.appliesTo.props ?? {});
          const matches = wanted.every(([k, v]) => props.get(k) === v);
          if (!matches) continue;

          context.report({
            node,
            messageId: 'fails',
            data: {
              component: name,
              combo: wanted.map(([k, v]) => `${k}="${v}"`).join(' '),
              ratio: String(issue.ratio),
              required: String(issue.required),
              mode: issue.mode,
              sc: issue.sc,
              states:
                issue.states && !issue.states.includes('default')
                  ? `, ${issue.states.join('/')} state`
                  : '',
            },
          });
        }
      },
    };
  },
};
