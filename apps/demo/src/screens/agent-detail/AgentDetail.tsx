import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  EmptyState,
  FullCard,
  Icon,
  Link,
  NavItem,
  Skeleton,
  StatGroup,
  StatTile,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useToast,
} from 'ionbase-ui';
import { Pause } from 'ionbase-icons/icons/pause';
import { Play } from 'ionbase-icons/icons/play';
import { RefreshCw } from 'ionbase-icons/icons/refresh-cw';

import {
  STATUS_LABEL,
  TEAMS,
  getAgent,
  setPaused,
  type AgentDetail as Detail,
  type AgentRunRow,
  type AgentStatus,
} from '../../data/agents';
import { formatDay } from '../../lib/dates';
import { useDemoSettings } from '../../lib/demo-settings';
import { href } from '../../lib/router';
import { useResource } from '../../lib/use-resource';
import { RunsByDayChart } from '../../local/charts/RunsByDayChart';

const STATUS_INTENT: Record<
  AgentStatus,
  'success' | 'neutral' | 'error' | 'information'
> = {
  running: 'success',
  paused: 'neutral',
  failing: 'error',
  draft: 'information',
};

const OUTCOME: Record<
  AgentRunRow['outcome'],
  { intent: 'success' | 'error' | 'neutral'; label: string }
> = {
  completed: { intent: 'success', label: 'Completed' },
  failed: { intent: 'error', label: 'Failed' },
  stopped: { intent: 'neutral', label: 'Stopped' },
};

const teamLabel = (value: string) =>
  TEAMS.find((t) => t.value === value)?.label ?? value;

export type AgentTab = 'overview' | 'runs';

/**
 * One agent: what it does, how it has been running, and its recent runs.
 * Implements PageShell with a section switcher of NavItems — each tab is its
 * own URL, so it is navigation (`isCurrent`), not an in-page Tabs panel.
 */
