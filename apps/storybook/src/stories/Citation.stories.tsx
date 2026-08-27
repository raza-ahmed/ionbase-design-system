import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Citation, CitationList, CitationListItem } from 'ionbase-ui';

const meta: Meta<typeof Citation> = {
  title: 'Components/Citation',
  component: Citation,
  tags: ['autodocs'],
  args: { index: 1, source: 'Q3 invoice archive', href: '#q3' },
  parameters: {
    docs: {
      description: {
        component:
          'Source attribution, inline and as a footer list.\n\n**The marker is not the name.** Rendered naively, a superscript "1" announces as "link, 1", which tells a screen-reader user nothing about whether to follow it. The visible marker stays a number; the accessible name is "Source 1: Q3 invoice archive". The number is for the eye and the sentence is for everyone.\n\n**Not a tooltip.** A tooltip cannot be reached on touch and closes on the way to it; attribution has to survive both.\n\n**Without `href` it is not a link.** A citation to a phone call or an internal document has no address, and a dead anchor would put an unfollowable link in the page\'s link list.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Citation>;

export const InProse: Story = {
  render: (args) => (
    <p style={{ maxWidth: '48ch' }}>
      Three invoices are still unpaid past 60 days
      <Citation {...args} />, and the largest is with a customer already in
      collections
      <Citation index={2} source="Collections ledger, 27 Aug" href="#ledger" />.
    </p>
  ),
};

export const WithoutAnAddress: Story = {
  args: { href: undefined, source: 'Call with the billing team, 26 Aug' },
  parameters: {
    docs: {
      description: {
        story:
          'No `href`, so it renders a marked-up reference rather than a dead anchor. It keeps its accessible name and stays out of the page’s link list.',
      },
    },
  },
};

export const Footer: Story = {
  render: () => (
    <CitationList>
      <CitationListItem index={1} source="Q3 invoice archive" href="#q3">
        12 records matched, 3 unpaid.
      </CitationListItem>
      <CitationListItem
        index={2}
        source="Collections ledger, 27 Aug"
        href="#ledger"
      >
        One account escalated on 14 Aug.
      </CitationListItem>
      <CitationListItem index={3} source="Call with the billing team, 26 Aug" />
    </CitationList>
  ),
};

/** The marker's accessible name is the sentence, not the digit. */
export const NameIsTheSourceNotTheNumber: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', {
      name: 'Source 1: Q3 invoice archive',
    });
    await expect(link).toBeInTheDocument();
    // ...and the bare number is not what gets announced.
    await expect(
      canvas.queryByRole('link', { name: '1' }),
    ).not.toBeInTheDocument();
  },
};
