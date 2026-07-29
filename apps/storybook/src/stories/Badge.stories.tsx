import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Badge } from '@ionbase/react';
import { Icon } from '@ionbase/icons';
import { Check, TriangleAlert } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    intent: {
      control: 'select',
      options: ['neutral', 'brand', 'success', 'warning', 'danger', 'info'],
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
  'brand',
  'success',
  'warning',
  'danger',
  'info',
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
    <Badge {...args} intent="danger" dot>
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
