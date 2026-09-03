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
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    shape: { control: 'select', options: ['pill', 'rounded'] },
    dot: { control: 'boolean' },
  },
  args: { intent: 'neutral', size: 'sm', shape: 'pill', children: 'Badge' },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Badge` (152:73). Six intents x three sizes x two shapes. Badge is not a control — it has no hit target and no state — so it does not read the control scale. Heights are pinned to `spacing/20|24|32` rather than derived from padding.',
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
    const badge = canvas
      .getByText('Badge')
      .closest('.ion-badge') as HTMLElement;
    const cs = getComputedStyle(badge);

    // Pinned, not derived. Figma binds this to spacing/20.
    await expect(Math.round(badge.getBoundingClientRect().height)).toBe(20);

    /*
     * Figma's 1px stroke is drawn INSIDE the box; a CSS border sits outside the
     * padding box. The invariant that matches the design is the distance from
     * the outer edge to the content: padding + border = Figma's 4px.
     */
    const inset = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    await expect(inset).toBe(4);
    await expect(cs.columnGap).toBe('4px');
    // Figma's label is Medium (500); this was semibold in code until measured.
    await expect(cs.fontWeight).toBe('500');

    /*
     * The label's own inline padding is Figma's `Label Slot` frame, which the
     * dot and icon do not get. Text therefore sits 4 + 2 = 6 from the edge.
     */
    const label = badge.querySelector('.ion-badge__label') as HTMLElement;
    await expect(getComputedStyle(label).paddingLeft).toBe('2px');
  },
};

/**
 * Heights come from the height token, never from padding — the failure that
 * left Button's ramp 2px off on every size.
 */
export const SizeRampIsPinned: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
  play: async ({ canvas }) => {
    const expected: Array<[string, number, string]> = [
      ['Small', 20, '2px'],
      ['Medium', 24, '4px'],
      ['Large', 32, '6px'],
    ];
    for (const [text, height, labelPad] of expected) {
      const badge = canvas.getByText(text).closest('.ion-badge') as HTMLElement;
      await expect(Math.round(badge.getBoundingClientRect().height)).toBe(
        height,
      );
      const label = badge.querySelector('.ion-badge__label') as HTMLElement;
      await expect(getComputedStyle(label).paddingLeft).toBe(labelPad);
    }
  },
};

/** Rounded steps its corner with the size; pill stays fully round. */
export const ShapeStepsWithSize: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Badge shape="rounded">Small</Badge>
      <Badge shape="rounded" size="md">
        Medium
      </Badge>
      <Badge shape="rounded" size="lg">
        Large
      </Badge>
      <Badge>Pill</Badge>
    </div>
  ),
  play: async ({ canvas }) => {
    for (const [text, radius] of [
      ['Small', 4],
      ['Medium', 6],
      ['Large', 8],
    ] as Array<[string, number]>) {
      const badge = canvas.getByText(text).closest('.ion-badge') as HTMLElement;
      await expect(
        parseFloat(getComputedStyle(badge).borderTopLeftRadius),
      ).toBe(radius);
    }
    // The pill's radius is clamped by the browser to half the height, not 4/6/8.
    const pill = canvas.getByText('Pill').closest('.ion-badge') as HTMLElement;
    await expect(
      parseFloat(getComputedStyle(pill).borderTopLeftRadius),
    ).toBeGreaterThan(8);
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
    const badge = canvas
      .getByText('Failed')
      .closest('.ion-badge') as HTMLElement;
    const dot = badge.querySelector('.ion-badge__dot') as HTMLElement;
    await expect(dot).toBeTruthy();
    await expect(getComputedStyle(dot).backgroundColor).toBe(
      getComputedStyle(badge).color,
    );
    // Decorative — the text beside it already says what this means.
    await expect(dot).toHaveAttribute('aria-hidden', 'true');
  },
};
