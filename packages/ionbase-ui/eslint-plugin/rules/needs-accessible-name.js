import { needsAccessibleName, isComponent } from '../meta-data.js';

/**
 * An icon-only control with no `aria-label` is announced as just "button".
 *
 * Which components require a name is not hardcoded — it is every component whose
 * contract's `a11y.requires` says so. Adding that line to a new component's
 * intent file is what turns this rule on for it.
 *
 * Only fires when the element demonstrably has no text: an expression child
 * could be anything, so those are left alone rather than guessed at.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require an accessible name on icon-only IonBase controls',
    },
    schema: [],
    messages: {
      unnamed:
        '{{component}} has no text and no accessible name, so it is announced as just "{{role}}". Add `aria-label`, or give it visible text.',
    },
  },
  create(context) {
    const named = new Set(needsAccessibleName);

    const hasText = (children) =>
      children.some((c) => {
        if (c.type === 'JSXText') return c.value.trim().length > 0;
        // An expression child might render text — assume it does rather than
        // report something we cannot see.
        if (c.type === 'JSXExpressionContainer') return true;
        return false;
      });

    /** A child element that is itself an IonBase component is not text. */
    const onlyIcons = (children) =>
      children
        .filter((c) => c.type === 'JSXElement')
        .every((c) => {
          const n = c.openingElement.name;
          return (
            n.type === 'JSXIdentifier' &&
            (n.name === 'Icon' || isComponent(n.name) === false)
          );
        });

    return {
      JSXElement(node) {
        const open = node.openingElement;
        if (open.name.type !== 'JSXIdentifier') return;
        const name = open.name.name;
        if (!named.has(name)) return;

        const attrs = open.attributes.filter((a) => a.type === 'JSXAttribute');
        // A spread could carry aria-label; do not second-guess it.
        if (open.attributes.some((a) => a.type === 'JSXSpreadAttribute'))
          return;

        const attrName = (a) =>
          a.name.type === 'JSXIdentifier' ? a.name.name : '';
        if (attrs.some((a) => /^aria-(label|labelledby)$/.test(attrName(a))))
          return;
        // `title` on Modal, `label` on Input/Select — the contract's own naming.
        if (attrs.some((a) => ['title', 'label'].includes(attrName(a)))) return;

        if (hasText(node.children)) return;
        if (!node.children.length) {
          // Self-closing with no children and no name at all.
          context.report({
            node: open,
            messageId: 'unnamed',
            data: { component: name, role: name.toLowerCase() },
          });
          return;
        }
        if (onlyIcons(node.children)) {
          context.report({
            node: open,
            messageId: 'unnamed',
            data: { component: name, role: name.toLowerCase() },
          });
        }
      },
    };
  },
};
