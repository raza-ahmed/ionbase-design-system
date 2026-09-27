import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { RouterProvider } from 'react-aria';
import { userEvent as browserUser } from 'vitest/browser';
import {
  Avatar,
  Badge,
  Button,
  List,
  type ListItem,
  type ListProps,
} from 'ionbase-ui';

const ITEMS: ListItem[] = [
  {
    id: 'run_4821',
    label: 'Reconcile March invoices',
    description: 'Invoice reconciler · started 4 min ago',
    leading: <Avatar size="sm" initials="IR" />,
    meta: (
      <Badge size="sm" intent="warning">
        Medium risk
      </Badge>
    ),
  },
  {
    id: 'run_4822',
    label: 'Draft refund replies',
    description: 'Support triage · started 12 min ago',
    leading: <Avatar size="sm" initials="ST" />,
    meta: (
      <Badge size="sm" intent="error">
        High risk
      </Badge>
    ),
  },
  {
    id: 'run_4823',
    label: 'Tag new tickets',
    description: 'Support triage · started 1 h ago',
    leading: <Avatar size="sm" initials="ST" />,
    isDisabled: true,
  },
  {
    id: 'run_4824',
    label: 'Summarise the churn interviews',
    description: 'Research digest · started 2 h ago',
    leading: <Avatar size="sm" initials="RD" />,
    meta: '2 h',
  },
];

/** The list with what it last did written out, so a test can read it. */
function Harness(props: Partial<ListProps>) {
  const [opened, setOpened] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div style={{ width: 560 }}>
      <List
        aria-label="Waiting for you"
        items={ITEMS}
        onAction={setOpened}
        onSelectionChange={(k) => setSelected([...k].sort())}
        {...props}
      />
      <output data-testid="opened">{opened}</output>
      <output data-testid="selected">{selected.join(',')}</output>
    </div>
  );
}

const meta: Meta<typeof List> = {
  title: 'Components/List',
  component: List,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Rows of records to open, pick or act on — an approval inbox, a list of files, "choose one of these" that is not a form field. Built on React Aria `useGridList`: one tab stop, ↑ ↓ between rows, → into a row\'s own buttons.\n\n`selectionMode="multiple"` gives each row a checkbox; a press opens the row until something is selected. `single`: a press selects, Enter opens. Not a Table (no columns to compare) and not a listbox (a row can hold buttons).',
      },
    },
  },
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof List>;

export const Default: Story = {};
export const MultipleSelection: Story = {
  render: () => (
    <Harness selectionMode="multiple" defaultSelectedKeys={['run_4822']} />
  ),
};
export const SingleSelection: Story = {
  render: () => (
    <Harness selectionMode="single" defaultSelectedKeys={['run_4821']} />
  ),
};
export const WithActions: Story = {
  render: () => (
    <Harness
      renderActions={(item) => (
        <Button
          size="sm"
          variant="tertiary"
          aria-label={`Dismiss ${item.textValue ?? item.label}`}
          onPress={() => {
            document.querySelector('[data-testid="opened"]')!.textContent =
              `dismissed ${item.id}`;
          }}
        >
          Dismiss
        </Button>
      )}
    />
  ),
};
export const Empty: Story = {
  render: () => (
    <Harness
      items={[]}
      renderEmptyState={() => 'Nothing is waiting for approval.'}
    />
  ),
};

// ------------------------------------------------------------------ tests

const row = (c: ReturnType<typeof within>, name: string | RegExp) =>
  c.getByRole('row', { name });
const opened = (c: ReturnType<typeof within>) => c.getByTestId('opened');
const selected = (c: ReturnType<typeof within>) => c.getByTestId('selected');

