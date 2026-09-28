import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  Icon,
  Link,
  PageHeader,
  Pagination,
  ProgressBar,
  SearchField,
  Stack,
  MultiSelect,
  Select,
  TableBatchBar,
  TableColumnsMenu,
  useTableColumns,
  useTableSelection,
  Tag,
  TagGroup,
  useTableSort,
  useToast,
} from 'ionbase-ui';
import { Pause } from 'ionbase-icons/icons/pause';
import { Plus } from 'ionbase-icons/icons/plus';
import { Trash2 } from 'ionbase-icons/icons/trash-2';

import {
  listAgents,
  setPaused,
  STATUS_LABEL,
  TEAMS,
  type Agent,
  type AgentPage,
  type AgentSortColumn,
  type AgentStatus,
  type DeleteResult,
} from '../../data/agents';
import { useDemoSettings } from '../../lib/demo-settings';
import {
  href,
  readHashQuery,
  setHashQuery,
  useHashQuery,
} from '../../lib/router';
import { useResource } from '../../lib/use-resource';
import {
  AGENT_COLUMNS,
  AgentsTable,
  AgentsTableSkeleton,
  type AgentColumn,
  type HeaderSort,
} from './AgentsTable';
import {
  PAGE_SIZES,
  readListing,
  writeListing,
  type AgentListing,
} from './agent-query';
import { DeleteAgentsModal } from './DeleteAgentsModal';

/**
 * Change the listing in the address. A change to anything but the page is a
 * new listing, so it starts again at page 1. Pushed, so Back undoes it —
 * except while typing a search, which replaces.
 */
function changeListing(
  patch: Partial<AgentListing>,
  options?: { replace?: boolean },
) {
  const next = { ...readListing(readHashQuery()), ...patch };
  if (!('page' in patch)) next.page = 1;
  setHashQuery(writeListing(next), options);
}

/** Which rows match: everything but the page. A change drops the selection. */
const matchKey = (l: AgentListing) =>
  JSON.stringify([l.search, l.status, l.teams, l.sort, l.pageSize]);
const sortKey = (s: AgentListing['sort'] | null) =>
  s ? `${s.column}:${s.direction}` : '';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'failing', label: 'Failing' },
];

/*
 * The columns someone chose and sized, kept in this browser: a view of the
 * table is theirs, and coming back to the page should not undo it.
 */
const VIEW_KEY = 'ionbase-ops:agents-columns';
type ColumnsView = {
  hidden: AgentColumn[];
  widths: Partial<Record<AgentColumn, number>>;
};

function loadView(): ColumnsView | undefined {
  try {
    const raw = window.localStorage.getItem(VIEW_KEY);
    return raw ? (JSON.parse(raw) as ColumnsView) : undefined;
  } catch {
    return undefined;
  }
}

function saveView(view: string) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Storage blocked: the view lasts until the page is left.
  }
}

/**
 * The DataTable pattern, with DestructiveConfirm for delete. The toolbar stays
 * usable in every state; only the table region is replaced.
 *
 * The FilteredDataTable pattern: search, filters, sort, page and page size
 * live in the address, so a reload, a shared link and Back all show the same
 * listing. A refilter keeps the rows on screen, busy, until the new ones land.
 */
