import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import {
  Button,
  EmptyState,
  TreeGrid,
  type TreeGridColumn,
  type TreeGridItem,
  type TreeGridProps,
} from 'ionbase-ui';

interface Spend extends TreeGridItem {
  name: string;
  runs: number;
  cost: string;
  children?: Spend[];
}

const SPEND: Spend[] = [
  {
    id: 'support',
    name: 'Support triage',
    runs: 412,
    cost: '$184.20',
    children: [
      {
        id: 'refunds',
        name: 'Refund lookups',
        runs: 260,
        cost: '$96.10',
        children: [
          { id: 'run-1042', name: 'Run 1042', runs: 1, cost: '$0.41' },
          { id: 'run-1043', name: 'Run 1043', runs: 1, cost: '$0.38' },
        ],
      },
      {
        id: 'escalations',
        name: 'Escalations',
        runs: 152,
        cost: '$88.10',
        // One child, on purpose: a parent with one row under it is still a
        // parent. React Aria's own guess needs more than one.
        children: [
          { id: 'run-1051', name: 'Run 1051', runs: 1, cost: '$0.77' },
        ],
      },
    ],
  },
  { id: 'billing', name: 'Billing reconciler', runs: 96, cost: '$41.75' },
  {
    id: 'research',
    name: 'Research digest',
    runs: 0,
    cost: '$0.00',
    isDisabled: true,
  },
];

const COLUMNS: TreeGridColumn<Spend>[] = [
  { id: 'name', header: 'Agent', cell: (r) => r.name },
  { id: 'runs', header: 'Runs', cell: (r) => String(r.runs), align: 'end' },
  { id: 'cost', header: 'Cost', cell: (r) => r.cost, align: 'end' },
];

/** The grid with what it reports written out, so a test can read it. */
function Harness(props: Partial<TreeGridProps<Spend>>) {
  const [expanded, setExpanded] = useState<string[]>(
    props.defaultExpandedKeys ? [...props.defaultExpandedKeys] : [],
  );
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div style={{ width: 560 }}>
      <TreeGrid
        aria-label="Spend by agent"
        columns={COLUMNS}
        items={SPEND}
        expandedKeys={expanded}
        onExpandedChange={(keys) => setExpanded([...keys])}
        selectedKeys={selected}
        onSelectionChange={(keys) => setSelected([...keys])}
        {...props}
        defaultExpandedKeys={undefined}
      />
      <Button variant="secondary" size="sm" onPress={() => setExpanded([])}>
        Close every row
      </Button>
      <output data-testid="expanded">{[...expanded].sort().join(',')}</output>
      <output data-testid="selected">{[...selected].sort().join(',')}</output>
    </div>
  );
}

