/**
 * The DataTable pattern, worked: a list of invoices that is searched,
 * filtered, sorted, paged, selected and acted on, with its loading, empty and
 * error states. Copy it and change the record, not the structure.
 *
 * It is complete as it stands: `ionbase-ui` and React are its only imports,
 * and the build type-checks it against the package's published types. The
 * data comes in through `loadInvoices`; everything else is here.
 *
 * Not shown, see the pattern: the query in the address (the FilteredDataTable
 * pattern and its example), columns people choose, a row's detail in a
 * SidePanel, and DestructiveConfirm before a destructive bulk action.
 */
import { useEffect, useState, type SVGProps } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  Icon,
  Menu,
  MenuItem,
  MenuTrigger,
  MultiSelect,
  Pagination,
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

export interface Invoice {
  id: string;
  customer: string;
  /** In cents, so sums are exact. */
  amount: number;
  status: InvoiceStatus;
  /** ISO date. */
  due: string;
}

type Column = 'customer' | 'amount' | 'due';

const STATUS: Record<
  InvoiceStatus,
  { label: string; intent: 'success' | 'neutral' | 'error' }
> = {
  paid: { label: 'Paid', intent: 'success' },
  open: { label: 'Open', intent: 'neutral' },
  overdue: { label: 'Overdue', intent: 'error' },
};

const STATUS_OPTIONS = Object.entries(STATUS).map(([value, s]) => ({
  value,
  label: s.label,
}));

const PAGE_SIZE = 10;
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

/** Any SVG component is an icon. The design system does not ship a set. */
function MoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

type Load =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; invoices: Invoice[] };

function byColumn(sort: TableSort<Column> | null) {
  return (a: Invoice, b: Invoice) => {
    if (!sort) return 0;
    const d =
      sort.column === 'amount'
        ? a.amount - b.amount
        : a[sort.column].localeCompare(b[sort.column]);
    return sort.direction === 'ascending' ? d : -d;
  };
}

