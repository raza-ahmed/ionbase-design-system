import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { AgentStop } from 'ionbase-ui';

const meta: Meta<typeof AgentStop> = {
  title: 'Components/AgentStop',
  component: AgentStop,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    isStopping: { control: 'boolean' },
    stopOnEscape: { control: 'boolean' },
  },
  args: { onStop: fn(), size: 'md', isStopping: false },
  parameters: {
    docs: {
      description: {
        component:
          "The always-visible way to end a run. **Not optional, and not behind a menu** — a user who cannot stop an agent is watching it, not supervising it.\n\nNo Figma counterpart yet; the measurements are borrowed from `Button` rather than invented.\n\n**It does not stop anything.** It reports intent. Aborting the request, closing the stream and settling the state are the caller's — a stop that resolves optimistically while output keeps arriving lies about the guarantee the user is relying on.\n\nThree things it owns that a plain `Button` does not: it keeps its place while stopping rather than vanishing; it announces the transition through a live region, because a label change is only heard if the button holds focus; and it is deliberately not destructive-red, since colouring it like a delete teaches hesitation about the one control that must never be hesitated over.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AgentStop>;

export const Default: Story = {};

export const Stopping: Story = {
  args: { isStopping: true },
  parameters: {
    docs: {
      description: {
        story:
          'The only correct disabled state: after the request, never before. The label changes, the square shrinks, and the control keeps its place so nothing moves under the pointer.',
      },
    },
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <AgentStop {...args} size="sm" />
      <AgentStop {...args} size="md" />
      <AgentStop {...args} size="lg" />
    </div>
  ),
};

/**
 * The whole point, exercised: press it, the caller flips `isStopping`, and the
 * control stays on screen through the transition.
 */
export const StaysThroughTheTransition: Story = {
  render: function Render(args) {
    const [stopping, setStopping] = useState(false);
    return (
      <AgentStop
        {...args}
        isStopping={stopping}
        onStop={() => {
          args.onStop?.();
          setStopping(true);
        }}
      />
    );
  },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: 'Stop' });
    await userEvent.click(button);
    await expect(args.onStop).toHaveBeenCalledTimes(1);

    // Still present, relabelled, disabled — not unmounted.
    const after = canvas.getByRole('button', { name: 'Stopping…' });
    await expect(after).toBeDisabled();

    // And the transition was announced, which a label change alone would not do
    // unless the button happened to hold focus.
    await waitFor(async () => {
      await expect(canvas.getByRole('status')).toHaveTextContent('Stopping…');
    });
  },
};

/**
 * Escape is opt-in, and even then a dialog owns it. This pins the carve-out:
 * pressing Escape from inside a `role="dialog"` must not cancel the run.
 */
export const EscapeDoesNotLeakOutOfDialogs: Story = {
  args: { stopOnEscape: true },
  render: (args) => (
    <div>
      <AgentStop {...args} />
      <div role="dialog" aria-label="A dialog over the run">
        <input aria-label="field in dialog" />
      </div>
    </div>
  ),
  play: async ({ canvas, args }) => {
    const field = canvas.getByLabelText('field in dialog');
    field.focus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onStop).not.toHaveBeenCalled();

    // ...but Escape from outside the dialog does stop the run.
    canvas.getByRole('button', { name: 'Stop' }).focus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onStop).toHaveBeenCalledTimes(1);
  },
};
