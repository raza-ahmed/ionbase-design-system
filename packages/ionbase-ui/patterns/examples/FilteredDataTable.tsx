/**
 * The FilteredDataTable pattern, worked: the invoices of the DataTable
 * example, paged on a server, with the search, filters, sort and page in the
 * address. A reload, a shared link and Back show the same listing, and a
 * refilter keeps the rows on screen until the next ones land.
 *
 * It is complete as it stands: `ionbase-ui` and React are its only imports,
 * and the build type-checks it against the package's published types. The
 * address is the hash (`#/invoices?q=acme&status=overdue&page=2`) so the
 * example needs no router; with one, `readAddress` and `writeAddress` are the
 * router's. The rows come in through `fetchInvoices`.
 *
 * The DataTable example shows row actions; this one leaves them out to keep
 * to what is new.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  MultiSelect,
  Pagination,
  ProgressBar,
  SearchField,
  Skeleton,
  Stack,
  StatusIndicator,
  Table,
  TableBatchBar,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tag,
  TagGroup,
  useTableSelection,
  useTableSort,
  type TableSort,
} from 'ionbase-ui';

export type InvoiceStatus = 'paid' | 'open' | 'overdue';
export type InvoiceColumn = 'customer' | 'amount' | 'due';

export interface Invoice {
  id: string;
  customer: string;
  /** In cents, so sums are exact. */
  amount: number;
  status: InvoiceStatus;
  /** ISO date. */
  due: string;
}

/** The listing: everything the address holds, and all the server needs. */
export interface InvoiceQuery {
  search: string;
  statuses: InvoiceStatus[];
  sort: TableSort<InvoiceColumn>;
  page: number;
  pageSize: number;
}

export interface InvoicePage {
  rows: Invoice[];
  /** Every invoice the query matches, on every page. */
  total: number;
}

/** What a bulk action reaches: ticked ids, or every match but the unticked. */
export type InvoiceTargets =
  { ids: string[] } | { query: InvoiceQuery; except: string[] };

const STATUS: Record<
  InvoiceStatus,
  { label: string; intent: 'success' | 'neutral' | 'error' }
> = {
  paid: { label: 'Paid', intent: 'success' },
  open: { label: 'Open', intent: 'neutral' },
  overdue: { label: 'Overdue', intent: 'error' },
};
const STATUSES = Object.keys(STATUS) as InvoiceStatus[];
const STATUS_OPTIONS = STATUSES.map((s) => ({
  value: s,
  label: STATUS[s].label,
}));
const COLUMNS: InvoiceColumn[] = ['customer', 'amount', 'due'];
const DEFAULT_SORT: TableSort<InvoiceColumn> = {
  column: 'due',
  direction: 'ascending',
};
const PAGE_SIZES = [10, 20, 50];

const money = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
});
const date = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/* ------------------------------------------------------------ the address */

/**
 * Read defensively: an address is typed, pasted and kept for months. A value
 * that means nothing now (a status since renamed, page "abc") falls back to
 * its default, never to an error page.
 */
export function readQuery(params: string): InvoiceQuery {
  const p = new URLSearchParams(params);
  const sort = p.get('sort') ?? '';
  const column = sort.replace(/^-/, '') as InvoiceColumn;
  const page = Number(p.get('page'));
  const size = Number(p.get('size'));
  return {
    search: p.get('q')?.trim() ?? '',
    statuses: [...new Set(p.getAll('status'))].filter((s): s is InvoiceStatus =>
      STATUSES.includes(s as InvoiceStatus),
    ),
    sort: COLUMNS.includes(column)
      ? {
          column,
          direction: sort.startsWith('-') ? 'descending' : 'ascending',
        }
      : DEFAULT_SORT,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    pageSize: PAGE_SIZES.includes(size) ? size : PAGE_SIZES[0],
  };
}

