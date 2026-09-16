import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Spinner } from 'ionbase-ui';

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { label: 'Loading invoices' },
  parameters: {
    docs: {
      description: {
        component:
          'An indeterminate wait, announced once.\n\n**The label is the component.** A spinning ring with no text is silence to a screen reader — the user is told nothing is happening. Generated code in this repo\'s eval corpus reached for a bare `role="status"` in **48 files**, which is the right instinct and half the job: the role creates a live region, and an empty live region announces nothing.\n\n**`isDecorative` is the other half.** A spinner inside a button whose label already reads "Saving…" would announce the same wait twice, and two live regions racing is worse than one. Decorative renders no role at all rather than `aria-hidden` on a live region, which browsers treat inconsistently.\n\n**Reduced motion slows the ring rather than stopping it.** A stationary spinner is not a calmer spinner; it is indistinguishable from a hung one, and it removes the only signal a sighted user has that the wait is still live. `Skeleton` makes the opposite choice, for the opposite reason.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <Spinner {...args} size="sm" label="Small" />
      <Spinner {...args} size="md" label="Medium" />
      <Spinner {...args} size="lg" label="Large" />
    </div>
  ),
};

export const WithVisibleLabel: Story = {
  args: { isLabelVisible: true },
};

/**
 * The label reaches assistive technology through the live region. This is the
 * whole contract — a spinner that fails this test is a decorative graphic that
 * tells the user nothing.
 */
export const LabelIsAnnounced: Story = {
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status');
    // A live region announces its CONTENTS; it is not named by them. `status`
    // is not a name-from-content role, so `toHaveAccessibleName` is empty here
    // and asserting it would pin the wrong contract — the text inside the
    // region is what a screen reader speaks.
    await expect(status).toHaveTextContent('Loading invoices');
    await expect(status).toHaveAttribute('aria-live', 'polite');
  },
};

/**
 * Decorative spinners have no role at all. `aria-hidden` on a live region is
 * treated inconsistently across browsers, so the role is omitted rather than
 * hidden.
 */
export const DecorativeHasNoRole: Story = {
  args: { isDecorative: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('status')).toBeNull();
    await expect(canvas.queryByText('Loading invoices')).toBeNull();
  },
};
