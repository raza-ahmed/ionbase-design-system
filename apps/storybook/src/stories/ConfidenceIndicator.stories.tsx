import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { ConfidenceIndicator } from 'ionbase-ui';

const meta: Meta<typeof ConfidenceIndicator> = {
  title: 'Components/ConfidenceIndicator',
  component: ConfidenceIndicator,
  tags: ['autodocs'],
  argTypes: {
    level: { control: 'select', options: ['low', 'medium', 'high'] },
  },
  args: { level: 'high', basis: '3 of 4 sources agree' },
  parameters: {
    docs: {
      description: {
        component:
          'How much to trust the thing next to it.\n\n**There is no percentage prop, and there will not be one.** "87% confident" reads as a measurement. Almost nowhere is it one — usually a softmax score, a heuristic, or a number a model produced about itself, none of which are calibrated probabilities, and all of which invite a reader to treat two digits of precision as real. Three levels cannot overclaim that way.\n\n**`basis` is required for the same reason.** A level with nothing behind it is decoration that still changes behaviour: people act on "high confidence" whether or not anything justifies it. Making the justification a required prop is a type error rather than a policy, which is the strongest enforcement available here.\n\nThe bars differ in filled **count**, not only colour, so the reading survives greyscale and forced-colours mode. Every bar is outlined — the first draft filled the empty ones with `surface/muted`, which measures 1.05:1 against the page and made "one of three" collapse into "one bar".',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ConfidenceIndicator>;

export const Default: Story = {};

export const Levels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ConfidenceIndicator level="high" basis="3 of 4 sources agree" />
      <ConfidenceIndicator
        level="medium"
        basis="one source, corroborated by a cached total"
      />
      <ConfidenceIndicator level="low" basis="single unverified source" />
    </div>
  ),
};

/** The level is spelled out, so nothing depends on reading the meter. */
export const LevelIsAlsoText: Story = {
  args: { level: 'low', basis: 'single unverified source' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Low confidence')).toBeInTheDocument();
    await expect(
      canvas.getByText('single unverified source'),
    ).toBeInTheDocument();
  },
};