const meta: Meta<typeof TreeGrid<Spend>> = {
  title: 'Components/TreeGrid',
  component: TreeGrid,
  tags: ['autodocs'],
  args: { items: SPEND, columns: COLUMNS, 'aria-label': 'Spend by agent' },
  parameters: {
    docs: {
      description: {
        component:
          'Rows that open to show the rows under them, in columns compared down — spend by agent and then by task, a budget by team and person. The WAI-ARIA treegrid: one tab stop; ↑ ↓ move between rows, → opens a row and then moves into its cells, ← comes back out, closes it, and then goes to its parent. Drawn as a Table.\n\nNot a TreeView: that is one column. Not a Table with an expandable row: that opens a detail under one record, where this opens more rows of the same kind.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TreeGrid<Spend>>;

const rowNamed = (root: HTMLElement, name: string) =>
  within(root).getByRole('row', { name });

const focused = () => document.activeElement as HTMLElement;

/** Focus is on the row named, not a cell in it. */
const expectRowFocused = (root: HTMLElement, name: string) =>
  waitFor(() => expect(focused()).toBe(rowNamed(root, name)));

export const Default: Story = {
  args: { defaultExpandedKeys: ['support'] },
};

export const MultipleSelection: Story = {
  args: { defaultExpandedKeys: ['support'], selectionMode: 'multiple' },
};

export const Compact: Story = {
  args: { defaultExpandedKeys: ['support', 'refunds'], density: 'compact' },
};

/**
 * A treegrid, each row with its level, its place among its siblings and —
 * only when it has rows under it — whether it is open. A closed row's
 * children are not in the page.
 */
export const IsATreegridWithLevelsAndPositions: Story = {
  args: { defaultExpandedKeys: ['support'] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const grid = c.getByRole('treegrid', { name: 'Spend by agent' });
    const aria = (name: string) => {
      const row = rowNamed(canvasElement, name);
      return ['aria-level', 'aria-posinset', 'aria-setsize', 'aria-expanded']
        .map((a) => row.getAttribute(a) ?? '-')
        .join(' ');
    };
    await expect(aria('Support triage')).toBe('1 1 3 true');
    await expect(aria('Refund lookups')).toBe('2 1 2 false');
    await expect(aria('Escalations')).toBe('2 2 2 false');
    await expect(aria('Billing reconciler')).toBe('1 2 3 -');
    await expect(aria('Research digest')).toBe('1 3 3 -');
    await expect(c.queryByRole('row', { name: 'Run 1042' })).toBeNull();
    // Five rows under one header: nothing of a closed row is rendered.
    await expect(within(grid).getAllByRole('row')).toHaveLength(6);
    // The first column names the row and is its header.
    await expect(
      within(rowNamed(canvasElement, 'Billing reconciler')).getByRole(
        'rowheader',
      ),
    ).toHaveTextContent('Billing reconciler');
    await expect(c.getByRole('columnheader', { name: 'Cost' })).toBeVisible();
    // With no sort to describe, the grid points at no description.
    await expect(grid).not.toHaveAttribute('aria-describedby');
  },
};

/** An empty `children` is no children: a leaf, with nothing to open. */
export const AnEmptyChildListIsALeaf: Story = {
  args: {
    items: [
      { id: 'archive', name: 'Archive', runs: 0, cost: '$0.00', children: [] },
    ],
  },
  play: async ({ canvasElement }) => {
    const row = rowNamed(canvasElement, 'Archive');
    await expect(row).not.toHaveAttribute('aria-expanded');
    await expect(within(row).queryByRole('button')).toBeNull();
  },
};

/**
 * One tab stop. → opens a closed row; on an open one it moves into the row's
 * cells, and on across them. ← comes back to the row, then closes it.
 */
export const RightOpensThenMovesIntoTheCells: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expectRowFocused(canvasElement, 'Support triage');
    await userEvent.keyboard('{ArrowRight}');
    await expect(c.getByTestId('expanded')).toHaveTextContent('support');
    await expect(rowNamed(canvasElement, 'Support triage')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expectRowFocused(canvasElement, 'Support triage');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(focused()).toHaveTextContent('Support triage'));
    await expect(focused()).toHaveAttribute('role', 'rowheader');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(focused()).toHaveTextContent('412'));
    await expect(focused()).toHaveAttribute('role', 'gridcell');
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(focused()).toHaveAttribute('role', 'rowheader'));
    await userEvent.keyboard('{ArrowLeft}');
    await expectRowFocused(canvasElement, 'Support triage');
    await userEvent.keyboard('{ArrowLeft}');
    await expect(c.getByTestId('expanded')).toHaveTextContent(/^$/);
    await expect(c.queryByRole('row', { name: 'Refund lookups' })).toBeNull();
    // Tab leaves the grid: it is one stop, not one per row.
    await userEvent.tab();
    await expect(focused()).toBe(
      c.getByRole('button', { name: 'Close every row' }),
    );
  },
};

/** ← on a row that is closed, or has nothing under it, goes to its parent. */
export const LeftOnAChildGoesToItsParent: Story = {
  render: () => <Harness defaultExpandedKeys={['support']} />,
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    await expectRowFocused(canvasElement, 'Refund lookups');
    await userEvent.keyboard('{ArrowLeft}');
    await expectRowFocused(canvasElement, 'Support triage');
    // The parent stays open: ← went up, it did not close anything.
    await expect(rowNamed(canvasElement, 'Support triage')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // A second ← on it, now, closes it.
    await userEvent.keyboard('{ArrowLeft}');
    await expect(rowNamed(canvasElement, 'Support triage')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
};

/** ↑ ↓ from a cell keep to its column; ↓ from a row skips closed branches. */
export const UpAndDownKeepTheColumn: Story = {
  render: () => <Harness defaultExpandedKeys={['support']} />,
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await waitFor(() => expect(focused()).toHaveTextContent('412'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focused()).toHaveTextContent('260'));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    // Past Escalations, closed, to the next top-level row.
    await waitFor(() => expect(focused()).toHaveTextContent('96'));
    await expect(focused().closest('tr')).toBe(
      rowNamed(canvasElement, 'Billing reconciler'),
    );
  },
};

/** Home and End go to the first and last row; typing jumps by the first column. */
export const HomeEndAndTyping: Story = {
  render: () => <Harness defaultExpandedKeys={['support']} />,
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await userEvent.keyboard('{End}');
    await expectRowFocused(canvasElement, 'Research digest');
    await userEvent.keyboard('{Home}');
    await expectRowFocused(canvasElement, 'Support triage');
    await userEvent.keyboard('bil');
    await expectRowFocused(canvasElement, 'Billing reconciler');
  },
};

