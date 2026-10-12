import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

/*
 * The worked example itself, compiled from
 * packages/ionbase-ui/patterns/examples/FilteredDataTable.tsx by the build and
 * imported by path, since it is not a package export.
 */
import {
  InvoicesListing,
  type Invoice,
  type InvoicePage,
  type InvoiceQuery,
} from '../../../../packages/ionbase-ui/dist/pattern-examples/FilteredDataTable.js';

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

const INVOICES: Invoice[] = Array.from({ length: 24 }, (_, i) => ({
  id: `INV-${1001 + i}`,
  customer: CUSTOMERS[i % CUSTOMERS.length],
  amount: 10_000 + ((i * 7919) % 90_000),
  status: STATUSES[i % 3],
  due: `2026-10-${String(1 + i).padStart(2, '0')}`,
}));

/** What a server does with the query: filter, sort, then page. */
function answer(q: InvoiceQuery): InvoicePage {
  const s = q.search.toLowerCase();
  const rows = INVOICES.filter(
    (i) =>
      (!s || i.customer.toLowerCase().includes(s)) &&
      (!q.statuses.length || q.statuses.includes(i.status)),
  ).sort((a, b) => {
    const d =
      q.sort.column === 'amount'
        ? a.amount - b.amount
        : a[q.sort.column].localeCompare(b[q.sort.column]);
    return q.sort.direction === 'ascending' ? d : -d;
  });
  const start = (q.page - 1) * q.pageSize;
  return { rows: rows.slice(start, start + q.pageSize), total: rows.length };
}

/** A server that takes `ms` to answer, and records what it was asked. */
function server(ms = 0) {
  const asked: InvoiceQuery[] = [];
  const fetchInvoices = (q: InvoiceQuery) => {
    asked.push(q);
    return new Promise<InvoicePage>((resolve) =>
      setTimeout(() => resolve(answer(q)), ms),
    );
  };
  return { fetchInvoices, asked };
}

const at = (hash: string) => () => {
  window.history.replaceState(null, '', hash);
  return () => window.history.replaceState(null, '', '#');
};
const hash = () => window.location.hash;
const firstColumn = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole('region', { name: 'Invoices' }))
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[1]?.textContent);

const meta: Meta<typeof InvoicesListing> = {
  title: 'Patterns/Filtered data table (worked example)',
  component: InvoicesListing,
  beforeEach: at('#/invoices'),
  parameters: {
    docs: {
      description: {
        component:
          'The FilteredDataTable pattern’s worked example, `patterns/examples/FilteredDataTable.tsx`, rendered: the query in the address (here the hash), and a refilter that keeps the rows. The build type-checks it against the published types; it ships in `ionbase-ui/patterns/FilteredDataTable.json` as `example.source`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof InvoicesListing>;

export const Default: Story = {
  args: { fetchInvoices: server(0).fetchInvoices },
};

/** A link opens the listing it names: filters, sort and page. */
export const TheAddressIsTheListing: Story = {
  beforeEach: at('#/invoices?status=overdue&sort=-amount&size=20'),
  args: { fetchInvoices: server(0).fetchInvoices },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    await expect(canvas.getByText('8 invoices')).toBeInTheDocument();
    await expect(
      canvas.getByRole('row', { name: /Status: Overdue/ }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Amount' }).closest('th'),
    ).toHaveAttribute('aria-sort', 'descending');
  },
};

/** An old or mangled address falls back to defaults, never to an error. */
export const ReadDefensively: Story = {
  beforeEach: at('#/invoices?status=void&sort=colour&page=abc&size=7'),
  args: { fetchInvoices: server(0).fetchInvoices },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    await expect(canvas.getByText('24 invoices')).toBeInTheDocument();
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(firstColumn(canvas)).toHaveLength(10);
  },
};

/*
 * Sorted by due date, the first two rows are Acme Corp and Birch & Co; by
 * customer, Acme Corp and Acme Corp. The second row says which order it is.
 */

/** A sort pushes an entry, so Back undoes it; the header follows Back. */
export const BackUndoesASort: Story = {
  args: { fetchInvoices: server(0).fetchInvoices },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    const before = window.history.length;
    await userEvent.click(canvas.getByRole('button', { name: 'Customer' }));
    await waitFor(() => expect(hash()).toBe('#/invoices?sort=customer'));
    await expect(window.history.length).toBe(before + 1);
    await waitFor(() => expect(firstColumn(canvas)[1]).toBe('Acme Corp'));

    window.history.back();
    await waitFor(() => expect(hash()).toBe('#/invoices'));
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Customer' }).closest('th'),
      ).not.toHaveAttribute('aria-sort'),
    );
  },
};

