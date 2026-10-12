import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { tokens, tokenValues } from 'ionbase-ui/tokens-js';

import { cssVar, Section, TokenName, Value } from './foundations-kit.js';

const meta: Meta = {
  title: 'Foundations/Radius',
  parameters: {
    docs: {
      description: {
        component:
          'Corner radii, by size. Smaller parts get smaller radii: a checkbox `xs`, a button `md`, a modal `xl`. `full` makes a pill or a circle.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const values = tokenValues as Record<string, Record<string, number | string>>;

/** `{scale.8}` → 8: a radius is an alias of a step on the scale. */
const px = (name: string) => {
  const alias = String(values[name].IonBase).match(/^\{scale\.(\w+)\}$/)![1];
  return Number(values[`scale/${alias}`].Value);
};

const RADII = Object.entries(tokens.semantics)
  .filter(([name]) => name.startsWith('radius/'))
  .map(([name, reference]) => ({
    name,
    property: cssVar(reference),
    px: px(name),
  }));

export const Scale: Story = {
  render: () => (
    <div style={{ maxInlineSize: '64rem' }}>
      <Section
        title="Radius"
        description="Each is an alias of a step on the scale, so changing a step changes every radius made from it."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))',
            gap: 'var(--spacing-24)',
          }}
        >
          {RADII.map((r) => (
            <figure key={r.name} data-token={r.name} style={{ margin: 0 }}>
              <div
                data-shape
                aria-hidden="true"
                style={{
                  blockSize: 'var(--spacing-80)',
                  background: 'var(--surface-primary-subtle)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: `var(${r.property})`,
                  marginBlockEnd: 'var(--spacing-8)',
                }}
              />
              <figcaption>
                <TokenName>{r.property}</TokenName>
                <div>
                  <Value>{r.px === 9999 ? '9999px (full)' : `${r.px}px`}</Value>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const shapes = [...canvasElement.querySelectorAll('[data-token]')];
    await expect(shapes.map((s) => s.getAttribute('data-token'))).toEqual(
      RADII.map((r) => r.name),
    );
    // Drawn by the token, so the corner is the value the page states.
    for (const [i, s] of shapes.entries())
      await expect(
        getComputedStyle(s.querySelector('[data-shape]')!).borderTopLeftRadius,
      ).toBe(`${RADII[i].px}px`);
  },
};
