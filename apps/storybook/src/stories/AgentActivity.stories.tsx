import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { AgentActivity, AgentActivityStep } from 'ionbase-ui';

const meta: Meta<typeof AgentActivity> = {
  title: 'Components/AgentActivity',
  component: AgentActivity,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'What the agent is doing, in plain language.\n\nAn ordered list, because the steps happened in an order and a screen reader should be able to say "3 of 7". Not a log viewer: this is the account a person reads to decide whether to let the run continue, so the text belongs in their language — "Searched the invoice archive", not `searchIndex(q, {limit:50})`.\n\n**Status is never carried by the icon alone.** Every step renders its status as visually hidden text as well as a glyph, and the glyphs differ in shape rather than only colour — so the list survives greyscale, colour blindness and forced-colours mode. A row of coloured dots fails WCAG 1.4.1 outright.\n\nThe active step is announced once when it changes, read out of the children rather than taken as a prop — two sources for one fact is how they come to disagree.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AgentActivity>;

export const Default: Story = {
  render: (args) => (
    <AgentActivity {...args}>
      <AgentActivityStep status="done" detail="12 matches">
        Searched the invoice archive
      </AgentActivityStep>
      <AgentActivityStep status="done" detail="3 unpaid">
        Read the matching records
      </AgentActivityStep>
      <AgentActivityStep status="active">
        Drafting the summary
      </AgentActivityStep>
      <AgentActivityStep status="pending">Send for approval</AgentActivityStep>
    </AgentActivity>
  ),
};

export const AllStatuses: Story = {
  render: (args) => (
    <AgentActivity {...args} announceActive={false}>
      <AgentActivityStep status="pending">Queued</AgentActivityStep>
      <AgentActivityStep status="active">Running now</AgentActivityStep>
      <AgentActivityStep status="done" detail="204 rows">
        Finished
      </AgentActivityStep>
      <AgentActivityStep status="failed" detail="Timed out after 30s">
        Could not reach the billing API
      </AgentActivityStep>
      <AgentActivityStep status="skipped" detail="Cached from 09:14">
        Recompute totals
      </AgentActivityStep>
    </AgentActivity>
  ),
};

/** Status must be readable without colour. */
export const StatusIsAlsoText: Story = {
  render: (args) => (
    <AgentActivity {...args}>
      <AgentActivityStep status="failed">
        Could not reach the API
      </AgentActivityStep>
    </AgentActivity>
  ),
  play: async ({ canvas }) => {
    const item = canvas.getByRole('listitem');
    await expect(item).toHaveTextContent('Failed');
  },
};

export const AnnouncesTheActiveStep: Story = {
  render: (args) => (
    <AgentActivity {...args}>
      <AgentActivityStep status="done">Searched the archive</AgentActivityStep>
      <AgentActivityStep status="active">
        Drafting the summary
      </AgentActivityStep>
    </AgentActivity>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Drafting the summary',
    );
  },
};