export function AgentDetail({ id, tab }: { id: string; tab: AgentTab }) {
  const settings = useDemoSettings();
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const detail = useResource(
    (signal) => getAgent(id, settings, signal),
    `${id}|${settings.state}|${settings.latency}|${version}`,
  );

  if (detail.status === 'loading') return <AgentLoading />;

  if (detail.status === 'error') {
    return (
      <div className="demo-page">
        <AgentBreadcrumb name="Agent" />
        <h1 id="page-title" className="ion-text-h4">
          Agent
        </h1>
        <EmptyState
          reason="error"
          size="page"
          headingLevel={2}
          title="This agent couldn't load"
          description={`${detail.error.message} The agent itself is unaffected — only this page is missing.`}
          action={
            <Button
              variant="secondary"
              startIcon={<Icon as={RefreshCw} size="sm" />}
              onClick={detail.retry}
            >
              Try again
            </Button>
          }
          secondaryAction={<Link href={href('agents')}>Back to agents</Link>}
        />
      </div>
    );
  }

  if (detail.data === null) {
    return (
      <div className="demo-page">
        <AgentBreadcrumb name="Not found" />
        <h1 id="page-title" className="ion-text-h4">
          Agent not found
        </h1>
        <EmptyState
          reason="no-results"
          size="page"
          headingLevel={2}
          title="There is no agent with this ID"
          description="It may have been deleted, or be in a different workspace."
          action={<Link href={href('agents')}>Back to agents</Link>}
        />
      </div>
    );
  }

  const { agent } = detail.data;
  const canToggle = agent.status !== 'draft';
  const paused = agent.status === 'paused';

  async function togglePause() {
    setBusy(true);
    try {
      await setPaused([agent.id], !paused, settings);
      setVersion((v) => v + 1);
      toast.toast({
        intent: 'success',
        title: `${paused ? 'Resumed' : 'Paused'} ${agent.name}`,
      });
    } catch (error) {
      toast.toast({
        intent: 'error',
        title: `Couldn't ${paused ? 'resume' : 'pause'} ${agent.name}`,
        message: (error as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="demo-page">
      <AgentBreadcrumb name={agent.name} />
      {/* The page's h1 is the agent's name; the card's headline is an h2 below it. */}
      <div className="demo-page__header">
        <div>
          <h1 id="page-title" className="ion-text-h4">
            {agent.name}
          </h1>
          <p className="ion-text-body demo-muted">{agent.purpose}</p>
        </div>
      </div>

      <nav aria-label={`${agent.name} sections`} className="demo-subnav">
        <NavItem
          href={href(`agents/${agent.id}`)}
          isCurrent={tab === 'overview'}
        >
          Overview
        </NavItem>
        <NavItem
          href={href(`agents/${agent.id}/runs`)}
          isCurrent={tab === 'runs'}
        >
          Runs
        </NavItem>
      </nav>

      {tab === 'overview' ? (
        <Overview
          data={detail.data}
          busy={busy}
          canToggle={canToggle}
          paused={paused}
          onToggle={togglePause}
        />
      ) : (
        <Runs data={detail.data} />
      )}
    </div>
  );
}

function AgentBreadcrumb({ name }: { name: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbItem href={href('agents')}>Agents</BreadcrumbItem>
      <BreadcrumbItem isCurrent>{name}</BreadcrumbItem>
    </Breadcrumb>
  );
}

function Overview({
  data,
  busy,
  canToggle,
  paused,
  onToggle,
}: {
  data: Detail;
  busy: boolean;
  canToggle: boolean;
  paused: boolean;
  onToggle: () => void;
}) {
  const { agent, daily, medianDurationSec } = data;
  const totals = daily?.reduce(
    (t, d) => ({
      runs: t.runs + d.completed + d.failed + d.stopped,
      failed: t.failed + d.failed,
    }),
    { runs: 0, failed: 0 },
  );
  const ran = !!totals && totals.runs > 0;
  // The headline states the finding, so the chart backs it up rather than
  // leaving the reader to work it out.
  const headline =
    daily === null
      ? 'Run history unavailable'
      : ran
        ? // Counts, not a rate: the 7-day success tile below is the rate, and
          // a second percentage over a different window would contradict it.
          `${totals.runs} runs, ${totals.failed} failed`
        : 'No runs in 14 days';

  return (
    <>
      <FullCard
        className="demo-agent-card"
        alignment="right"
        headingLevel={2}
        eyebrow={
          <Badge intent={STATUS_INTENT[agent.status]} dot>
            {STATUS_LABEL[agent.status]}
          </Badge>
        }
        headline={headline}
        description={
          daily === null
            ? 'The agent is unaffected; only its metrics are missing.'
            : ran
              ? 'Last 14 days, every run by how it ended.'
              : `${agent.name} has not run in the last 14 days.`
        }
        actions={
          canToggle && (
            <Button
              variant="secondary"
              isDisabled={busy}
              startIcon={<Icon as={paused ? Play : Pause} size="sm" />}
              onClick={onToggle}
            >
              {busy
                ? paused
                  ? 'Resuming…'
                  : 'Pausing…'
                : paused
                  ? 'Resume agent'
                  : 'Pause agent'}
            </Button>
          )
        }
        media={
          daily === null ? (
            <div className="demo-agent-card__media-note">
              <Alert intent="warning" title="Run history didn't load">
                The metrics service did not respond. The agent and its runs are
                unaffected.
              </Alert>
            </div>
          ) : ran ? (
            <div className="demo-agent-card__chart">
              <RunsByDayChart data={daily} />
            </div>
          ) : (
            <div className="demo-agent-card__media-note">
              <EmptyState
                reason="first-run"
                size="panel"
                headingLevel={3}
                title="No runs yet"
                description={
                  agent.status === 'paused'
                    ? 'This agent is paused. Resume it to start running again.'
                    : 'Its runs will show here after the first one.'
                }
              />
            </div>
          )
        }
      >
        <dl className="demo-agent-facts">
          <div>
            <dt className="ion-text-caption demo-muted">Owner</dt>
            <dd className="demo-agent-facts__owner">
              <Avatar size="mini" initials={agent.owner.initials} />
              {agent.owner.name}
            </dd>
          </div>
          <div>
            <dt className="ion-text-caption demo-muted">Team</dt>
            <dd>{teamLabel(agent.team)}</dd>
          </div>
          <div>
            <dt className="ion-text-caption demo-muted">Last run</dt>
            <dd>{agent.lastRun ? formatDay(agent.lastRun) : '—'}</dd>
          </div>
        </dl>
      </FullCard>

      <StatGroup aria-label={`${agent.name} in the last 7 days`}>
        <StatTile
          label="Runs (7 days)"
          value={agent.runs7d === null ? '—' : String(agent.runs7d)}
        />
        <StatTile
          label="Success rate"
          value={
            agent.successRate === null
              ? '—'
              : `${agent.successRate.toFixed(1)}%`
          }
        />
        <StatTile
          label="Median duration"
          value={medianDurationSec === null ? '—' : `${medianDurationSec}s`}
        />
      </StatGroup>
    </>
  );
}

function Runs({ data }: { data: Detail }) {
  const { agent, recentRuns } = data;
  if (recentRuns.length === 0) {
    return (
      <EmptyState
        reason="first-run"
        size="page"
        headingLevel={2}
        title="No runs yet"
        description={`${agent.name} hasn't run. Its runs will be listed here, newest first.`}
        action={<Link href={href('runs')}>See all runs</Link>}
      />
    );
  }
  return (
    // A plain container, not a named <section>: the Table's scroll region is
    // already a landmark named by this heading, and two landmarks with one
    // name are two doors with the same sign.
    <div className="demo-panel">
      <h2 id="runs-title" className="ion-text-h6">
        Recent runs
      </h2>
      <Table aria-labelledby="runs-title">
        <TableHead>
          <TableRow>
            <TableCell>Run</TableCell>
            <TableCell>Day</TableCell>
            <TableCell>Outcome</TableCell>
            <TableCell>Duration</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {recentRuns.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <code className="ion-text-caption">{r.id}</code>
              </TableCell>
              <TableCell>{formatDay(r.day)}</TableCell>
              <TableCell>
                <Badge size="sm" intent={OUTCOME[r.outcome].intent}>
                  {OUTCOME[r.outcome].label}
                </Badge>
              </TableCell>
              <TableCell>{r.durationSec}s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AgentLoading() {
  return (
    <div className="demo-page" aria-busy="true">
      <Skeleton width="12rem" height="1rem" />
      <h1 id="page-title" className="ion-visually-hidden">
        Loading agent
      </h1>
      <Skeleton width="18rem" height="2rem" />
      <Skeleton width="100%" height="20rem" />
      <Skeleton width="100%" height="6rem" />
    </div>
  );
}