export function AgentsScreen() {
  const settings = useDemoSettings();
  const toast = useToast();

  const columns = useTableColumns(AGENT_COLUMNS, { initial: loadView() });
  // Saved as text, so it is written when the view changes, not each render.
  const view = JSON.stringify({
    hidden: columns.hidden,
    widths: columns.widths,
  } satisfies ColumnsView);
  useEffect(() => saveView(view), [view]);

  const address = useHashQuery();
  const listing = useMemo(() => readListing(address), [address]);
  const { search: applied, status, teams, page, pageSize } = listing;
  /*
   * What is typed. Typing writes the address once it pauses; the address
   * changing any other way — Back, a link — writes the box. Only typing
   * starts the timer, so a Back press is never overwritten by a search
   * still waiting to be written.
   */
  const [search, setSearch] = useState(applied);
  const typing = useRef<number | undefined>(undefined);
  const type = (value: string) => {
    setSearch(value);
    window.clearTimeout(typing.current);
    typing.current = window.setTimeout(() => {
      typing.current = undefined;
      // Replaced: a history entry per pause would make Back unspell it.
      changeListing({ search: value.trim() }, { replace: true });
    }, 250);
  };
  const clearSearch = () => {
    window.clearTimeout(typing.current);
    typing.current = undefined;
    setSearch('');
  };
  useEffect(() => {
    if (typing.current === undefined) setSearch(applied);
  }, [applied]);
  useEffect(() => () => window.clearTimeout(typing.current), []);
  const [version, setVersion] = useState(0);
  const [toDelete, setToDelete] = useState<Agent[] | null>(null);
  const [notice, setNotice] = useState<DeleteResult | null>(null);

  const { sort, setSort, sortProps } = useTableSort<AgentSortColumn>(
    listing.sort,
  );

  const query = {
    search: applied,
    status,
    teams,
    sort: listing.sort,
    page,
    pageSize,
  };
  const result = useResource(
    (signal) => listAgents(query, settings, signal),
    JSON.stringify([query, settings.state, settings.latency, version]),
  );

  // A header press sorts the hook; the address follows, as a Back press.
  useEffect(() => {
    if (sort && sortKey(sort) !== sortKey(readListing(readHashQuery()).sort))
      changeListing({ sort });
  }, [sort]);

  /*
   * The last listing that loaded, shown while the next one does — for this
   * demo state and latency only, so forcing "loading" still shows skeletons.
   * Swapping the table for skeletons on every refilter jumps the page, and
   * unmounts the header a sort was just pressed on, dropping focus.
   */
  const dataKey = `${settings.state}|${settings.latency}`;
  const [kept, setKept] = useState<{ key: string; data: AgentPage } | null>(
    null,
  );
  if (result.status === 'ready' && kept?.data !== result.data)
    setKept({ key: dataKey, data: result.data });
  const data =
    result.status === 'ready'
      ? result.data
      : result.status === 'loading' && kept?.key === dataKey
        ? kept.data
        : null;
  const refreshing = result.status === 'loading' && data !== null;

  /*
   * The selection outlives a page change — ticking rows on page 1 and page 2
   * and acting on both is the point of it — and "Select all" reaches rows no
   * page has shown yet. Anything that changes WHICH rows match still drops it.
   */
  const selection = useTableSelection<string>({
    total: result.status === 'ready' ? result.data.total : undefined,
  });

  /*
   * When the address changes, the sort follows it — Back, a link. The hook
   * is only set when the address says something it does not, so a header
   * press is not undone before the address catches up. Any change to which
   * rows match drops the selection.
   */
  const [seenAddress, setSeenAddress] = useState(address);
  if (address !== seenAddress) {
    const before = readListing(seenAddress);
    setSeenAddress(address);
    if (sortKey(listing.sort) !== sortKey(sort)) setSort(listing.sort);
    if (matchKey(listing) !== matchKey(before)) selection.clear();
  }

  // A page past the end — a link kept while agents were deleted — is the last page.
  const pageCount = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  useEffect(() => {
    if (result.status === 'ready' && page > pageCount)
      changeListing({ page: pageCount }, { replace: true });
  }, [result.status, page, pageCount]);
  // Every agent a page has shown, so a selection spanning pages can be acted
  // on without refetching the ones already seen.
  const seen = useRef(new Map<string, Agent>());
  if (result.status === 'ready')
    for (const a of result.data.rows) seen.current.set(a.id, a);

  /** The agents a bulk action reaches: the ticked ones, or every match minus the unticked. */
  async function bulkTargets(): Promise<Agent[]> {
    const sel = selection.selection;
    if (sel.mode === 'keys')
      return [...sel.keys].flatMap((id) => seen.current.get(id) ?? []);
    const everything = await listAgents(
      { ...query, page: 1, pageSize: Number.MAX_SAFE_INTEGER },
      settings,
      new AbortController().signal,
    );
    return everything.rows.filter((a) => !sel.except.has(a.id));
  }

  const refresh = () => setVersion((v) => v + 1);
  // A new order is a new listing: the address takes it from the hook, and
  // the page and selection go with it.
  const headerSort: HeaderSort = sortProps;
  const filtered = applied !== '' || status !== 'all' || teams.length > 0;
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearchSoon = () =>
    requestAnimationFrame(() => searchRef.current?.focus());
  const activeFilters = [
    ...(applied ? [{ id: 'search', label: `Search: “${applied}”` }] : []),
    ...(status !== 'all'
      ? [{ id: 'status', label: `Status: ${STATUS_LABEL[status]}` }]
      : []),
    // One tag per team, so each can be removed on its own.
    ...teams.map((t) => ({
      id: `team:${t}`,
      label: `Team: ${TEAMS.find((o) => o.value === t)?.label ?? t}`,
    })),
  ];
  const clearFilters = () => {
    clearSearch();
    changeListing({ search: '', status: 'all', teams: [] });
  };

  const rows = data?.rows ?? [];

  async function pause(targets: Agent[], paused: boolean) {
    const ids = targets.map((a) => a.id);
    const noun =
      targets.length === 1 ? targets[0].name : `${targets.length} agents`;
    try {
      await setPaused(ids, paused, settings);
      refresh();
      toast.toast({
        intent: 'success',
        title: `${paused ? 'Paused' : 'Resumed'} ${noun}`,
        action: {
          label: 'Undo',
          onPress: () => void setPaused(ids, !paused, settings).then(refresh),
        },
        duration: 8000,
      });
    } catch (error) {
      toast.toast({
        intent: 'error',
        title: `Couldn't ${paused ? 'pause' : 'resume'} ${noun}`,
        message: (error as Error).message,
      });
    }
  }

  function onDeleted(outcome: DeleteResult) {
    selection.clear();
    setNotice(outcome);
    refresh();
  }

  const announcement =
    result.status === 'ready'
      ? // The selection count is TableBatchBar's own live region.
        `${result.data.total} ${result.data.total === 1 ? 'agent' : 'agents'}`
      : '';

  return (
    <div className="demo-page">
      <PageHeader
        titleId="page-title"
        title="Agents"
        description="Every agent in the workspace, what it does, and how it is doing."
        actions={
          <Link
            variant="standalone"
            href={href('agents/new')}
            startIcon={<Icon as={Plus} size="sm" />}
          >
            New agent
          </Link>
        }
      />

      {notice && notice.deleted.length > 0 && (
        <Alert
          intent="success"
          title={`Deleted ${notice.deleted.length} ${notice.deleted.length === 1 ? 'agent' : 'agents'}`}
          onDismiss={() => setNotice(null)}
          dismissLabel="Dismiss deletion notice"
        >
          Their run history and schedules are gone. Audit log entries were kept.
        </Alert>
      )}

      <Stack direction="row" wrap gap={8} className="demo-toolbar">
        <SearchField
          size="sm"
          ref={searchRef}
          aria-label="Search agents"
          placeholder="Search agents"
          value={search}
          onChange={type}
          className="demo-toolbar__search"
        />
        <Select
          size="sm"
          aria-label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) =>
            changeListing({ status: e.target.value as AgentStatus | 'all' })
          }
        />
        {/* Any number of teams. Its values are the active-filter tags below,
            so it does not draw its own. */}
        <MultiSelect
          size="sm"
          aria-label="Teams"
          placeholder="All teams"
          options={TEAMS}
          value={teams}
          onChange={(ts) => changeListing({ teams: ts })}
          hideTags
          wrapperClassName="demo-toolbar__teams"
        />
        <span className="demo-toolbar__end">
          <TableColumnsMenu columns={columns} />
        </span>
      </Stack>

      {/* Always rendered: its count is a live region that must already be in
          the page when the first row is ticked. Hidden while nothing is. */}
      <TableBatchBar
        count={selection.count}
        total={result.status === 'ready' ? result.data.total : undefined}
        isAllMatching={selection.isAllMatching}
        onSelectAll={selection.selectAllMatching}
        onClear={selection.clear}
        tableId="agents-table"
        labels={{
          selectAll: (n) => `Select all ${n} agents`,
          allSelected: (n) => `All ${n} agents selected`,
          actions: (n) => `Actions for ${n} selected agents`,
        }}
      >
        <Button
          size="sm"
          variant="secondary"
          startIcon={<Icon as={Pause} size="sm" />}
          onClick={() => void bulkTargets().then((t) => pause(t, true))}
        >
          Pause
        </Button>
        <Button
          size="sm"
          variant="destructive"
          startIcon={<Icon as={Trash2} size="sm" />}
          onClick={() => void bulkTargets().then(setToDelete)}
        >
          Delete {selection.count}
        </Button>
      </TableBatchBar>

      {/* Row count, announced — a filter change is otherwise silent. */}
      <p className="ion-visually-hidden" role="status">
        {announcement}
      </p>

      {/* What is applied, each removable on its own — the selects only show
          their own value, and the search box can be scrolled out of view. */}
      {filtered && (
        <Stack direction="row" wrap align="end" gap={8}>
          <TagGroup
            label="Active filters"
            items={activeFilters}
            onRemove={(keys) => {
              if (keys.has('search')) clearSearch();
              changeListing({
                ...(keys.has('search') ? { search: '' } : {}),
                ...(keys.has('status') ? { status: 'all' as const } : {}),
                teams: teams.filter((t) => !keys.has(`team:${t}`)),
              });
              // The last filter takes the whole row with it, so focus would
              // fall to the page. Search is the next filter control.
              if (keys.size >= activeFilters.length) focusSearchSoon();
            }}
          >
            {(f) => <Tag key={f.id}>{f.label}</Tag>}
          </TagGroup>
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => {
              clearFilters();
              focusSearchSoon();
            }}
          >
            Clear all
          </Button>
        </Stack>
      )}

      {/* Skeletons for the first load only; a refilter keeps the rows. */}
      {result.status === 'loading' && !data && (
        <AgentsTableSkeleton
          rows={pageSize}
          sortProps={headerSort}
          columns={columns}
        />
      )}

      {result.status === 'error' && (
        <Alert
          intent="error"
          title="Agents couldn't load"
          actions={
            <Button size="sm" variant="secondary" onClick={result.retry}>
              Try again
            </Button>
          }
        >
          {result.error.message} Your filters are kept.
        </Alert>
      )}

      {data && data.workspaceTotal === 0 && (
        <EmptyState
          reason="first-run"
          size="page"
          headingLevel={2}
          title="No agents yet"
          description="An agent watches for a trigger, does one job, and asks before anything irreversible."
          action={
            <Link variant="standalone" href={href('agents/new')}>
              Create your first agent
            </Link>
          }
        />
      )}

      {data && data.workspaceTotal > 0 && data.total === 0 && (
        <EmptyState
          reason="no-results"
          size="panel"
          headingLevel={2}
          title="No agents match these filters"
          description={
            applied
              ? `Nothing matches “${applied}” with the current status and teams.`
              : 'Nothing matches the current status and teams.'
          }
          action={
            filtered && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            )
          }
        />
      )}

      {data && data.total > 0 && (
        <div
          className="demo-listing"
          aria-busy={refreshing || undefined}
          data-refreshing={refreshing || undefined}
        >
          {/* The rows stay while the next listing loads; this says they are
              about to change. Reserved space, so nothing moves when it goes. */}
          <div className="demo-listing__progress">
            {refreshing && <ProgressBar size="sm" label="Updating agents" />}
          </div>
          {data.degraded > 0 && (
            <Alert
              intent="warning"
              title={`Metrics for ${data.degraded} agents couldn't load`}
              actions={
                <Button size="sm" variant="secondary" onClick={result.retry}>
                  Try again
                </Button>
              }
            >
              Those rows are shown without runs, success rate or last run.
            </Alert>
          )}
          <AgentsTable
            id="agents-table"
            rows={rows}
            sortProps={headerSort}
            columns={columns}
            selection={selection}
            onPause={(a, paused) => void pause([a], paused)}
            onDelete={(a) => setToDelete([a])}
          />
          <div className="demo-table-footer">
            <span className="ion-text-body-sm demo-muted">
              {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, data.total)} of {data.total}
            </span>
            <Pagination
              aria-label="Agent pages"
              size="sm"
              page={page}
              pageCount={pageCount}
              onPageChange={(p) => changeListing({ page: p })}
              showPageSize
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZES}
              onPageSizeChange={(size) => changeListing({ pageSize: size })}
              labels={{ pageSize: 'Agents per page' }}
            />
          </div>
        </div>
      )}

      {toDelete && toDelete.length > 0 && (
        <DeleteAgentsModal
          agents={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
