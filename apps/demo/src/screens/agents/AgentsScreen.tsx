import { useState } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  Icon,
  Input,
  Link,
  Pagination,
  Select,
  useToast,
} from 'ionbase-ui';
import { Pause } from 'ionbase-icons/icons/pause';
import { Plus } from 'ionbase-icons/icons/plus';
import { Search } from 'ionbase-icons/icons/search';
import { Trash2 } from 'ionbase-icons/icons/trash-2';

import {
  listAgents,
  setPaused,
  TEAMS,
  type Agent,
  type AgentStatus,
  type DeleteResult,
} from '../../data/agents';
import { useDemoSettings } from '../../lib/demo-settings';
import { href } from '../../lib/router';
import { useDebounced } from '../../lib/use-debounced';
import { useResource } from '../../lib/use-resource';
import { AgentsTable, AgentsTableSkeleton } from './AgentsTable';
import { DeleteAgentsModal } from './DeleteAgentsModal';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'failing', label: 'Failing' },
];

const TEAM_OPTIONS = [{ value: '', label: 'All teams' }, ...TEAMS];

/**
 * The DataTable pattern, with DestructiveConfirm for delete. The toolbar stays
 * usable in every state; only the table region is replaced.
 */
export function AgentsScreen() {
  const settings = useDemoSettings();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AgentStatus | 'all'>('all');
  const [team, setTeam] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [version, setVersion] = useState(0);
  const [toDelete, setToDelete] = useState<Agent[] | null>(null);
  const [notice, setNotice] = useState<DeleteResult | null>(null);

  const query = {
    search: useDebounced(search),
    status,
    team: team || null,
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
  const filtered = search !== '' || status !== 'all' || team !== '';
  const clearFilters = () =>
    requery(() => {
      setSearch('');
      setStatus('all');
      setTeam('');
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
      <div className="demo-page__header">
        <div>
          <h1 id="page-title" className="ion-text-h3">
            Agents
          </h1>
          <p className="ion-text-body demo-muted">
            Every agent in the workspace, what it does, and how it is doing.
          </p>
        </div>
        <Link
          variant="standalone"
          href={href('agents/new')}
          startIcon={<Icon as={Plus} size="sm" />}
        >
          New agent
        </Link>
      </div>

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
        <Input
          size="sm"
          type="search"
          aria-label="Search agents"
          placeholder="Search agents"
          leadingIcon={<Icon as={Search} size="sm" />}
          value={search}
          onChange={(v) => requery(() => setSearch(v))}
          wrapperClassName="demo-toolbar__search"
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
        <Select
          size="sm"
          aria-label="Team"
          options={TEAM_OPTIONS}
          value={team}
          onChange={(e) => requery(() => setTeam(e.target.value))}
        />

        {selectedRows.length > 0 && (
          <div className="demo-toolbar__bulk">
            <span className="ion-text-body-sm demo-muted">
              {selectedRows.length} selected
            </span>
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
          </div>
        )}
      </div>

      {/* Row count and selection, announced — a filter change is otherwise silent. */}
      <p className="ion-visually-hidden" role="status">
        {announcement}
      </p>

      {result.status === 'loading' && <AgentsTableSkeleton rows={pageSize} />}

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
                ? `Nothing matches “${search}” with the current status and team.`
                : 'Nothing matches the current status and team.'
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
