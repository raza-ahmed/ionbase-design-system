import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

/*
 * The worked example itself, as the package ships it: compiled from
 * packages/ionbase-ui/patterns/examples/DataTable.tsx by the build, and not a
 * package export, so it is imported by path. These stories run the file an
 * agent reads, not a copy of it.
 */
import {
  InvoicesTable,
  type Invoice,
} from '../../../../packages/ionbase-ui/dist/pattern-examples/DataTable.js';

const CUSTOMERS = [
  'Acme Corp',
  'Birch & Co',
  'Cobalt Labs',
  'Delta Freight',
  'Ember Studio',
  'Fjord Health',
  'Granite Bank',
];
const STATUSES = ['paid', 'open', 'overdue'] as const;

/** Fourteen invoices: two pages of ten. Amounts all differ, so a sort is visible. */
const INVOICES: Invoice[] = Array.from({ length: 14 }, (_, i) => ({
  id: `INV-${1001 + i}`,
  customer: CUSTOMERS[i % CUSTOMERS.length],
  amount: 10_000 + ((i * 7919) % 90_000),
  status: STATUSES[i % 3],
  due: `2026-10-${String(1 + i).padStart(2, '0')}`,
}));

const resolved = (rows: Invoice[]) => () => Promise.resolve(rows);

/** A checkbox's input is under its drawn box, so a pointer clicks the label. */
const tick = (canvas: ReturnType<typeof within>, name: string) =>
  userEvent.click(
    canvas.getByRole('checkbox', { name }).closest('label') as HTMLElement,
  );

const meta: Meta<typeof InvoicesTable> = {
  title: 'Patterns/Data table (worked example)',
  component: InvoicesTable,
  parameters: {
    docs: {
      description: {
        component:
          'The DataTable pattern’s worked example, `patterns/examples/DataTable.tsx`, rendered. The build type-checks it against the published types and lints it with the consumer rule set; it ships in `ionbase-ui/patterns/DataTable.json` as `example.source`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof InvoicesTable>;

const rowNames = (canvas: ReturnType<typeof within>) =>
  canvas
    .getAllByRole('row')
    .slice(1)
    .map((r: HTMLElement) => within(r).getAllByRole('cell')[0]?.textContent);

export const Default: Story = {
  args: { loadInvoices: resolved(INVOICES) },
};

/** The real header and skeleton rows, busy, with the selection column kept. */
export const Loading: Story = {
  args: { loadInvoices: () => new Promise<Invoice[]>(() => {}) },
  play: async ({ canvas }) => {
    const table = canvas.getByRole('region', { name: 'Invoices (loading)' });
    await expect(table.closest('[aria-busy="true"]')).not.toBeNull();
    await expect(canvas.getByText('Loading invoices')).toBeInTheDocument();
    // Header cells: the selection column, the four data columns, actions.
    await expect(within(table).getAllByRole('columnheader')).toHaveLength(6);
    // The toolbar is usable while it loads.
    await expect(
      canvas.getByRole('searchbox', { name: 'Search invoices by customer' }),
    ).toBeEnabled();
  },
};

/** The toolbar stays; Try again loads again. */
export const ErrorThenRetry: Story = {
  args: {
    loadInvoices: (() => {
      let calls = 0;
      return () =>
        ++calls === 1
          ? Promise.reject(new Error('The billing service timed out.'))
          : Promise.resolve(INVOICES);
    })(),
  },
  play: async ({ canvas }) => {
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('Invoices couldn’t load');
    await expect(alert).toHaveTextContent('The billing service timed out.');
    await expect(canvas.getByRole('searchbox')).toBeEnabled();
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Try again' }),
    );
    await expect(
      await canvas.findByRole('region', { name: 'Invoices' }),
    ).toBeVisible();
  },
};

/** Nothing exists yet: no way out but to make one. */
export const EmptyFirstRun: Story = {
  args: { loadInvoices: resolved([]) },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'No invoices yet' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Clear filters' }),
    ).toBeNull();
  },
};

/** Nothing matches: say so, offer Clear filters, and the count says it too. */
export const EmptyNoResults: Story = {
  args: { loadInvoices: resolved(INVOICES) },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    await userEvent.type(canvas.getByRole('searchbox'), 'zzz');
    await expect(
      canvas.getByRole('heading', { name: 'No invoices match these filters' }),
    ).toBeVisible();
    await expect(canvas.getByText('0 invoices')).toBeInTheDocument();
    await expect(
      canvas.getByRole('row', { name: /Search: “zzz”/ }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Clear filters' }),
    );
    await expect(canvas.getByText('14 invoices')).toBeInTheDocument();
    await expect(canvas.getByRole('searchbox')).toHaveValue('');
  },
};

/** Ten a page; Amount sorts largest first; a sort goes back to page 1. */
export const SortAndPage: Story = {
  args: { loadInvoices: resolved(INVOICES) },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    await expect(rowNames(canvas)).toHaveLength(10);
    await userEvent.click(canvas.getByRole('button', { name: 'Go to page 2' }));
    await expect(rowNames(canvas)).toHaveLength(4);

    await userEvent.click(canvas.getByRole('button', { name: 'Amount' }));
    await expect(rowNames(canvas)).toHaveLength(10);
    const amounts = canvas
      .getAllByRole('row')
      .slice(1)
      .map((r) =>
        Number(
          within(r).getAllByRole('cell')[3].textContent!.replace(/\D/g, ''),
        ),
      );
    await expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
  },
};

