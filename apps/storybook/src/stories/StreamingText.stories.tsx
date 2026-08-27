import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { StreamingText } from 'ionbase-ui';

const meta: Meta<typeof StreamingText> = {
  title: 'Components/StreamingText',
  component: StreamingText,
  tags: ['autodocs'],
  argTypes: {
    isStreaming: { control: 'boolean' },
    minLines: { control: 'number' },
  },
  args: {
    isStreaming: true,
    children:
      'The invoice archive contains 12 matching records for Q3. Three are still unpaid,',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Model output arriving a token at a time.\n\n**It is not a live region, and that is the whole design.** The obvious implementation — `aria-live="polite"` on the container — is the one that makes a screen reader unusable: every token mutation queues an announcement, so the user hears the answer re-read and stuttered dozens of times and cannot get ahead of it. `aria-live="off"` here is the accessible choice, not an oversight.\n\nInstead it sets `aria-busy` while streaming, so assistive tech knows the region is unsettled, and the text stays ordinary readable content throughout — a screen-reader user reads ahead exactly as a sighted user does.\n\n**Announcing completion is the caller\'s call.** Some surfaces want "response complete"; a chat with ten turns on screen does not want ten of them.\n\n`minLines` reserves height in `lh` units so the content below does not climb the screen while someone is reading. The cursor is a styled box rather than a text character — some screen readers read a literal ▌ aloud even inside an aria-hidden span — and it stops blinking under `prefers-reduced-motion` (WCAG 2.3.1).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StreamingText>;

export const Streaming: Story = {};

export const Settled: Story = {
  args: {
    isStreaming: false,
    children:
      'The invoice archive contains 12 matching records for Q3. Three are still unpaid, and two of those are past 60 days.',
  },
};

export const ReservedHeight: Story = {
  args: { minLines: 5, children: 'Working…' },
  parameters: {
    docs: {
      description: {
        story:
          'Costs blank space at the start and buys a layout that does not move. A container that grows token by token drags the whole page, which is worse under magnification than the wait.',
      },
    },
  },
};

/**
 * The accessibility contract, pinned. If someone "helpfully" adds
 * `aria-live="polite"` here, this fails.
 */
export const IsNotALiveRegion: Story = {
  args: { label: 'Assistant response' },
  play: async ({ canvas }) => {
    const region = canvas.getByRole('region', { name: 'Assistant response' });
    await expect(region).toHaveAttribute('aria-live', 'off');
    await expect(region).toHaveAttribute('aria-busy', 'true');
  },
};
