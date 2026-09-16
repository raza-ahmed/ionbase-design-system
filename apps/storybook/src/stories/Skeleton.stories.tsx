import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Skeleton } from 'ionbase-ui';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['text', 'circle', 'rect'] },
  },
  args: { variant: 'text' },
  parameters: {
    docs: {
      description: {
        component:
          'The shape of content that has not arrived.\n\n**Every skeleton is `aria-hidden`, with no way to opt out.** A skeleton is a picture of content, and a screen reader cannot use a picture of content — announcing it puts a stream of empty boxes between the user and the thing they asked for. A prop to disable that would only ever be used by mistake.\n\n**Which means the caller owes the announcement.** Hiding the placeholder is half an answer; something still has to say the region is loading. That belongs on the region being replaced, because only the caller knows where it starts and ends:\n\n```tsx\n<section aria-busy={isLoading}>\n  {isLoading ? <Skeleton lines={3} /> : <Rows data={data} />}\n</section>\n```\n\nThis is the one component in the system whose correct use requires something of the caller that the type system cannot check.\n\n**Reduced motion stops the pulse outright**, unlike `Spinner` and `ProgressBar`, which slow down instead. Those two are the only evidence a wait is live; a skeleton conveys nothing a static block does not, so there is no signal to preserve.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton {...args} variant="text" lines={3} />
      <Skeleton {...args} variant="circle" />
      <Skeleton {...args} variant="rect" />
    </div>
  ),
};

/** A paragraph's worth, with the last line short — real paragraphs end
 *  mid-measure, and a block of equal lines reads as a table. */
export const TextLines: Story = {
  args: { lines: 4 },
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('.ion-skeleton-group');
    await expect(group).not.toBeNull();
    await expect(group!.children).toHaveLength(4);
    await expect(group!.children[3]).toHaveClass('ion-skeleton--last');
  },
};

/**
 * Hidden from assistive technology, always. This is the contract the component
 * cannot compromise on, so it is pinned rather than described.
 */
export const IsHiddenFromAssistiveTech: Story = {
  args: { lines: 2 },
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('.ion-skeleton-group');
    await expect(group).toHaveAttribute('aria-hidden', 'true');
  },
};

/**
 * The shape the docs prescribe: the skeleton is hidden, and the REGION carries
 * `aria-busy`. Without that pairing a screen-reader user is told nothing at all
 * — the region simply reads as empty.
 */
export const TheCallerOwnsAriaBusy: Story = {
  render: (args) => (
    <section aria-busy="true" aria-label="Recent invoices">
      <Skeleton {...args} lines={3} />
    </section>
  ),
  play: async ({ canvas }) => {
    const region = canvas.getByLabelText('Recent invoices');
    await expect(region).toHaveAttribute('aria-busy', 'true');
  },
};
