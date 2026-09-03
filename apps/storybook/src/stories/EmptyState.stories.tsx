import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Button, EmptyState, Icon } from 'ionbase-ui';
import { Search } from 'ionbase-icons/icons/search';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    reason: {
      control: 'select',
      options: ['first-run', 'no-results', 'no-access', 'error'],
    },
    size: { control: 'select', options: ['inline', 'panel', 'page'] },
    headingLevel: { control: 'select', options: [2, 3, 4, 5, 6] },
  },
  args: {
    reason: 'first-run',
    title: 'No invoices yet',
    description: 'Invoices appear here once a customer has been billed.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'The state a region shows when it has nothing to show — **and why**.\n\nFive of this system\'s nine patterns specify an empty state (`DataTable`, `PageShell`, `SettingsPanel`, `AssistantAnswer`, `HumanApproval`) and until this existed none of them could render one. Every consumer invented their own, which is how a design system ends up with four different ways to say "nothing here".\n\n**`reason` is required and has no default.** The four situations need different actions, and collapsing them is the most common empty-state bug in enterprise software: "No invoices yet — Create your first invoice", shown to someone who has 400 invoices and a typo in their filter, tells them their data is gone. A default would make that the easy path, so there is not one.\n\n`no-results` needs the filter cleared, not a record created. `error` needs a retry — offering "Create" over a failed fetch is how duplicates get made.\n\n**It is deliberately not a live region.** An empty state replaces content, so it is what the user reads next rather than something announced over what they are reading; `role="status"` here fires on every keystroke of a filter box. If a flow genuinely needs the announcement, pass `role` yourself.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: { action: <Button variant="primary-brand">Create invoice</Button> },
};

/**
 * The four reasons side by side. Same shape, different situation — and a
 * different correct action in each.
 */
export const Reasons: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '32px' }}>
      <EmptyState
        reason="first-run"
        title="No invoices yet"
        description="Invoices appear here once a customer has been billed."
        action={<Button variant="primary-brand">Create invoice</Button>}
      />
      <EmptyState
        reason="no-results"
        title="No invoices match these filters"
        description="12 invoices are hidden by the current date range."
        action={<Button variant="tertiary">Clear filters</Button>}
      />
      <EmptyState
        reason="no-access"
        title="You cannot view billing for this workspace"
        description="Billing is visible to workspace owners. Your role is Member."
        secondaryAction={<Button variant="tertiary">Contact an owner</Button>}
      />
      <EmptyState
        reason="error"
        title="Invoices could not be loaded"
        description="The billing service did not respond. Nothing has been changed."
        action={<Button variant="secondary">Try again</Button>}
      />
    </div>
  ),
};

/** `inline` fits a table body; `page` owns a route. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      <EmptyState
        size="inline"
        reason="no-results"
        title="No rows match this search"
      />
      <EmptyState
        size="panel"
        reason="no-results"
        title="No rows match this search"
        description="Try a shorter query."
      />
      <EmptyState
        size="page"
        reason="first-run"
        title="Nothing here yet"
        description="This is what a whole empty route looks like."
        action={<Button variant="primary-brand">Get started</Button>}
      />
    </div>
  ),
};

/**
 * The title is a real heading, so the region survives in the document outline
 * and a screen-reader user can reach it by heading navigation.
 */
export const TitleIsAHeading: Story = {
  args: { headingLevel: 2, title: 'No invoices yet' },
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { name: 'No invoices yet' });
    await expect(heading).toBeInTheDocument();
    await expect(heading.tagName).toBe('H2');
  },
};

/**
 * The icon is decorative. The title already states the situation, so a labelled
 * icon would make a screen reader say it twice.
 */
export const IconIsHiddenFromScreenReaders: Story = {
  args: {
    reason: 'no-results',
    title: 'No invoices match these filters',
    icon: <Icon as={Search} size="xl" />,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole('heading', { name: 'No invoices match these filters' }),
    ).toBeInTheDocument();

    const icon = canvasElement.querySelector('.ion-empty-state__icon');
    await expect(icon).toHaveAttribute('aria-hidden', 'true');

    // Nothing in the region announces itself twice.
    await expect(
      canvas.queryAllByRole('img', { name: /no invoices/i }),
    ).toHaveLength(0);
  },
};

/**
 * Not a live region — the guarantee the contract makes. An empty state that
 * announced itself would interrupt on every keystroke of a filter box.
 */
export const NotALiveRegion: Story = {
  args: { reason: 'no-results', title: 'No invoices match these filters' },
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector('.ion-empty-state');
    await expect(region).not.toHaveAttribute('aria-live');
    await expect(region).not.toHaveAttribute('role', 'status');
    await expect(region).not.toHaveAttribute('role', 'alert');
  },
};

/**
 * The action slot renders in the DOM before the secondary one, so keyboard
 * order reaches the resolving action first.
 */
export const ActionOrder: Story = {
  args: {
    reason: 'no-access',
    title: 'You cannot view billing for this workspace',
    action: <Button variant="primary-brand">Request access</Button>,
    secondaryAction: <Button variant="tertiary">Contact an owner</Button>,
  },
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button');
    await expect(buttons[0]).toHaveTextContent('Request access');
    await expect(buttons[1]).toHaveTextContent('Contact an owner');
  },
};