/** A named grid of rows, one cell each; the second line is read with the row. */
export const IsAGridOfRows: Story = {
  play: async ({ canvas }) => {
    const grid = canvas.getByRole('grid');
    await expect(grid).toHaveAccessibleName('Waiting for you');
    await expect(canvas.getAllByRole('row')).toHaveLength(4);
    await expect(canvas.getAllByRole('gridcell')).toHaveLength(4);
    await expect(row(canvas, /^Reconcile March invoices/)).toHaveAccessibleName(
      'Reconcile March invoices Invoice reconciler · started 4 min ago',
    );
    // Nothing to select: no row claims a selected state.
    await expect(row(canvas, /^Reconcile/)).not.toHaveAttribute(
      'aria-selected',
    );
  },
};

/** One tab stop: Tab enters on a row, the next Tab leaves the list. */
export const IsOneTabStop: Story = {
  render: () => (
    <>
      <button type="button">Before</button>
      <Harness />
      <button type="button">After</button>
    </>
  ),
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: 'Before' }).focus();
    await browserUser.keyboard('{Tab}');
    await expect(row(canvas, /^Reconcile/)).toHaveFocus();
    await browserUser.keyboard('{Tab}');
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
  },
};

/** ↑ ↓ between rows, skipping a disabled one; Home, End; typing jumps. */
export const ArrowsHomeEndAndTypeahead: Story = {
  play: async ({ canvas }) => {
    row(canvas, /^Reconcile/).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(row(canvas, /^Draft refund/)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(row(canvas, /^Summarise/)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(row(canvas, /^Reconcile/)).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(row(canvas, /^Summarise/)).toHaveFocus();
    await userEvent.keyboard('dr');
    await expect(row(canvas, /^Draft refund/)).toHaveFocus();
  },
};

/** A press opens the row, and so does Enter. */
export const PressAndEnterOpenTheRow: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(row(canvas, /^Draft refund/));
    await expect(opened(canvas)).toHaveTextContent('run_4822');
    row(canvas, /^Summarise/).focus();
    await userEvent.keyboard('{Enter}');
    await expect(opened(canvas)).toHaveTextContent('run_4824');
  },
};

/** A disabled row cannot be opened. */
export const DisabledRowsDoNothing: Story = {
  play: async ({ canvas }) => {
    const tag = row(canvas, /^Tag new tickets/);
    await expect(tag).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(tag);
    await expect(opened(canvas)).toHaveTextContent(/^$/);
  },
};

/**
 * An `href` row is a link: a press follows it, through React Aria's router —
 * an app's `RouterProvider`, or the browser when there is none.
 */
export const HrefRowsFollowTheLink: Story = {
  render: () => {
    const [to, setTo] = useState('');
    return (
      <RouterProvider navigate={setTo}>
        <List
          aria-label="Runs"
          items={[
            { id: 'a', label: 'Open the run', href: '/runs/run_4821' },
            { id: 'b', label: 'Open the next', href: '/runs/run_4822' },
          ]}
        />
        <output data-testid="to">{to}</output>
      </RouterProvider>
    );
  },
  play: async ({ canvas }) => {
    await browserUser.click(row(canvas, 'Open the run'));
    await expect(canvas.getByTestId('to')).toHaveTextContent('/runs/run_4821');
    row(canvas, 'Open the next').focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('to')).toHaveTextContent('/runs/run_4822');
  },
};

/**
 * Multiple: every row has a checkbox named "Select" and its row. Ticking one
 * selects without opening; the row says so.
 */
export const MultipleHasANamedCheckboxPerRow: Story = {
  render: () => <Harness selectionMode="multiple" />,
  play: async ({ canvas }) => {
    const grid = canvas.getByRole('grid');
    await expect(grid).toHaveAttribute('aria-multiselectable', 'true');
    const box = canvas.getByRole('checkbox', {
      name: /^Select Reconcile March invoices/,
    });
    // The input is visually hidden; its label is what a pointer hits.
    await userEvent.click(box.closest('label')!);
    await expect(box).toBeChecked();
    await expect(row(canvas, /^Reconcile/)).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(selected(canvas)).toHaveTextContent(/^run_4821$/);
    await expect(opened(canvas)).toHaveTextContent(/^$/);
  },
};

