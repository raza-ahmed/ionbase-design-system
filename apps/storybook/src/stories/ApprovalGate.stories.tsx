import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { ApprovalGate } from 'ionbase-ui';

const meta: Meta<typeof ApprovalGate> = {
  title: 'Components/ApprovalGate',
  component: ApprovalGate,
  tags: ['autodocs'],
  argTypes: {
    risk: { control: 'select', options: ['low', 'medium', 'high'] },
    status: {
      control: 'select',
      options: ['pending', 'approved', 'rejected', 'expired'],
    },
    isSubmitting: { control: 'boolean' },
  },
  args: {
    title: 'Delete 14 projects',
    children:
      'Removes every project matching “archived before 2025”. Their build history goes with them and cannot be restored.',
    risk: 'high',
    status: 'pending',
    onApprove: fn(),
    onReject: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'The human-in-the-loop control: an agent proposes, and a person approves, rejects or amends before anything happens.\n\nNo Figma counterpart yet; structure is borrowed from `Alert`, the action row from `Button`.\n\n**It enforces nothing, and saying so is the point.** This renders a decision — the caller gates execution by not acting until `onApprove` fires. A component that *looked* like it enforced a policy would be the worst thing to ship here, because teams would rely on a guarantee that lives entirely in their own call site. `risk` changes emphasis and nothing else, for the same reason.\n\n**Not a Modal, deliberately.** A modal steals focus and hides the page — but the page is the evidence. The plan, the diff and the tool call need to stay visible while deciding, and focus is never trapped: an approval a user was rushed through is not oversight.\n\n**Neither button is focused on mount.** Autofocusing approve turns a decision into an Enter keypress on an unread page, which is exactly what an audit looks for. Reject comes first in the DOM so a keyboard reaches the safe answer first.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ApprovalGate>;

export const Default: Story = {};

export const RiskTiers: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ApprovalGate {...args} risk="low" title="Save a draft note" />
      <ApprovalGate {...args} risk="medium" title="Send 3 invitations" />
      <ApprovalGate {...args} risk="high" title="Delete 14 projects" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '`high` sits on the warning surface, **not** error. Error is for something that has gone wrong; a high-risk approval is working correctly and asking. Reserving red for failure is what keeps red meaningful when a failure happens.',
      },
    },
  },
};

export const Resolved: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ApprovalGate {...args} status="approved" />
      <ApprovalGate {...args} status="rejected" />
      <ApprovalGate {...args} status="expired" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The resolved states are not decoration: the record of the decision stays on the page. `expired` exists because an approval nobody answers is the common real outcome, and a gate that sits pending for ever is indistinguishable from one that is broken.',
      },
    },
  },
};

export const WithEdit: Story = {
  args: { onEdit: fn(), risk: 'medium', title: 'Send 3 invitations' },
};

/** The safe answer must be the one a keyboard reaches first. */
export const RejectPrecedesApprove: Story = {
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button');
    await expect(buttons[0]).toHaveTextContent('Reject');
    await expect(buttons[buttons.length - 1]).toHaveTextContent('Approve');

    // Nothing is focused on mount — the decision is not one Enter away.
    // Assert against the buttons themselves: `document.activeElement` is
    // <body>, which contains the word "Approve", so a text assertion there
    // passes regardless of focus. That is how this test was wrong the first
    // time it ran.
    await expect(
      canvas.getByRole('button', { name: 'Approve' }),
    ).not.toHaveFocus();
    await expect(
      canvas.getByRole('button', { name: 'Reject' }),
    ).not.toHaveFocus();
  },
};

export const AnnouncesTheOutcome: Story = {
  render: function Render(args) {
    const [status, setStatus] = useState<'pending' | 'approved'>('pending');
    return (
      <ApprovalGate
        {...args}
        status={status}
        onApprove={() => {
          args.onApprove?.();
          setStatus('approved');
        }}
      />
    );
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
    await expect(args.onApprove).toHaveBeenCalledTimes(1);

    // The actions are replaced by the record, and it is announced.
    await waitFor(async () => {
      await expect(canvas.getByRole('status')).toHaveTextContent('Approved');
    });
    await expect(
      canvas.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument();
  },
};

/** A named region, so a screen-reader user can find the decision waiting. */
export const IsANamedRegion: Story = {
  play: async ({ canvas }) => {
    const region = canvas.getByRole('region', { name: 'Delete 14 projects' });
    await expect(region).toBeInTheDocument();
  },
};