/**
 * The chevron opens a row with a pointer. It is out of the tab order, named
 * for what it does and the row it does it to; the row, not the button, says
 * whether it is open. A leaf has none, and a spacer keeps its label in line.
 */
export const TheChevronOpensARow: Story = {
  render: () => <Harness defaultExpandedKeys={['support']} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const chevron = c.getByRole('button', { name: 'Expand Refund lookups' });
    await expect(chevron).toHaveAttribute('tabindex', '-1');
    await expect(chevron).not.toHaveAttribute('aria-expanded');
    await browserUser.click(chevron);
    await expect(c.getByTestId('expanded')).toHaveTextContent(
      'refunds,support',
    );
    await expect(rowNamed(canvasElement, 'Run 1042')).toHaveAttribute(
      'aria-level',
      '3',
    );
    await expect(
      c.getByRole('button', { name: 'Collapse Refund lookups' }),
    ).toBeVisible();
    // The row it opened has the grid's focus, so the keys carry on from it.
    await expectRowFocused(canvasElement, 'Refund lookups');
    const leaf = rowNamed(canvasElement, 'Run 1042');
    await expect(within(leaf).queryByRole('button')).toBeNull();
    // Each level is indented one step further than its parent's label.
    const label = (name: string) =>
      rowNamed(canvasElement, name)
        .querySelector('.ion-tree-grid__label')!
        .getBoundingClientRect().left;
    await expect(label('Run 1042')).toBeGreaterThan(label('Refund lookups'));
    await expect(label('Refund lookups')).toBeGreaterThan(
      label('Support triage'),
    );
    // A leaf's spacer is the chevron's width: labels at a level line up.
    await expect(label('Escalations')).toBe(label('Refund lookups'));
  },
};

/** Controlled: the grid shows what `expandedKeys` says, and nothing else. */
export const ControlledExpansion: Story = {
  render: () => <Harness defaultExpandedKeys={['support', 'refunds']} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(rowNamed(canvasElement, 'Run 1043')).toBeVisible();
    await browserUser.click(c.getByRole('button', { name: 'Close every row' }));
    await expect(c.queryByRole('row', { name: 'Refund lookups' })).toBeNull();
    await expect(c.getAllByRole('row')).toHaveLength(4);
  },
};

/**
 * `multiple`: a Checkbox per row and a select-all in the header. Ticking a
 * parent ticks only it; select-all is every row that can be selected, open
 * or not.
 */
