import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  Icon,
  Link,
  PageHeader,
  Pagination,
  SearchField,
  MultiSelect,
  Select,
  Toolbar,
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
  type AgentSortColumn,
  type AgentStatus,
  type DeleteResult,
} from '../../data/agents';
import { useDemoSettings } from '../../lib/demo-settings';
import { href } from '../../lib/router';
import { useDebounced } from '../../lib/use-debounced';
import { useResource } from '../../lib/use-resource';
import {
  AgentsTable,
  AgentsTableSkeleton,
  type HeaderSort,
} from './AgentsTable';
import { DeleteAgentsModal } from './DeleteAgentsModal';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'failing', label: 'Failing' },
];

/**
 * The DataTable pattern, with DestructiveConfirm for delete. The toolbar stays
 * usable in every state; only the table region is replaced.
 */
export function AgentsScreen() {
  const settings = useDemoSettings();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AgentStatus | 'all'>('all');
  const [teams, setTeams] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [version, setVersion] = useState(0);
  const [toDelete, setToDelete] = useState<Agent[] | null>(null);
  const [notice, setNotice] = useState<DeleteResult | null>(null);

  const { sort, sortProps } = useTableSort<AgentSortColumn>({
    column: 'name',
    direction: 'ascending',
  });

  const query = {
    search: useDebounced(search),
    status,
    teams,
    sort: sort ?? { column: 'name' as const, direction: 'ascending' as const },
    page,
    pageSize,
  };
  const result = useResource(
    (signal) => listAgents(query, settings, signal),
    JSON.stringify([query, settings.state, settings.latency, version]),
  );

  const refresh = () => setVersion((v) => v + 1);
  // Any change to what is listed drops the selection: acting on rows the user
  // can no longer see is how a bulk action surprises someone.
  const requery = (apply: () => void) => {
    apply();
    setPage(1);
    setSelected(new Set());
  };
  // A new order is a new listing: back to page 1, selection dropped.
  const headerSort: HeaderSort = (column, options) => {
    const props = sortProps(column, options);
    return { ...props, onSort: () => requery(props.onSort) };
  };
  const filtered = search !== '' || status !== 'all' || teams.length > 0;
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearchSoon = () =>
    requestAnimationFrame(() => searchRef.current?.focus());
  const activeFilters = [
    ...(search ? [{ id: 'search', label: `Search: “${search}”` }] : []),
    ...(status !== 'all'
      ? [{ id: 'status', label: `Status: ${STATUS_LABEL[status]}` }]
      : []),
    // One tag per team, so each can be removed on its own.
    ...teams.map((t) => ({
      id: `team:${t}`,
      label: `Team: ${TEAMS.find((o) => o.value === t)?.label ?? t}`,
    })),
  ];
  const clearFilters = () =>
    requery(() => {
      setSearch('');
      setStatus('all');
      setTeams([]);
    });

  const rows = result.status === 'ready' ? result.data.rows : [];
  const selectedRows = rows.filter((a) => selected.has(a.id));

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
    setSelected(new Set());
    setNotice(outcome);
    refresh();
  }

  const announcement =
    result.status === 'ready'
      ? `${result.data.total} ${result.data.total === 1 ? 'agent' : 'agents'}${
          selected.size ? `, ${selected.size} selected` : ''
        }`
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

      <div className="demo-toolbar">
        <SearchField
          size="sm"
          ref={searchRef}
          aria-label="Search agents"
          placeholder="Search agents"
          value={search}
          onChange={(v) => requery(() => setSearch(v))}
          className="demo-toolbar__search"
        />
        <Select
          size="sm"
          aria-label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) =>
            requery(() => setStatus(e.target.value as AgentStatus | 'all'))
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
          onChange={(ts) => requery(() => setTeams(ts))}
          hideTags
          wrapperClassName="demo-toolbar__teams"
        />

        {selectedRows.length > 0 && (
          <div className="demo-toolbar__bulk">
            <span className="ion-text-body-sm demo-muted">
              {selectedRows.length} selected
            </span>
            {/* One tab stop for the actions, ← → between them. The search and
                filters to the left stay ordinary tab stops — a toolbar around
                a text field strands whatever comes after it. */}
            <Toolbar
              aria-label={`Actions for ${selectedRows.length} selected ${selectedRows.length === 1 ? 'agent' : 'agents'}`}
            >
              <Button
                size="sm"
                variant="secondary"
                startIcon={<Icon as={Pause} size="sm" />}
                onClick={() => void pause(selectedRows, true)}
              >
                Pause
              </Button>
              <Button
                size="sm"
                variant="destructive"
                startIcon={<Icon as={Trash2} size="sm" />}
                onClick={() => setToDelete(selectedRows)}
              >
                Delete {selectedRows.length}
              </Button>
            </Toolbar>
          </div>
        )}
      </div>

      {/* Row count and selection, announced — a filter change is otherwise silent. */}
      <p className="ion-visually-hidden" role="status">
        {announcement}
      </p>

      {/* What is applied, each removable on its own — the selects only show
          their own value, and the search box can be scrolled out of view. */}
      {filtered && (
        <div className="demo-active-filters">
          <TagGroup
            label="Active filters"
            items={activeFilters}
            onRemove={(keys) => {
              requery(() => {
                if (keys.has('search')) setSearch('');
                if (keys.has('status')) setStatus('all');
                setTeams((ts) => ts.filter((t) => !keys.has(`team:${t}`)));
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
        </div>
      )}

      {result.status === 'loading' && (
        <AgentsTableSkeleton rows={pageSize} sortProps={headerSort} />
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

      {result.status === 'ready' && result.data.workspaceTotal === 0 && (
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

      {result.status === 'ready' &&
        result.data.workspaceTotal > 0 &&
        result.data.total === 0 && (
          <EmptyState
            reason="no-results"
            size="panel"
            headingLevel={2}
            title="No agents match these filters"
            description={
              search
                ? `Nothing matches “${search}” with the current status and teams.`
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

      {result.status === 'ready' && result.data.total > 0 && (
        <>
          {result.data.degraded > 0 && (
            <Alert
              intent="warning"
              title={`Metrics for ${result.data.degraded} agents couldn't load`}
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
            rows={rows}
            sortProps={headerSort}
            selected={selected}
            onSelectedChange={setSelected}
            onPause={(a, paused) => void pause([a], paused)}
            onDelete={(a) => setToDelete([a])}
          />
          <div className="demo-table-footer">
            <span className="ion-text-body-sm demo-muted">
              {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, result.data.total)} of{' '}
              {result.data.total}
            </span>
            <Pagination
              aria-label="Agent pages"
              size="sm"
              page={page}
              pageCount={Math.max(1, Math.ceil(result.data.total / pageSize))}
              onPageChange={(p) => {
                setPage(p);
                setSelected(new Set());
              }}
              showPageSize
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={(size) => requery(() => setPageSize(size))}
            />
          </div>
        </>
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