/** Ticks survive a page change, and a refilter drops them. */
export const SelectionAndBulkAction: Story = {
  args: { loadInvoices: resolved(INVOICES), onRemind: fn() },
  play: async ({ args, canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    await tick(canvas, 'Select Acme Corp, INV-1001');
    await userEvent.click(canvas.getByRole('button', { name: 'Go to page 2' }));
    await tick(canvas, 'Select Ember Studio, INV-1012');
    await expect(canvas.getByText('2 selected')).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Send reminder' }),
    );
    await expect(args.onRemind).toHaveBeenLastCalledWith([
      'INV-1001',
      'INV-1012',
    ]);

    // Every match, then one unticked: the action reaches thirteen.
    await tick(canvas, 'Select all invoices on this page');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Select all 14' }),
    );
    await tick(canvas, 'Select Ember Studio, INV-1012');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Send reminder' }),
    );
    const reached = (args.onRemind as ReturnType<typeof fn>).mock.lastCall![0];
    await expect(reached).toHaveLength(13);
    await expect(reached).not.toContain('INV-1012');

    await userEvent.type(canvas.getByRole('searchbox'), 'a');
    await waitFor(() =>
      expect(canvas.queryByText(/selected$/)).not.toBeInTheDocument(),
    );
  },
};

/** One tag per value; removing one removes that filter alone. */
export const ActiveFilters: Story = {
  args: { loadInvoices: resolved(INVOICES) },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    await userEvent.type(canvas.getByRole('searchbox'), 'acme');
    await expect(canvas.getByText('2 invoices')).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: /Remove Search: “acme”/ }),
    );
    await expect(canvas.getByText('14 invoices')).toBeInTheDocument();
    await expect(
      canvas.queryByRole('grid', { name: 'Active filters' }),
    ).toBeNull();
  },
};

/** The row's one action follows its state: Mark as paid, or as unpaid. */
export const RowActionFollowsState: Story = {
  args: { loadInvoices: resolved(INVOICES), onMarkPaid: fn() },
  play: async ({ args, canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    const body = within(document.body);

    // INV-1001 is paid.
    await userEvent.click(
      canvas.getByRole('button', { name: 'Actions for Acme Corp, INV-1001' }),
    );
    await userEvent.click(
      await body.findByRole('menuitem', { name: 'Mark as unpaid' }),
    );
    await expect(args.onMarkPaid).toHaveBeenLastCalledWith('INV-1001', false);

    // INV-1002 is open.
    await userEvent.click(
      canvas.getByRole('button', { name: 'Actions for Birch & Co, INV-1002' }),
    );
    await userEvent.click(
      await body.findByRole('menuitem', { name: 'Mark as paid' }),
    );
    await expect(args.onMarkPaid).toHaveBeenLastCalledWith('INV-1002', true);
  },
};