/** Typing replaces the entry: Back must not unspell the search. */
export const TypingReplaces: Story = {
  args: { fetchInvoices: server(0).fetchInvoices },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    const before = window.history.length;
    await userEvent.type(canvas.getByRole('searchbox'), 'acme');
    await waitFor(() => expect(hash()).toBe('#/invoices?q=acme'));
    await expect(window.history.length).toBe(before);
    await expect(await canvas.findByText('4 invoices')).toBeInTheDocument();
  },
};

/** The rows stay, busy, under a ProgressBar while the next ones load. */
export const RefilterKeepsTheRows: Story = {
  args: { fetchInvoices: server(400).fetchInvoices },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' }, { timeout: 2000 });
    await userEvent.click(canvas.getByRole('button', { name: 'Customer' }));
    // The same rows, busy, with the header just pressed still there.
    const busy = canvas
      .getByRole('region', { name: 'Invoices' })
      .closest('[aria-busy="true"]');
    await expect(busy).not.toBeNull();
    await expect(
      canvas.getByRole('progressbar', { name: 'Updating invoices' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Customer' }),
    ).toHaveFocus();
    await expect(canvas.queryByText('Loading invoices')).toBeNull();
    await waitFor(() => expect(firstColumn(canvas)[1]).toBe('Acme Corp'), {
      timeout: 2000,
    });
    await expect(canvas.queryByRole('progressbar')).toBeNull();
  },
};

/** "Select all 24" goes to the server as the query, not as a list of ids. */
export const AllMatchingIsTheQuery: Story = {
  beforeEach: at('#/invoices?q=a'),
  args: { fetchInvoices: server(0).fetchInvoices, onRemind: fn() },
  play: async ({ args, canvas }) => {
    await canvas.findByRole('region', { name: 'Invoices' });
    const total = Number(
      canvas.getByText(/^\d+ invoices$/).textContent!.split(' ')[0],
    );
    await userEvent.click(
      canvas
        .getByRole('checkbox', { name: 'Select all invoices on this page' })
        .closest('label') as HTMLElement,
    );
    await userEvent.click(
      canvas.getByRole('button', { name: `Select all ${total}` }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Send reminder' }),
    );
    await expect(args.onRemind).toHaveBeenLastCalledWith({
      query: expect.objectContaining({ search: 'a', page: 1 }),
      except: [],
    });
  },
};

/** A page past the end is the last page, corrected in place. */
export const PagePastTheEnd: Story = {
  beforeEach: at('#/invoices?page=9'),
  args: { fetchInvoices: server(0).fetchInvoices },
  play: async ({ canvas }) => {
    await waitFor(() => expect(hash()).toBe('#/invoices?page=3'));
    await waitFor(() => expect(firstColumn(canvas)).toHaveLength(4));
  },
};

/** The address keeps the filters on an empty result; Clear filters clears both. */
export const EmptyKeepsTheFilters: Story = {
  beforeEach: at('#/invoices?q=zzz'),
  args: { fetchInvoices: server(0).fetchInvoices },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', {
        name: 'No invoices match these filters',
      }),
    ).toBeVisible();
    await expect(hash()).toBe('#/invoices?q=zzz');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Clear filters' }),
    );
    await waitFor(() => expect(hash()).toBe('#/invoices'));
    await expect(canvas.getByRole('searchbox')).toHaveValue('');
  },
};

/** Try again retries the same listing: the query survives the error. */
export const ErrorKeepsTheQuery: Story = {
  beforeEach: at('#/invoices?status=open'),
  args: {
    fetchInvoices: (() => {
      let calls = 0;
      return (q: InvoiceQuery) =>
        ++calls === 1
          ? Promise.reject(new Error('The billing service timed out.'))
          : Promise.resolve(answer(q));
    })(),
  },
  play: async ({ canvas }) => {
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('Your search and filters are kept.');
    await expect(hash()).toBe('#/invoices?status=open');
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Try again' }),
    );
    await expect(await canvas.findByText('8 invoices')).toBeInTheDocument();
  },
};
