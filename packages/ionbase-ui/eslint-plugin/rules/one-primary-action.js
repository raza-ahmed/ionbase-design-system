import { components } from '../meta-data.js';

/**
 * Two primary buttons in one dialog is the same as none — nothing indicates the
 * expected action. Button's own contract says `limit: one per view or dialog`;
 * this enforces it where it is checkable, which is inside a single Modal in a
 * single file.
 *
 * The default variant counts. `<Button>Save</Button>` IS primary-brand, and that
 * is exactly the case a reviewer misses, because neither button says "primary".
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Allow at most one primary Button inside a Modal' },
    schema: [],
    messages: {
      twoPrimaries:
        'This Modal has {{count}} primary Buttons. Exactly one action should be primary — make the others `secondary` or `tertiary`.{{implicit}}',
    },
  },
  create(context) {
    // Read the default from the contract rather than assuming it.
    const primary =
      components.Button?.props?.variant?.default ?? 'primary-brand';

    const variantOf = (open) => {
      for (const a of open.attributes) {
        if (a.type === 'JSXSpreadAttribute') return null; // unknowable
        if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier')
          continue;
        if (a.name.name !== 'variant') continue;
        if (a.value?.type === 'Literal') return a.value.value;
        if (
          a.value?.type === 'JSXExpressionContainer' &&
          a.value.expression.type === 'Literal'
        ) {
          return a.value.expression.value;
        }
        return null; // dynamic
      }
      return primary; // omitted → the default, which is primary
    };

    /**
     * Walk every JSX descendant, including through expression containers —
     * `{isEditing && <Button/>}` and `{items.map(...)}` both render buttons.
     * A hand-rolled walk rather than a serialiser: the AST carries circular
     * `parent` references, so anything generic has to be told about them.
     */
    const collect = (node, found, seen = new Set()) => {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);

      if (node.type === 'JSXElement') {
        const n = node.openingElement.name;
        if (n.type === 'JSXIdentifier' && n.name === 'Button') {
          const v = variantOf(node.openingElement);
          if (v === primary) {
            found.push({
              node,
              implicit: !node.openingElement.attributes.some(
                (a) =>
                  a.type === 'JSXAttribute' &&
                  a.name.type === 'JSXIdentifier' &&
                  a.name.name === 'variant',
              ),
            });
          }
        }
        // Do not descend into a nested Modal — its buttons are its own problem.
        if (n.type === 'JSXIdentifier' && n.name === 'Modal' && found.length)
          return;
      }

      for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue;
        if (Array.isArray(value))
          for (const v of value) collect(v, found, seen);
        else if (
          value &&
          typeof value === 'object' &&
          typeof value.type === 'string'
        ) {
          collect(value, found, seen);
        }
      }
    };

    return {
      JSXElement(node) {
        const n = node.openingElement.name;
        if (n.type !== 'JSXIdentifier' || n.name !== 'Modal') return;
        const found = [];
        // Every child, not just JSXElement ones — `{isEditing && <Button/>}` is
        // a JSXExpressionContainer and renders a button just the same. Skipping
        // those was the whole bug: the conditional action is exactly the one a
        // reviewer does not count.
        const seen = new Set();
        for (const child of node.children) collect(child, found, seen);
        // `footer={<>...</>}` is where Modal actions actually go.
        for (const a of node.openingElement.attributes) {
          if (
            a.type === 'JSXAttribute' &&
            a.value?.type === 'JSXExpressionContainer' &&
            (a.value.expression.type === 'JSXElement' ||
              a.value.expression.type === 'JSXFragment')
          ) {
            collect(a.value.expression, found, seen);
          }
        }
        if (found.length > 1) {
          const implicit = found.filter((f) => f.implicit).length;
          context.report({
            node: found[found.length - 1].node.openingElement,
            messageId: 'twoPrimaries',
            data: {
              count: String(found.length),
              implicit: implicit
                ? ` ${implicit} of them has no \`variant\`, which defaults to \`${primary}\`.`
                : '',
            },
          });
        }
      },
    };
  },
};