/**
 * A click on the box's visible square — its label, not the input — ticks it
 * once. The row must not also take it as a press and toggle it back.
 */
export const ClickingTheDrawnBoxTogglesOnce: Story = {
  render: () => <Harness selectionMode="multiple" />,
  play: async ({ canvas, canvasElement }) => {
    const square = canvasElement.querySelector('.ion-checkbox__indicator')!;
    await userEvent.click(square);
    await expect(selected(canvas)).toHaveTextContent(/^run_4821$/);
    await userEvent.click(square);
    await expect(selected(canvas)).toHaveTextContent(/^$/);
  },
};

/**
 * Multiple, inbox-style: a press opens while nothing is selected, and toggles
 * once something is. Space selects from the keyboard; Enter still opens.
 */
export const MultiplePressOpensUntilSomethingIsSelected: Story = {
  render: () => <Harness selectionMode="multiple" />,
  play: async ({ canvas }) => {
    await userEvent.click(row(canvas, /^Draft refund/));
    await expect(opened(canvas)).toHaveTextContent('run_4822');
    await expect(selected(canvas)).toHaveTextContent(/^$/);

    row(canvas, /^Reconcile/).focus();
    await userEvent.keyboard(' ');
    await expect(selected(canvas)).toHaveTextContent(/^run_4821$/);
    await userEvent.click(row(canvas, /^Summarise/));
    await expect(selected(canvas)).toHaveTextContent(/^run_4821,run_4824$/);
    await expect(opened(canvas)).toHaveTextContent('run_4822');

    row(canvas, /^Draft refund/).focus();
    await userEvent.keyboard('{Enter}');
    await expect(opened(canvas)).toHaveTextContent('run_4822');
    await expect(selected(canvas)).toHaveTextContent(/^run_4821,run_4824$/);
  },
};

/** Single: a press selects one, replacing the last; Enter or a double click opens. */
export const SinglePressSelectsAndEnterOpens: Story = {
  render: () => <Harness selectionMode="single" />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('checkbox')).toBeNull();
    await browserUser.click(row(canvas, /^Reconcile/));
    await browserUser.click(row(canvas, /^Draft refund/));
    await expect(selected(canvas)).toHaveTextContent(/^run_4822$/);
    await expect(row(canvas, /^Reconcile/)).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await expect(opened(canvas)).toHaveTextContent(/^$/);
    await userEvent.keyboard('{Enter}');
    await expect(opened(canvas)).toHaveTextContent('run_4822');
    await browserUser.dblClick(row(canvas, /^Summarise/));
    await expect(opened(canvas)).toHaveTextContent('run_4824');
  },
};

/**
 * A row's own buttons: → reaches them and ← goes back, so they cost no tab
 * stop. Pressing one does its job and does not open the row; ↓ from it moves
 * on to the next row.
 */
export const ActionsAreReachedWithArrows: Story = {
  ...WithActions,
  play: async ({ canvas }) => {
    const first = row(canvas, /^Reconcile/);
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    const dismiss = canvas.getByRole('button', {
      name: 'Dismiss Reconcile March invoices',
    });
    await expect(dismiss).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(opened(canvas)).toHaveTextContent('dismissed run_4821');
    await userEvent.keyboard('{ArrowLeft}');
    await expect(first).toHaveFocus();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Dismiss Draft refund replies' }),
    );
    await expect(opened(canvas)).toHaveTextContent('dismissed run_4822');
    await userEvent.keyboard('{ArrowDown}');
    await expect(row(canvas, /^Summarise/)).toHaveFocus();
  },
};

/** Empty: still a named grid, with the reason in a row of its own. */
export const EmptySaysWhy: Story = {
  ...Empty,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('grid')).toHaveAccessibleName(
      'Waiting for you',
    );
    await expect(canvas.getByRole('gridcell')).toHaveTextContent(
      'Nothing is waiting for approval.',
    );
  },
};

