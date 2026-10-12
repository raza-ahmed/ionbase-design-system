import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

/*
 * The generated stylesheet as text: the shadows are Figma effect styles, not
 * variables, so they are not in `tokens`. Read from the file the pipeline
 * writes, so a style added in Figma shows here at the next build.
 */
import css from '../../../../packages/ionbase-ui/src/styles/tokens/elevation.css?raw';

import { Section, TokenName } from './foundations-kit.js';

const meta: Meta = {
  title: 'Foundations/Elevation',
  parameters: {
    docs: {
      description: {
        component:
          'Shadows, generated from the Figma effect styles. `shadow-*` lifts a surface off the page, from a card (`sm`) to a modal (`xl`). `raised-*` and `inset-*` are the bevels of a control at rest and pressed. `focus-*` is a focus ring drawn as a shadow. They are the same in both themes.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const SHADOWS = [...css.matchAll(/^\s*(--ion-shadow-[\w-]+):/gm)].map(
  (m) => m[1],
);

/** `--ion-shadow-raised-lifted-xs` → `raised-lifted`. */
const family = (property: string) =>
  property.replace('--ion-shadow-', '').replace(/-?(xs|sm|md|lg|xl)$/, '') ||
  'none';

const FAMILIES: Record<string, string> = {
  shadow: 'A surface above the page: cards, popovers, menus, modals.',
  'raised-lifted': 'A raised control with a lit top edge, at rest.',
  'raised-flush': 'A raised control without the lit edge.',
  'inset-lifted': 'The same control pressed in.',
  'inset-flush': 'Pressed in, without the lit edge.',
  focus: 'A focus ring drawn as a shadow, where an outline cannot go.',
  none: 'No shadow, for a state that removes one.',
};

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];
const size = (property: string) =>
  SIZES.indexOf(property.match(/-(xs|sm|md|lg|xl)$/)?.[1] ?? '');

const grouped = Object.keys(FAMILIES)
  .map((f) => ({
    family: f,
    shadows: SHADOWS.filter((s) => family(s) === f).sort(
      (a, b) => size(a) - size(b),
    ),
  }))
  .filter((g) => g.shadows.length);

export const Shadows: Story = {
  render: () => (
    <div style={{ maxInlineSize: '64rem' }}>
      {grouped.map((g) => (
        <Section
          key={g.family}
          title={g.family}
          description={FAMILIES[g.family]}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))',
              gap: 'var(--spacing-32)',
              padding: 'var(--spacing-24)',
              background: 'var(--surface-page)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {g.shadows.map((s) => (
              <figure key={s} data-token={s} style={{ margin: 0 }}>
                <div
                  data-shape
                  aria-hidden="true"
                  style={{
                    blockSize: 'var(--spacing-64)',
                    background: 'var(--surface-default)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: `var(${s})`,
                    marginBlockEnd: 'var(--spacing-12)',
                  }}
                />
                <figcaption>
                  <TokenName>{s}</TokenName>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const shown = [...canvasElement.querySelectorAll('[data-token]')];
    // Every shadow in the stylesheet, once, and none it does not have.
    await expect(shown.map((s) => s.getAttribute('data-token')).sort()).toEqual(
      [...SHADOWS].sort(),
    );
    await expect(SHADOWS.length).toBeGreaterThan(0);
    for (const s of shown) {
      const drawn = getComputedStyle(
        s.querySelector('[data-shape]')!,
      ).boxShadow;
      // `none` is a transparent shadow, so it can be animated to and from.
      if (s.getAttribute('data-token') === '--ion-shadow-none')
        await expect(drawn).toMatch(/^rgba\(0, 0, 0, 0\)/);
      else await expect(drawn).not.toMatch(/^(none|rgba\(0, 0, 0, 0\))/);
    }
  },
};