export function InvoicesTable({
  loadInvoices,
  onRemind,
  onMarkPaid,
}: {
  loadInvoices: (signal: AbortSignal) => Promise<Invoice[]>;
  onRemind?: (ids: string[]) => void;
  onMarkPaid?: (id: string, paid: boolean) => void;
}) {
  /* The three states. A retry is a new attempt, and a newer attempt aborts
   * the one before, so a slow old answer cannot overwrite a newer one. */
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: 'loading' });
    loadInvoices(controller.signal).then(
      (invoices) => setLoad({ status: 'ready', invoices }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => controller.abort();
    // An attempt is what reloads. `loadInvoices` may be a new function every
    // render, so depending on it would refetch on every render.
  }, [attempt]);

  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const { sort, sortProps } = useTableSort<Column>({
    column: 'due',
    direction: 'ascending',
  });

  const all = load.status === 'ready' ? load.invoices : [];
  const q = search.trim().toLowerCase();
  const matching = all
    .filter((i) => !q || i.customer.toLowerCase().includes(q))
    .filter((i) => !statuses.length || statuses.includes(i.status))
    .sort(byColumn(sort));
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const rows = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selection = useTableSelection<string>({ total: matching.length });

  /* A change to which rows match starts again at page 1 and drops the
   * selection. A page change keeps it, so rows ticked on two pages can be
   * acted on together. */
  const refilter = () => {
    setPage(1);
    selection.clear();
  };
  const header = (column: Column, first?: 'descending') => {
    const props = sortProps(column, { firstDirection: first });
    return {
      ...props,
      onSort: () => {
        props.onSort();
        refilter();
      },
    };
  };

  const activeFilters = [
    ...(q ? [{ id: 'search', label: `Search: “${search.trim()}”` }] : []),
    ...statuses.map((s) => ({
      id: `status:${s}`,
      label: `Status: ${STATUS[s as InvoiceStatus].label}`,
    })),
  ];
  const clearFilters = () => {
    setSearch('');
    setStatuses([]);
    refilter();
  };

  /** The ids a bulk action reaches: the ticked ones, or every match but the unticked. */
  const targets = () => {
    const s = selection.selection;
    return s.mode === 'all'
      ? matching.map((i) => i.id).filter((id) => !s.except.has(id))
      : [...s.keys];
  };

  /* The header row, the same in every state, so nothing moves when the
   * rows land and a sort pressed during a load keeps its focus. */
  const headers = (
    <>
      <TableCell header scope="col" {...header('customer')}>
        Customer
      </TableCell>
      <TableCell header scope="col">
        Status
      </TableCell>
      <TableCell
        header
        scope="col"
        align="trailing"
        {...header('amount', 'descending')}
      >
        Amount
      </TableCell>
      <TableCell header scope="col" {...header('due')}>
        Due
      </TableCell>
      <TableCell header scope="col">
        <span className="ion-visually-hidden">Actions</span>
      </TableCell>
    </>
  );

  return (
    <Stack gap={16}>
      {/* The toolbar stays usable in every state, the error included. */}
      <Stack direction="row" wrap gap={8}>
        <SearchField
          size="sm"
          aria-label="Search invoices by customer"
          placeholder="Search customers"
          value={search}
          onChange={(value) => {
            setSearch(value);
            refilter();
          }}
        />
        {/* Its values are the active-filter tags below, so it draws none. */}
        <MultiSelect
          size="sm"
          aria-label="Status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={statuses}
          onChange={(value) => {
            setStatuses(value);
            refilter();
          }}
          hideTags
        />
      </Stack>

      {activeFilters.length > 0 && (
        <Stack direction="row" wrap align="end" gap={8}>
          <TagGroup
            label="Active filters"
            items={activeFilters}
            onRemove={(keys) => {
              if (keys.has('search')) setSearch('');
              setStatuses((s) => s.filter((v) => !keys.has(`status:${v}`)));
              refilter();
            }}
          >
            {(f) => <Tag key={f.id}>{f.label}</Tag>}
          </TagGroup>
          <Button size="sm" variant="tertiary" onPress={clearFilters}>
            Clear all
          </Button>
        </Stack>
      )}

      {/* Always rendered: its count is a live region, which must be in the
          page before the first row is ticked. Hidden while nothing is. */}
      <TableBatchBar
        count={selection.count}
        total={matching.length}
        isAllMatching={selection.isAllMatching}
        onSelectAll={selection.selectAllMatching}
        onClear={selection.clear}
        tableId="invoices-table"
      >
        <Button
          size="sm"
          variant="secondary"
          onPress={() => onRemind?.(targets())}
        >
          Send reminder
        </Button>
      </TableBatchBar>

      {/* The count after every change, or a filter is silent. */}
      <p className="ion-visually-hidden" role="status">
        {load.status === 'ready'
          ? `${matching.length} ${matching.length === 1 ? 'invoice' : 'invoices'}`
          : ''}
      </p>

      {load.status === 'loading' && (
        <div aria-busy="true">
          <p className="ion-visually-hidden" role="status">
            Loading invoices
          </p>
          <Table aria-label="Invoices (loading)">
            <TableHead>
              {/* The selection column too, where the checkboxes will be. */}
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
                  {Array.from({ length: 6 }, (_, c) => (
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

      {/* Two empties, with opposite ways out. */}
      {load.status === 'ready' && all.length === 0 && (
        <EmptyState
          reason="first-run"
          size="page"
          headingLevel={2}
          title="No invoices yet"
          description="Invoices appear here once you bill a customer."
        />
      )}
      {load.status === 'ready' && all.length > 0 && matching.length === 0 && (
        <EmptyState
          reason="no-results"
          size="panel"
          headingLevel={2}
          title="No invoices match these filters"
          action={
            <Button variant="secondary" onPress={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}

      {rows.length > 0 && (
        <>
          <Table id="invoices-table" aria-label="Invoices">
            <TableHead>
              <TableRow
                selection={selection.headSelection(
                  rows.map((i) => i.id),
                  'Select all invoices on this page',
                )}
              >
                {headers}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((i) => {
                const paid = i.status === 'paid';
                return (
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
                    <TableCell align="trailing">
                      <MenuTrigger placement="bottom end">
                        <Button
                          size="sm"
                          variant="tertiary"
                          aria-label={`Actions for ${i.customer}, ${i.id}`}
                          startIcon={<Icon as={MoreIcon} size="sm" />}
                        />
                        {/* A row that changes with state is a ternary, not
                            an array of elements: see Menu's contract. */}
                        <Menu onAction={() => onMarkPaid?.(i.id, !paid)}>
                          {paid ? (
                            <MenuItem key="reopen">Mark as unpaid</MenuItem>
                          ) : (
                            <MenuItem key="paid">Mark as paid</MenuItem>
                          )}
                        </Menu>
                      </MenuTrigger>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <Pagination
              aria-label="Invoice pages"
              size="sm"
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </Stack>
  );
}