/** A value at its default is left out, so the plain address is the default view. */
export function writeQuery(q: InvoiceQuery): string {
  const p = new URLSearchParams();
  if (q.search) p.set('q', q.search);
  for (const s of q.statuses) p.append('status', s);
  if (
    q.sort.column !== DEFAULT_SORT.column ||
    q.sort.direction !== DEFAULT_SORT.direction
  )
    p.set(
      'sort',
      `${q.sort.direction === 'descending' ? '-' : ''}${q.sort.column}`,
    );
  if (q.page > 1) p.set('page', String(q.page));
  if (q.pageSize !== PAGE_SIZES[0]) p.set('size', String(q.pageSize));
  return p.toString();
}

function readAddress(): string {
  const hash = window.location.hash;
  const i = hash.indexOf('?');
  return i < 0 ? '' : hash.slice(i + 1);
}

/**
 * The address's query, and a way to write it. Writing tells the page at
 * once rather than waiting for `popstate`, which comes a task later: a second
 * pick in an open MultiSelect before then would be built on the first pick's
 * stale value, and replace it.
 */
function useAddress() {
  const [params, setParams] = useState(readAddress);
  useEffect(() => {
    const onBack = () => setParams(readAddress());
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
  const write = useCallback((next: string, replace: boolean) => {
    const route = window.location.hash.split('?')[0] || '#';
    const url = `${route}${next ? `?${next}` : ''}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setParams(next);
  }, []);
  return [params, write] as const;
}

/** Which rows match: everything but the page. A change drops the selection. */
const matchKey = (q: InvoiceQuery) =>
  JSON.stringify([q.search, q.statuses, q.sort, q.pageSize]);
const sortKey = (s: TableSort<InvoiceColumn> | null) =>
  s ? `${s.column}:${s.direction}` : '';

/* ---------------------------------------------------------------- the page */

type Load =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: InvoicePage };

export function InvoicesListing({
  fetchInvoices,
  onRemind,
}: {
  fetchInvoices: (
    query: InvoiceQuery,
    signal: AbortSignal,
  ) => Promise<InvoicePage>;
  onRemind?: (targets: InvoiceTargets) => void;
}) {
  const [params, writeAddress] = useAddress();
  const query = readQuery(params);

  /**
   * Change the listing. Anything but the page starts again at page 1. A
   * deliberate change pushes an entry, so Back undoes it; typing a search
   * replaces, so Back does not unspell it.
   */
  const change = (patch: Partial<InvoiceQuery>, replace = false) => {
    // From the address itself, not this render: a search written by the
    // timer must not undo a filter picked while it waited.
    const next = { ...readQuery(readAddress()), ...patch };
    if (!('page' in patch)) next.page = 1;
    writeAddress(writeQuery(next), replace);
  };

  /* The rows. A newer query aborts the older, so a slow answer to an old
   * filter cannot land over a newer one. */
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const key = writeQuery(query);
  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: 'loading' });
    fetchInvoices(readQuery(key), controller.signal).then(
      (data) => setLoad({ status: 'ready', data }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => controller.abort();
    // The query and the attempt are what refetch. `fetchInvoices` may be a
    // new function every render, so depending on it would refetch on each.
  }, [key, attempt]);

  /* A refilter keeps the last rows on screen, busy, until the next land.
   * Skeletons are for the first load only: swapping the table for them on
   * every change unmounts the header a sort was just pressed on. */
  const [kept, setKept] = useState<InvoicePage | null>(null);
  if (load.status === 'ready' && kept !== load.data) setKept(load.data);
  const data =
    load.status === 'ready'
      ? load.data
      : load.status === 'loading'
        ? kept
        : null;
  const refreshing = load.status === 'loading' && data !== null;

  /* What is typed. Typing writes the address once it pauses. The timer is
   * started from the box's onChange, and only typing starts it, so a Back
   * pressed while it waits is never overwritten by the old search. */
  const [search, setSearch] = useState(query.search);
  const typing = useRef<number | undefined>(undefined);
  const type = (value: string) => {
    setSearch(value);
    window.clearTimeout(typing.current);
    typing.current = window.setTimeout(() => {
      typing.current = undefined;
      change({ search: value.trim() }, true);
    }, 250);
  };
  useEffect(() => {
    if (typing.current === undefined) setSearch(query.search);
  }, [query.search]);
  useEffect(() => () => window.clearTimeout(typing.current), []);

  const total = load.status === 'ready' ? load.data.total : undefined;
  const selection = useTableSelection<string>({ total });
  const { sort, setSort, sortProps } = useTableSort<InvoiceColumn>(query.sort);

  /* The controls follow the address. When it changes by Back or a link: the
   * search box shows it unless someone is typing, the sort hook is set only
   * if it disagrees, and a change to which rows match drops the selection. */
  const [seen, setSeen] = useState(params);
  if (params !== seen) {
    const before = readQuery(seen);
    setSeen(params);
    if (sortKey(query.sort) !== sortKey(sort)) setSort(query.sort);
    if (matchKey(query) !== matchKey(before)) selection.clear();
  }
  // A header press sorts the hook; the address follows it.
  useEffect(() => {
    if (sort && sortKey(sort) !== sortKey(readQuery(readAddress()).sort))
      change({ sort });
  }, [sort]);

  // A page past the end, a link kept while invoices were paid, is the last page.
  const pageCount = data
    ? Math.max(1, Math.ceil(data.total / query.pageSize))
    : 1;
  useEffect(() => {
    if (load.status === 'ready' && query.page > pageCount)
      change({ page: pageCount }, true);
  }, [load.status, query.page, pageCount]);

  const filtered = query.search !== '' || query.statuses.length > 0;
  const activeFilters = [
    ...(query.search
      ? [{ id: 'search', label: `Search: “${query.search}”` }]
      : []),
    ...query.statuses.map((s) => ({
      id: `status:${s}`,
      label: `Status: ${STATUS[s].label}`,
    })),
  ];
  const clearFilters = () => {
    window.clearTimeout(typing.current);
    typing.current = undefined;
    setSearch('');
    change({ search: '', statuses: [] });
  };

  /* Every match but the unticked goes to the server as the query: the rows
   * on pages never loaded have no ids here. */
  const targets = (): InvoiceTargets => {
    const s = selection.selection;
    return s.mode === 'all'
      ? { query: { ...query, page: 1 }, except: [...s.except] }
      : { ids: [...s.keys] };
  };

  const headers = (
    <>
      <TableCell header scope="col" {...sortProps('customer')}>
        Customer
      </TableCell>
      <TableCell header scope="col">
        Status
      </TableCell>
      <TableCell
        header
        scope="col"
        align="trailing"
        {...sortProps('amount', { firstDirection: 'descending' })}
      >
        Amount
      </TableCell>
      <TableCell header scope="col" {...sortProps('due')}>
        Due
      </TableCell>
    </>
  );

  return (
    <Stack gap={16}>
      <Stack direction="row" wrap gap={8}>
        <SearchField
          size="sm"
          aria-label="Search invoices by customer"
          placeholder="Search customers"
          value={search}
          onChange={type}
        />
        {/* Read from the address directly, so Back shows what it restored. */}
        <MultiSelect
          size="sm"
          aria-label="Status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={query.statuses}
          onChange={(statuses) =>
            change({ statuses: statuses as InvoiceStatus[] })
          }
          hideTags
        />
      </Stack>

      {filtered && (
        <Stack direction="row" wrap align="end" gap={8}>
          <TagGroup
            label="Active filters"
            items={activeFilters}
            onRemove={(keys) => {
              if (keys.has('search')) {
                window.clearTimeout(typing.current);
                typing.current = undefined;
                setSearch('');
              }
              change({
                ...(keys.has('search') ? { search: '' } : {}),
                statuses: query.statuses.filter(
                  (s) => !keys.has(`status:${s}`),
                ),
              });
            }}
          >
            {(f) => <Tag key={f.id}>{f.label}</Tag>}
          </TagGroup>
          <Button size="sm" variant="tertiary" onPress={clearFilters}>
            Clear all
          </Button>
        </Stack>
      )}

      {/* Not in the address: a link must not tick rows for whoever opens it. */}
      <TableBatchBar
        count={selection.count}
        total={total}
        isAllMatching={selection.isAllMatching}
        onSelectAll={selection.selectAllMatching}
        onClear={selection.clear}
        tableId="invoice-listing"
      >
        <Button
          size="sm"
          variant="secondary"
          onPress={() => onRemind?.(targets())}
        >
          Send reminder
        </Button>
      </TableBatchBar>

      {/* Empty while loading, so nothing stale is read; the count once the rows land. */}
      <p className="ion-visually-hidden" role="status">
        {load.status === 'ready'
          ? `${load.data.total} ${load.data.total === 1 ? 'invoice' : 'invoices'}`
          : ''}
      </p>

      {load.status === 'loading' && !data && (
        <div aria-busy="true">
          <p className="ion-visually-hidden" role="status">
            Loading invoices
          </p>
          <Table aria-label="Invoices (loading)">
            <TableHead>
              <TableRow>
                <TableCell header scope="col">
                  <span className="ion-visually-hidden">Select</span>
                </TableCell>
                {headers}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }, (_, r) => (
                <TableRow key={r}>
                  {Array.from({ length: 5 }, (_, c) => (
                    <TableCell key={c}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* The controls and the address keep the query, so Try again and a
          reload retry the same listing. */}
      {load.status === 'error' && (
        <Alert
          intent="error"
          title="Invoices couldn’t load"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          }
        >
          {load.error.message} Your search and filters are kept.
        </Alert>
      )}

      {/* The address keeps the filters, so a shared link to an empty listing
          still says what matched nothing. */}
      {data && data.total === 0 && load.status === 'ready' && (
        <EmptyState
          reason={filtered ? 'no-results' : 'first-run'}
          size={filtered ? 'panel' : 'page'}
          headingLevel={2}
          title={
            filtered ? 'No invoices match these filters' : 'No invoices yet'
          }
          description={
            query.search
              ? `Nothing matches “${query.search}” with these statuses.`
              : undefined
          }
          action={
            filtered && (
              <Button variant="secondary" onPress={clearFilters}>
                Clear filters
              </Button>
            )
          }
        />
      )}

      {data && data.total > 0 && (
        <Stack gap={8}>
          <div aria-busy={refreshing || undefined}>
            <Stack gap={4}>
              {/* Room kept for it, so nothing moves when it comes and goes. */}
              <div style={{ minBlockSize: 'var(--spacing-4)' }}>
                {refreshing && (
                  <ProgressBar size="sm" label="Updating invoices" />
                )}
              </div>
              <Table id="invoice-listing" aria-label="Invoices">
                <TableHead>
                  <TableRow
                    selection={selection.headSelection(
                      data.rows.map((i) => i.id),
                      'Select all invoices on this page',
                    )}
                  >
                    {headers}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((i) => (
                    <TableRow
                      key={i.id}
                      isSelected={selection.isSelected(i.id)}
                      selection={selection.rowSelection(
                        i.id,
                        `Select ${i.customer}, ${i.id}`,
                      )}
                    >
                      <TableCell>{i.customer}</TableCell>
                      <TableCell>
                        <StatusIndicator intent={STATUS[i.status].intent}>
                          {STATUS[i.status].label}
                        </StatusIndicator>
                      </TableCell>
                      <TableCell align="trailing">
                        {money.format(i.amount / 100)}
                      </TableCell>
                      <TableCell>{date.format(new Date(i.due))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </div>
          <Pagination
            aria-label="Invoice pages"
            size="sm"
            page={Math.min(query.page, pageCount)}
            pageCount={pageCount}
            onPageChange={(page) => change({ page })}
            showPageSize
            pageSize={query.pageSize}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={(pageSize) => change({ pageSize })}
            labels={{ pageSize: 'Invoices per page' }}
          />
        </Stack>
      )}
    </Stack>
  );
}