export const MultipleSelectionHasABoxPerRow: Story = {
  render: () => (
    <Harness selectionMode="multiple" defaultExpandedKeys={['support']} />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const grid = c.getByRole('treegrid');
    await expect(grid).toHaveAttribute('aria-multiselectable', 'true');
    // The drawn square, not the hidden input: a click there must change the
    // box once, and not reach the row as a second press.
    const box = within(rowNamed(canvasElement, 'Support triage'))
      .getByRole('checkbox', { name: 'Select Support triage' })
      .closest('label')!
      .querySelector('.ion-checkbox__indicator')!;
    await browserUser.click(box);
    await expect(c.getByTestId('selected')).toHaveTextContent(/^support$/);
    await expect(rowNamed(canvasElement, 'Support triage')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(rowNamed(canvasElement, 'Refund lookups')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    // The input is visually hidden; its label is what a pointer hits.
    await browserUser.click(
      c.getByRole('checkbox', { name: 'Select All' }).closest('label')!,
    );
    await expect(c.getByTestId('selected')).toHaveTextContent(
      'billing,escalations,refunds,run-1042,run-1043,run-1051,support',
    );
    await expect(c.getByRole('checkbox', { name: 'Select All' })).toBeChecked();
    // The disabled row's box cannot be ticked.
    await expect(
      c.getByRole('checkbox', { name: 'Select Research digest' }),
    ).toBeDisabled();
  },
};

/** Part of the rows picked, the select-all box says so. */
export const SomeSelectedIsIndeterminate: Story = {
  render: () => <Harness selectionMode="multiple" selectedKeys={['billing']} />,
  play: async ({ canvasElement }) => {
    const all = within(canvasElement).getByRole('checkbox', {
      name: 'Select All',
    }) as HTMLInputElement;
    await expect(all.indeterminate).toBe(true);
    await expect(all).not.toBeChecked();
  },
};

/** `single`: Space selects the focused row, and a second replaces it. */
export const SpaceSelectsOneRow: Story = {
  render: () => <Harness selectionMode="single" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole('checkbox')).toBeNull();
    await userEvent.tab();
    await userEvent.keyboard(' ');
    await expect(c.getByTestId('selected')).toHaveTextContent(/^support$/);
    await userEvent.keyboard('{ArrowDown} ');
    await expect(c.getByTestId('selected')).toHaveTextContent(/^billing$/);
    await expect(rowNamed(canvasElement, 'Billing reconciler')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

/** Enter activates the focused row — "open this record". */
export const EnterActivatesARow: Story = {
  args: { onAction: fn() },
  play: async ({ args }) => {
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(args.onAction).toHaveBeenCalledWith('billing');
    await expect(args.onAction).toHaveBeenCalledTimes(1);
  },
};

/** A disabled row cannot be selected, but it can still be opened, read and activated. */
export const ADisabledRowStillOpens: Story = {
  args: { onAction: fn() },
  render: (args) => (
    <Harness
      onAction={args.onAction}
      selectionMode="multiple"
      items={SPEND.map((r) =>
        r.id === 'support' ? { ...r, isDisabled: true } : r,
      )}
    />
  ),
  play: async ({ args, canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole('checkbox', { name: 'Select Support triage' }),
    ).toBeDisabled();
    await userEvent.tab();
    await expectRowFocused(canvasElement, 'Support triage');
    await userEvent.keyboard(' ');
    await expect(c.getByTestId('selected')).toHaveTextContent(/^$/);
    await userEvent.keyboard('{ArrowRight}');
    await expect(rowNamed(canvasElement, 'Refund lookups')).toBeVisible();
    await expect(
      c.getByRole('button', { name: 'Collapse Support triage' }),
    ).toBeEnabled();
    // And activated: Enter still opens the record.
    await userEvent.keyboard('{Enter}');
    await expect(args.onAction).toHaveBeenCalledWith('support');
  },
};

/** No rows: the grid is still named, with what to say in a row of its own. */
export const Empty: Story = {
  args: {
    items: [],
    renderEmptyState: () => (
      <EmptyState
        reason="no-results"
        size="inline"
        title="No spend this month"
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('treegrid', { name: 'Spend by agent' })).toBe(
      canvasElement.querySelector('table'),
    );
    await expect(c.getByText('No spend this month')).toBeVisible();
    const cell = canvasElement.querySelector(
      'tbody td',
    ) as HTMLTableCellElement;
    await expect(cell.colSpan).toBe(3);
  },
};

/** Density moves only the rows' height, as it does in a Table. */
export const DensityIsTheRowsHeight: Story = {
  render: () => (
    <>
      <TreeGrid aria-label="Default" columns={COLUMNS} items={SPEND} />
      <TreeGrid
        aria-label="Compact"
        columns={COLUMNS}
        items={SPEND}
        density="compact"
      />
    </>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const height = (grid: string) =>
      within(c.getByRole('treegrid', { name: grid }))
        .getByRole('row', { name: 'Billing reconciler' })
        .getBoundingClientRect().height;
    await expect(height('Default') - height('Compact')).toBe(16);
  },
};

/**
 * Narrow, a name wraps between its words, never inside one: the figures do
 * not squeeze the first column to a letter a line. Past a word, the table's
 * region scrolls sideways.
 */
export const ANarrowGridWrapsNamesAtWords: Story = {
  args: { defaultExpandedKeys: ['support', 'refunds'] },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const label = rowNamed(canvasElement, 'Billing reconciler').querySelector(
      '.ion-tree-grid__label',
    )!;
    const lines = label.getBoundingClientRect().height;
    const line = parseFloat(getComputedStyle(label).lineHeight);
    // Two words: two lines at most.
    await expect(Math.round(lines / line)).toBeLessThanOrEqual(2);
    const region = canvasElement.querySelector(
      '.ion-table-container',
    ) as HTMLElement;
    await expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
    // The page itself does not scroll sideways.
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.clientWidth,
    );
  },
};
