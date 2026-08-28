import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { AvatarGradient } from 'ionbase-ui';

const COLORS = [
  'slate',
  'blue',
  'violet',
  'pink',
  'orange',
  'green',
  'red',
] as const;

const meta: Meta<typeof AvatarGradient> = {
  title: 'Components/Avatar Gradient',
  component: AvatarGradient,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['mini', 'sm', 'md', 'lg'] },
    color: { control: 'select', options: COLORS },
  },
  args: { initials: 'AB', alt: 'Ada Byron' },
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Avatar Gradient` — Mini 24, Small 32, Medium 40, Large 48. Circle only: the set has no `Shape` axis, because a gradient this directional does not survive a corner.\n\nSeven colours, each a `--color-<hue>-300` to `-200` to `-50` run down the disc with the initials on `-600`. Every rung is already in the palette, so the component needed no new token, and every stop is variable-bound in Figma rather than eyeballed.\n\nThis is Avatar's initials-only sibling, not a replacement for it. There is no image, no icon, no square, no ring and no status indicator here; if you need any of those, use `Avatar`.\n\nIt used to be the other way up — a saturated disc with white initials — and four of its colours failed WCAG AA at 3.5 to 3.8:1. That was fixed in Figma by inverting it rather than patched in CSS, which is why the pale version is the one that ships.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AvatarGradient>;

export const Default: Story = {};

/** Figma's `Color` axis, at every size. */
export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {COLORS.map((color) => (
        <div
          key={color}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          {(['lg', 'md', 'sm', 'mini'] as const).map((size) => (
            <AvatarGradient
              key={size}
              color={color}
              size={size}
              initials="AB"
              alt={`${color} ${size}`}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {(['mini', 'sm', 'md', 'lg'] as const).map((size) => (
        <AvatarGradient key={size} {...args} size={size} />
      ))}
    </div>
  ),
};

/**
 * Beside `Avatar`, which is what this is for: the people with photos keep
 * them, and the ones without get a disc rather than a grey box.
 */
export const AlongsideAvatar: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <AvatarGradient color="violet" initials="AB" alt="Ada Byron" />
      <AvatarGradient color="blue" initials="GH" alt="Grace Hopper" />
      <AvatarGradient color="slate" initials="KJ" alt="Katherine Johnson" />
      <AvatarGradient color="green" initials="MW" alt="Mary Wilkes" />
    </div>
  ),
};

/** Figma: 24 / 32 / 40 / 48, and a full-round corner at every one of them. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <div>
      {(['mini', 'sm', 'md', 'lg'] as const).map((size) => (
        <AvatarGradient key={size} size={size} initials="AB" alt={size} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const [size, px] of [
      ['mini', 24],
      ['sm', 32],
      ['md', 40],
      ['lg', 48],
    ] as const) {
      const el = canvas.getByLabelText(size);
      const box = el.getBoundingClientRect();

      await expect(Math.round(box.width)).toBe(px);
      await expect(Math.round(box.height)).toBe(px);
      // Circle at every size — `--radius-full` resolves to 9999px, which the
      // browser clamps to half the box.
      await expect(getComputedStyle(el).borderRadius).toBe('9999px');
    }
  },
};

/**
 * The gradient is a real gradient, not a flat fill — and the flat colour
 * underneath it is the palest end, deliberately. It is the fallback if the
 * image layer never paints, and it is the worst case for the dark initials,
 * which is what makes the contrast gate measure the pairing that needs
 * measuring rather than a flattering one.
 */
export const GradientPaintsOverAFlatFallback: Story = {
  render: () => <AvatarGradient color="blue" initials="AB" alt="Ada Byron" />,
  play: async ({ canvas }) => {
    const el = canvas.getByLabelText('Ada Byron');
    const style = getComputedStyle(el);

    await expect(style.backgroundImage).toContain('linear-gradient');
    await expect(style.backgroundImage).toContain('radial-gradient');
    // `--color-blue-50`, the bottom of the run and the palest thing the
    // initials ever sit on.
    await expect(style.backgroundColor).toBe('rgb(235, 247, 255)');
  },
};

/**
 * Two letters are not a name. `alt` is what the screen reader gets, and the
 * initials themselves are hidden from it rather than spelled out.
 */
export const InitialsAreLabelledNotSpelled: Story = {
  render: () => <AvatarGradient color="violet" initials="AB" alt="Ada Byron" />,
  play: async ({ canvas }) => {
    const el = canvas.getByLabelText('Ada Byron');
    await expect(el).toHaveAttribute('role', 'img');
    await expect(el.textContent).toBe('AB');
    await expect(el.querySelector('[aria-hidden="true"]')).toBeTruthy();
  },
};