/** A long label wraps; the meta stays on the row, at its end. */
export const LongLabelsWrapAndMetaStays: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <List
        aria-label="Files"
        items={[
          {
            id: 'f',
            label:
              'quarterly_reconciliation_export_march_2026_final_v7_reviewed.csv',
            meta: '2.4 MB',
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const r = canvasElement.querySelector('.ion-list__row')!;
    const m = canvasElement.querySelector('.ion-list__meta')!;
    const label = canvasElement.querySelector('.ion-list__label')!;
    await expect(r.scrollWidth).toBeLessThanOrEqual(r.clientWidth);
    await expect(m.getBoundingClientRect().right).toBeLessThanOrEqual(
      r.getBoundingClientRect().right,
    );
    await expect(label.getBoundingClientRect().height).toBeGreaterThan(24);
  },
};

/** A log, scanned by label: compact rows, an Icon-sized leading element. */
const LOG: ListItem[] = [
  { id: 'l1', label: 'Invoice reconciler finished', meta: '09:41' },
  { id: 'l2', label: 'Support triage asked for approval', meta: '09:38' },
  { id: 'l3', label: 'Research digest started', meta: '09:30' },
  { id: 'l4', label: 'Refund bot paused by Priya', meta: '09:12' },
];

export const Compact: Story = {
  render: () => <Harness items={LOG} density="compact" />,
};

/**
 * Density moves rows, never columns — Table's rule. Compact is 32px, a
 * TreeView row; default 48. The inline padding is the same in both, so a
 * compact list's text lines up with a default one beside it.
 */
export const CompactRowsAre32AndKeepTheirColumns: Story = {
  render: () => (
    <div>
      <Harness items={LOG} density="compact" />
      <Harness items={LOG} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [compact, standard] = canvasElement.querySelectorAll('.ion-list');
    await expect(compact).toHaveClass('ion-list--compact');
    await expect(standard).not.toHaveClass('ion-list--compact');
    const rows = (list: Element) => [
      ...list.querySelectorAll('.ion-list__row'),
    ];
    // Default rows are 48 with their rule, which min-height sets. Compact
    // rows are their content, 6 + 20 + 6, and the 1px rule is on top.
    for (const r of rows(compact))
      await expect(
        r.getBoundingClientRect().height -
          parseFloat(getComputedStyle(r).borderTopWidth),
      ).toBe(32);
    for (const r of rows(standard))
      await expect(r.getBoundingClientRect().height).toBe(48);
    const labelLeft = (list: Element) =>
      list.querySelector('.ion-list__label')!.getBoundingClientRect().left;
    await expect(labelLeft(compact)).toBe(labelLeft(standard));
  },
};

/** A second line still fits: the row grows, and keeps its 6px either side. */
export const CompactRowsGrowForADescription: Story = {
  render: () => <Harness density="compact" />,
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('.ion-list__row')!;
    const style = getComputedStyle(row);
    await expect(style.paddingTop).toBe('6px');
    await expect(style.paddingBottom).toBe('6px');
    await expect(row.getBoundingClientRect().height).toBeGreaterThan(32);
    // Still one tab stop, arrows between rows: density is only looks.
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    await expect(document.activeElement).toBe(
      canvasElement.querySelectorAll('.ion-list__row')[1],
    );
  },
};

/** A `mini` Avatar is 24, so a compact row holding one is 36; `sm` is 44. */
export const CompactRowHeightFollowsTheAvatar: Story = {
  render: () => (
    <Harness
      density="compact"
      items={[
        {
          id: 'a',
          label: 'Mini',
          leading: <Avatar size="mini" initials="MI" />,
        },
        {
          id: 'b',
          label: 'Small',
          leading: <Avatar size="sm" initials="SM" />,
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const [mini, sm] = canvasElement.querySelectorAll('.ion-list__row');
    await expect(mini.getBoundingClientRect().height).toBe(36);
    await expect(
      sm.getBoundingClientRect().height -
        parseFloat(getComputedStyle(sm).borderTopWidth),
    ).toBe(44);
  },
};
