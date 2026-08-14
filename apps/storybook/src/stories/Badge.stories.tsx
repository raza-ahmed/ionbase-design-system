import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Badge, Icon } from 'ionbase-ui';
import { Check, TriangleAlert } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    intent: {
      control: 'select',
      options: [
        'neutral',
        'primary',
        'success',
        'warning',
        'error',
        'information',
      ],
    },
    dot: { control: 'boolean' },
  },
  args: { intent: 'neutral', children: 'Badge' },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Badge` (152:73). Single size, six intents. Badge is not a control — at 20px it sits below `control/sm` — so it has its own geometry tokens rather than reading the control scale.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

const INTENTS = [
  'neutral',
  'primary',
  'success',
  'warning',
  'error',
  'information',
] as const;

export const Default: Story = {};

export const AllIntents: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      {INTENTS.map((intent) => (
        <Badge {...args} key={intent} intent={intent}>
          {intent}
        </Badge>
      ))}
    </div>
  ),
};

export const WithDot: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      {INTENTS.map((intent) => (
        <Badge {...args} key={intent} intent={intent} dot>
          {intent}
        </Badge>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <Badge {...args} intent="success" icon={<Icon as={Check} />}>
        Passed
      </Badge>
      <Badge {...args} intent="warning" icon={<Icon as={TriangleAlert} />}>
        Needs review
      </Badge>
    </div>
  ),
};

/*
 * Rendered geometry, not token values — the check that caught Tabs shipping
 * 16px too tall. Figma Badge 152:73 measures 22px high with 2/8 padding.
 *
 * It was 20px until `type/caption/line-height` moved 16 -> 18 in Figma. This
 * assertion caught the change on the next sync, which is the point of measuring
 * rendered pixels rather than reading tokens back to themselves.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: (args) => <Badge {...args}>Badge</Badge>,
  play: async ({ canvas }) => {
    const badge = canvas.getByText('Badge');
    const cs = getComputedStyle(badge);

    await expect(Math.round(badge.getBoundingClientRect().height)).toBe(22);

    /*
     * Figma's padding is 2px with a 1px stroke drawn INSIDE the box. A CSS
     * border sits outside the padding box, so padding renders as 1px and the
     * border makes up the difference. The invariant that matches the design is
     * the distance from the outer edge to the text: padding + border = 2px.
     */
    const inset = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
    await expect(inset).toBe(2);
    await expect(cs.paddingLeft).toBe('8px');
    await expect(cs.columnGap).toBe('4px');
    // Figma's label is Medium (500); this was semibold in code until measured.
    await expect(cs.fontWeight).toBe('500');
  },
};

/** The dot inherits the intent colour rather than carrying its own token. */
export const DotInheritsIntentColour: Story = {
  render: (args) => (
    <Badge {...args} intent="error" dot>
      Failed
    </Badge>
  ),
  play: async ({ canvas }) => {
    const badge = canvas.getByText('Failed');
    const dot = badge.querySelector('.ion-badge__dot') as HTMLElement;
    await expect(dot).toBeTruthy();
    await expect(getComputedStyle(dot).backgroundColor).toBe(
      getComputedStyle(badge).color,
    );
    // Decorative — the text beside it already says what this means.
    await expect(dot).toHaveAttribute('aria-hidden', 'true');
  },
};

/**
 * Every intent meets WCAG AA against its own surface, in BOTH themes.
 *
 * This exists because two of them did not. `text/error` on
 * `surface/error-subtle` measured 3.38:1 in dark and `text/information`
 * 4.12:1 — both shipped, both invisible to every check the repo had, because
 * the token pipeline verifies that names and aliases resolve and never that
 * the resulting pair can be read.
 *
 * BOTH THEMES IS THE WHOLE POINT. Storybook renders light by default, and both
 * failures were in dark — a light-only version of this story would have passed
 * against the very bug it was written for. The dark half is rendered inside a
 * `data-theme="dark"` wrapper rather than by toggling the toolbar, because the
 * theme is applied by attribute selector and custom properties inherit, so a
 * subtree gets the dark values without touching global state.
 *
 * Badge label type is `type/body-sm` (14px, regular), which is normal text
 * under WCAG 1.4.3 — the 3:1 large-text allowance does not apply, so the bar
 * is 4.5:1.
 *
 * Measured from the rendered element, not the token JSON: this is what a
 * reader actually gets, after inheritance and any theme override.
 */
export const IntentsMeetContrastAA: Story = {
  render: () => {
    const intents = [
      'neutral',
      'primary',
      'success',
      'warning',
      'error',
      'information',
    ] as const;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {(['light', 'dark'] as const).map((theme) => (
          <div
            key={theme}
            data-theme={theme}
            data-testid={`theme-${theme}`}
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              padding: '12px',
              background: 'var(--surface-page)',
            }}
          >
            {intents.map((intent) => (
              <Badge key={intent} intent={intent}>
                {theme}-{intent}
              </Badge>
            ))}
          </div>
        ))}
      </div>
    );
  },
  play: async ({ canvas }) => {
    const luminance = (rgb: string) => {
      const [r, g, b] = rgb
        .match(/\d+(\.\d+)?/g)!
        .slice(0, 3)
        .map(Number);
      const lin = [r, g, b]
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    const ratio = (fg: string, bg: string) => {
      const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    };

    const failures: string[] = [];
    for (const theme of ['light', 'dark']) {
      for (const intent of [
        'neutral',
        'primary',
        'success',
        'warning',
        'error',
        'information',
      ]) {
        const badge = canvas.getByText(`${theme}-${intent}`);
        const cs = getComputedStyle(badge);
        const r = ratio(cs.color, cs.backgroundColor);
        if (r < 4.5) failures.push(`${theme}/${intent} ${r.toFixed(2)}:1`);
      }
    }

    // Collected rather than asserted one-by-one, so a regression names every
    // broken pairing at once instead of stopping at the first.
    await expect(failures).toEqual([]);
  },
};
