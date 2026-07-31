import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Toggle } from '@ionbase-ui/react';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    intent: {
      control: 'inline-radio',
      options: ['brand', 'neutral', 'danger'],
    },
  },
  args: { children: 'Toggle label' },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Toggle` — 3 colours x 3 sizes x 2 states. A checkbox with `role="switch"`: a switch is a form value, so the checkbox gives form association and `:checked` for free, and the role only changes how it is announced.\n\nThe track size is **derived**, not measured. 36/44/52 x 20/24/28 are on no ladder, but the track is exactly `thumb + 2 x inset` tall and `2 x thumb + 2 x inset` wide, so the only stated numbers are the thumb (16/20/24) and the inset (2).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Toggle {...args} size="sm" defaultChecked>
        Small
      </Toggle>
      <Toggle {...args} size="md" defaultChecked>
        Medium
      </Toggle>
      <Toggle {...args} size="lg" defaultChecked>
        Large
      </Toggle>
    </div>
  ),
};

export const Intents: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Toggle {...args} intent="brand" defaultChecked>
        Brand
      </Toggle>
      <Toggle {...args} intent="neutral" defaultChecked>
        Neutral
      </Toggle>
      <Toggle {...args} intent="danger" defaultChecked>
        Danger
      </Toggle>
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Toggle {...args}>Off</Toggle>
      <Toggle {...args} defaultChecked>
        On
      </Toggle>
      <Toggle {...args} disabled>
        Disabled off
      </Toggle>
      <Toggle {...args} disabled defaultChecked>
        Disabled on
      </Toggle>
    </div>
  ),
};

/**
 * The derived track has to land on Figma's measured numbers, or the derivation
 * is a nice idea that produces the wrong control.
 */
export const DerivedTrackMatchesFigma: Story = {
  render: (args) => (
    <div>
      <Toggle {...args} size="sm" aria-label="sm" />
      <Toggle {...args} aria-label="md" />
      <Toggle {...args} size="lg" aria-label="lg" />
    </div>
  ),
  play: async ({ canvas }) => {
    const track = (label: string) =>
      canvas
        .getByLabelText(label)
        .closest('.ion-toggle')!
        .querySelector('.ion-toggle__track') as HTMLElement;

    for (const [label, w, h] of [
      ['sm', 36, 20],
      ['md', 44, 24],
      ['lg', 52, 28],
    ] as const) {
      const r = track(label).getBoundingClientRect();
      await expect(Math.round(r.width)).toBe(w);
      await expect(Math.round(r.height)).toBe(h);
    }
  },
};

/**
 * Figma's On track carries NO stroke. Keeping a 1px border would make the on
 * track 2px narrower than the design and shift the thumb, so the border goes
 * transparent rather than away — the box must not resize between states.
 */
export const OnTrackKeepsItsBoxWithoutABorder: Story = {
  render: (args) => (
    <div>
      <Toggle {...args} aria-label="off" />
      <Toggle {...args} defaultChecked aria-label="on" />
    </div>
  ),
  play: async ({ canvas }) => {
    const track = (label: string) =>
      canvas
        .getByLabelText(label)
        .closest('.ion-toggle')!
        .querySelector('.ion-toggle__track') as HTMLElement;

    const off = track('off');
    const on = track('on');

    await expect(getComputedStyle(on).borderTopColor).toBe('rgba(0, 0, 0, 0)');
    // Same width despite one having a visible border and one not.
    await expect(Math.round(off.getBoundingClientRect().width)).toBe(
      Math.round(on.getBoundingClientRect().width),
    );
  },
};

/** `role="switch"` so it is announced on/off rather than checked/unchecked. */
export const AnnouncedAsASwitch: Story = {
  render: (args) => <Toggle {...args} aria-label="wifi" />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('wifi');
    await expect(input).toHaveAttribute('role', 'switch');
    await expect(input).toHaveAttribute('type', 'checkbox');
  },
};
