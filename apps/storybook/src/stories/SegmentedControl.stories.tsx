import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { SegmentedControl, SegmentedControlItem } from 'ionbase-ui';

const meta: Meta<typeof SegmentedControl> = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  args: { label: 'View', defaultValue: 'list' },
  parameters: {
    docs: {
      description: {
        component:
          'Pick one of two to five options, all visible at once.\n\n**Not Tabs, although it looks like the pill type.** Tabs switch panels — `tablist`, `tab`, `tabpanel`. This sets a value and controls no panel. It is a `radiogroup`: one tab stop, arrow keys move and select, and it submits with a form. Choose by what changes, not by how it looks.\n\n**Built from real radio inputs**, not buttons with `aria-pressed` — radios announce "2 of 3, selected" and mutual exclusion for free.\n\n**A disabled selected segment keeps its selected surface.** A disabled control still has a value.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SegmentedControl>;

const Grid = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);
const Rows = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 6h16M4 12h16M4 18h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Views = (props: React.ComponentProps<typeof SegmentedControl>) => (
  <SegmentedControl {...props}>
    <SegmentedControlItem value="list">List</SegmentedControlItem>
    <SegmentedControlItem value="board">Board</SegmentedControlItem>
    <SegmentedControlItem value="calendar">Calendar</SegmentedControlItem>
  </SegmentedControl>
);

export const Default: Story = { render: (args) => <Views {...args} /> };

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '16px', justifyItems: 'start' }}>
      <Views {...args} size="sm" />
      <Views {...args} />
      <Views {...args} size="lg" />
    </div>
  ),
};

export const WithVisibleLabel: Story = {
  args: { showLabel: true, label: 'Range', defaultValue: 'week' },
  render: (args) => (
    <SegmentedControl {...args}>
      <SegmentedControlItem value="day">Day</SegmentedControlItem>
      <SegmentedControlItem value="week">Week</SegmentedControlItem>
      <SegmentedControlItem value="month">Month</SegmentedControlItem>
    </SegmentedControl>
  ),
};

export const FullWidth: Story = {
  args: { isFullWidth: true },
  render: (args) => (
    <div style={{ maxWidth: '28rem' }}>
      <Views {...args} />
    </div>
  ),
};

export const IconOnly: Story = {
  args: { label: 'Layout', defaultValue: 'grid', size: 'sm' },
  render: (args) => (
    <SegmentedControl {...args}>
      <SegmentedControlItem value="grid" icon={<Grid />} aria-label="Grid" />
      <SegmentedControlItem value="rows" icon={<Rows />} aria-label="Rows" />
    </SegmentedControl>
  ),
};

export const WithDisabledItem: Story = {
  render: (args) => (
    <SegmentedControl {...args}>
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="board" isDisabled>
        Board
      </SegmentedControlItem>
      <SegmentedControlItem value="calendar">Calendar</SegmentedControlItem>
    </SegmentedControl>
  ),
};

export const Disabled: Story = {
  args: { isDisabled: true },
  render: (args) => <Views {...args} />,
};

/* ------------------------------------------------------------------ tests */

/** A named radiogroup of radios — not a tablist. */
export const IsARadioGroupNotTabs: Story = {
  render: (args) => <Views {...args} />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('radiogroup', { name: 'View' }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByRole('radio')).toHaveLength(3);
    await expect(canvas.queryByRole('tablist')).toBeNull();
    await expect(canvas.getByRole('radio', { name: 'List' })).toBeChecked();
  },
};

const changed = fn();

/** One tab stop; arrows move and select, skipping a disabled segment. */
export const ArrowsSelectAndSkipDisabled: Story = {
  args: { onChange: changed },
  render: (args) => (
    <>
      <SegmentedControl {...args}>
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="board" isDisabled>
          Board
        </SegmentedControlItem>
        <SegmentedControlItem value="calendar">Calendar</SegmentedControlItem>
      </SegmentedControl>
      <button type="button">After</button>
    </>
  ),
  play: async ({ canvas }) => {
    changed.mockClear();
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: 'List' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(changed).toHaveBeenLastCalledWith('calendar');
    await expect(canvas.getByRole('radio', { name: 'Calendar' })).toBeChecked();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
  },
};

/** A visible label names the group through aria-labelledby. */
export const VisibleLabelNamesTheGroup: Story = {
  args: WithVisibleLabel.args,
  render: WithVisibleLabel.render,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Range')).toBeVisible();
    await expect(
      canvas.getByRole('radiogroup', { name: 'Range' }),
    ).toHaveAttribute('aria-labelledby');
  },
};

/** Icon-only segments are named radios. */
export const IconOnlySegmentsAreNamed: Story = {
  args: IconOnly.args,
  render: IconOnly.render,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Grid' })).toBeChecked();
    await expect(
      canvas.getByRole('radio', { name: 'Rows' }),
    ).toBeInTheDocument();
  },
};

/** It submits with a form, like any radio group. */
export const SubmitsWithAForm: Story = {
  args: { name: 'view', defaultValue: 'board' },
  render: (args) => (
    <form data-testid="form">
      <Views {...args} />
    </form>
  ),
  play: async ({ canvas }) => {
    const form = canvas.getByTestId('form') as HTMLFormElement;
    await expect(new FormData(form).get('view')).toBe('board');
  },
};

/** Disabled keeps the selected segment visibly selected. */
export const DisabledKeepsSelection: Story = {
  args: { isDisabled: true },
  render: (args) => <Views {...args} />,
  play: async ({ canvas }) => {
    const selected = canvas
      .getByRole('radio', { name: 'List' })
      .closest('label')!;
    const other = canvas
      .getByRole('radio', { name: 'Board' })
      .closest('label')!;
    await expect(getComputedStyle(selected).backgroundColor).not.toBe(
      getComputedStyle(other).backgroundColor,
    );
  },
};
