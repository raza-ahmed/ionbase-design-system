import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Divider } from 'ionbase-ui';

const meta: Meta<typeof Divider> = {
  title: 'Components/Divider',
  component: Divider,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Border` (70:22153) — a single 1px line, `border/strong` rather than `border/default`. Every other hairline in the system (Input, Table row rules, Menu) reads `border/default`; a divider is drawn at the stronger weight deliberately, since separating things is its only job.\n\nRenders an `<hr>`, not a styled `<div>` — a real thematic break, announced as one without needing a `role`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <p style={{ margin: 0 }}>Above</p>
      <Divider />
      <p style={{ margin: 0 }}>Below</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: 40 }}
    >
      <span>Left</span>
      <Divider orientation="vertical" />
      <span>Right</span>
    </div>
  ),
};

/** Figma: 1px, `border/strong` — not `border/default` like every other
 *  hairline in the system. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => <Divider aria-label="divider" />,
  play: async ({ canvasElement }) => {
    const hr = canvasElement.querySelector('.ion-divider') as HTMLElement;
    const cs = getComputedStyle(hr);

    await expect(cs.height).toBe('1px');

    const strong = getComputedStyle(document.documentElement)
      .getPropertyValue('--border-strong')
      .trim();
    const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(strong.slice(i, i + 2), 16)).join(', ')})`;
    await expect(cs.backgroundColor).toBe(rgb);
  },
};

/** A vertical divider announces its orientation; a horizontal one needs no
 *  extra attribute — `<hr>` is already a thematic break either way. */
export const VerticalAnnouncesOrientation: Story = {
  render: () => (
    <div>
      <Divider aria-label="horizontal-divider" />
      <Divider orientation="vertical" aria-label="vertical-divider" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const horizontal = canvasElement.querySelector(
      '.ion-divider--horizontal',
    ) as HTMLElement;
    const vertical = canvasElement.querySelector(
      '.ion-divider--vertical',
    ) as HTMLElement;

    await expect(horizontal).not.toHaveAttribute('aria-orientation');
    await expect(vertical).toHaveAttribute('aria-orientation', 'vertical');
  },
};
