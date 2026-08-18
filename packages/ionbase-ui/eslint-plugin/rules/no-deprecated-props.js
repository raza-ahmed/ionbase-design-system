import { deprecations } from '../meta-data.js';

/**
 * `<Button disabled>` still type-checks — that is exactly why it needs a lint
 * rule. A deprecation the compiler accepts is one an agent will keep emitting
 * from whatever it learned before the rename.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow props marked @deprecated in the IonBase contracts',
    },
    fixable: 'code',
    schema: [],
    messages: {
      deprecated:
        '`{{prop}}` is deprecated on `{{component}}`. Use `{{replacement}}`.',
      deprecatedNoFix: '`{{prop}}` is deprecated on `{{component}}`.{{note}}',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        const list = deprecations[node.name.name];
        if (!list) return;

        for (const attr of node.attributes) {
          if (
            attr.type !== 'JSXAttribute' ||
            attr.name.type !== 'JSXIdentifier'
          )
            continue;
          const hit = list.find((d) => d.prop === attr.name.name);
          if (!hit) continue;

          if (hit.replacement) {
            const already = node.attributes.some(
              (a) =>
                a.type === 'JSXAttribute' &&
                a.name.type === 'JSXIdentifier' &&
                a.name.name === hit.replacement,
            );
            context.report({
              node: attr,
              messageId: 'deprecated',
              data: {
                prop: hit.prop,
                component: node.name.name,
                replacement: hit.replacement,
              },
              // Only autofix when the replacement is not already present —
              // renaming into a duplicate would change which value wins.
              fix: already
                ? undefined
                : (fixer) => fixer.replaceText(attr.name, hit.replacement),
            });
          } else {
            context.report({
              node: attr,
              messageId: 'deprecatedNoFix',
              data: {
                prop: hit.prop,
                component: node.name.name,
                note: hit.note ? ` ${hit.note}` : '',
              },
            });
          }
        }
      },
    };
  },
};
