import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { ProgressBar } from 'ionbase-ui';

const meta: Meta<typeof ProgressBar> = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    intent: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'error'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
  },
  args: { label: 'Importing records', value: 42 },
  parameters: {
    docs: {
      description: {
        component:
          'A determinate or indeterminate measure of work.\n\n**Omitting `value` is what makes it indeterminate**, and `aria-valuenow` is then omitted with it — which is what the ARIA spec asks for and the detail hand-rolled progress bars get wrong most often. A bar reporting `aria-valuenow="0"` forever tells a screen reader the work is stuck at zero, not that it is unmeasured.\n\n**Determinate and indeterminate are one component on purpose.** Work that starts unmeasurable and becomes measurable is the common case — an upload that learns its size on the first chunk. Two components would make that transition a swap, and a swap remounts the node and takes the live region with it, so the moment progress becomes known is the moment the announcement dies.\n\n**`label` is required.** `role="progressbar"` announces a number; a number with no noun sounds like information while carrying none.\n\n`intent` describes **the value**, not the health of the request. A quota over its limit is `error`; a failed fetch is an `Alert`.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {};

export const WithVisibleLabelAndValue: Story = {
  args: { isLabelVisible: true, isValueVisible: true },
};

export const Intents: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ProgressBar {...args} intent="primary" label="Primary" value={40} />
      <ProgressBar {...args} intent="success" label="Success" value={100} />
      <ProgressBar {...args} intent="warning" label="Warning" value={80} />
      <ProgressBar {...args} intent="error" label="Error" value={97} />
    </div>
  ),
};

export const Indeterminate: Story = {
  args: { value: undefined },
};

/** The bar is named and its value is reported. */
export const DeterminateReportsItsValue: Story = {
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar');
    await expect(bar).toHaveAccessibleName('Importing records');
    await expect(bar).toHaveAttribute('aria-valuenow', '42');
  },
};

/**
 * The detail that matters: indeterminate omits `aria-valuenow` ENTIRELY. The
 * tempting alternative — `aria-valuenow={0}` — announces "stuck at zero" rather
 * than "not measured", and is the most common defect in hand-rolled bars.
 */
export const IndeterminateOmitsValueNow: Story = {
  args: { value: undefined },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar');
    await expect(bar).not.toHaveAttribute('aria-valuenow');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
  },
};

/** A caller cannot render a bar past its own end. */
export const ValueIsClamped: Story = {
  args: { value: 140 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  },
};

/** `valueText` replaces the percentage, because a percentage is rarely what a
 *  person wants read aloud. */
export const ValueTextReplacesThePercentage: Story = {
  args: { value: 3, max: 12, valueText: '3 of 12 files' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '3 of 12 files',
    );
  },
};
