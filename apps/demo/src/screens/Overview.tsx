import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DateRangePicker,
  EmptyState,
  Grid,
  Icon,
  Link,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatGroup,
  StatTile,
  StatusIndicator,
  TabItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tour,
  TreeGrid,
  type DateRange,
  type TourStep,
  type TreeGridColumn,
} from 'ionbase-ui';
import { RefreshCw } from 'ionbase-icons/icons/refresh-cw';

import { getOverview } from '../data/api';
import { readTourSeen, writeTourSeen } from '../lib/tour';
import {
  defaultRange,
  type Kpi,
  type OverviewData,
  type TokenUse,
} from '../data/overview';
import { addDays, today } from '../lib/dates';
import { useDemoSettings } from '../lib/demo-settings';
import { isOffline } from '../lib/online';
import { href, navigate } from '../lib/router';
import { useResource } from '../lib/use-resource';
import { RunHeatmap } from '../local/charts/RunHeatmap';
import { SuccessRateChart } from '../local/charts/SuccessRateChart';
import { readListing, writeListing } from './agents/agent-query';
import { ago, OUTCOME } from './runs/outcome';

const PRESETS = [
  {
    label: 'Last 7 days',
    value: () => ({ start: addDays(today(), -6), end: today() }),
  },
  { label: 'Last 14 days', value: () => defaultRange(today()) },
  {
    label: 'Last 30 days',
    value: () => ({ start: addDays(today(), -29), end: today() }),
  },
];

const change = (k: Kpi) =>
  k.previous === 0 ? undefined : ((k.value - k.previous) / k.previous) * 100;

const compact = new Intl.NumberFormat('en', { notation: 'compact' });
const percent = new Intl.NumberFormat('en', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const USE_COLUMNS = (total: number): TreeGridColumn<TokenUse>[] => [
  { id: 'name', header: 'Team', cell: (r) => r.name },
  {
    id: 'runs',
    header: 'Runs',
    cell: (r) => r.runs.toLocaleString('en'),
    align: 'end',
  },
  {
    id: 'tokens',
    header: 'Tokens',
    cell: (r) => compact.format(r.tokens),
    align: 'end',
  },
  {
    id: 'share',
    header: 'Share',
    cell: (r) => percent.format(r.tokens / total),
    align: 'end',
  },
];

const findUse = (rows: TokenUse[], id: string): TokenUse | undefined => {
  for (const r of rows) {
    if (r.id === id) return r;
    const found = r.children && findUse(r.children, id);
    if (found) return found;
  }
};

/**
 * A team opens the Agents listing filtered to it; an agent, or one of its
 * models, opens that agent.
 */
function openUse(rows: TokenUse[], id: string) {
  const row = findUse(rows, id);
  if (!row) return;
  if (row.kind === 'team') {
    const query = writeListing({ ...readListing(''), teams: [row.target] });
    window.location.hash = `${href('agents')}?${query}`;
  } else navigate(`agents/${row.target}`);
}

const TOUR: TourStep[] = [
  {
    target: 'overview-range',
    title: 'Pick the period',
    body: 'Every figure on this page follows the dates chosen here, and each compares with the period before.',
  },
  {
    target: 'overview-stats',
    title: 'The period at a glance',
    body: 'Runs, how many succeeded, how many are waiting for a person, and how long they take.',
  },
  {
    target: 'overview-token-use',
    title: 'Where the tokens went',
    body: 'By team, then agent, then model. Open a team to see its agents; press a row to go to it.',
    placement: 'top',
  },
  {
    target: 'notifications-bell',
    title: 'What needs you',
    body: 'Approvals and failures arrive here, on every page.',
  },
];

export function Overview() {
  const settings = useDemoSettings();
  const [range, setRange] = useState<DateRange>(() => defaultRange(today()));
  const [touring, setTouring] = useState(false);
  const [seen, setSeen] = useState(readTourSeen);

  const overview = useResource(
    (signal) => getOverview(range, settings, signal),
    `${range.start}|${range.end}|${settings.state}|${settings.latency}`,
  );

  return (
    <div className="demo-page">
      {/* The date range narrows what the page shows, so it is the row
          beneath the header, not one of its actions. */}
      <PageHeader
        titleId="page-title"
        title="Overview"
        description="How your agents performed, and what needs a human."
        actions={
          // Offered, never started for you: every step takes focus.
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setTouring(true)}
          >
            {seen ? 'Take the tour again' : 'Take the tour'}
          </Button>
        }
      >
        <DateRangePicker
          id="overview-range"
          label="Date range"
          size="sm"
          value={range}
          onChange={(r) => r && setRange(r)}
          maxValue={today()}
          presets={PRESETS}
          isClearable={false}
        />
      </PageHeader>

      {overview.status === 'loading' && <OverviewLoading />}

      {overview.status === 'error' && (
        <EmptyState
          reason="error"
          size="page"
          headingLevel={2}
          // Not FullPageError: the header's date range still works. The
          // pattern's words, though — offline is its own kind.
          title={
            isOffline(overview.error)
              ? 'You’re offline'
              : "The overview couldn't load"
          }
          description={
            isOffline(overview.error)
              ? 'The overview needs a connection to load. It will load by itself when you’re back online.'
              : `${overview.error.message} Your agents are unaffected — only this page's metrics are missing.`
          }
          action={
            <Button
              variant="secondary"
              startIcon={<Icon as={RefreshCw} size="sm" />}
              onClick={overview.retry}
            >
              Try again
            </Button>
          }
          secondaryAction={<Link href={href('runs')}>Go to runs</Link>}
        />
      )}

      {overview.status === 'ready' && overview.data.runs.value === 0 && (
        <EmptyState
          reason="no-results"
          size="page"
          headingLevel={2}
          title="No agent runs in this date range"
          description="Nothing ran between these dates. Widen the range to see earlier activity."
          action={
            <Button
              variant="secondary"
              onClick={() =>
                setRange({ start: addDays(today(), -29), end: today() })
              }
            >
              Show last 30 days
            </Button>
          }
        />
      )}

      {overview.status === 'ready' && overview.data.runs.value > 0 && (
        <OverviewReady data={overview.data} onRetry={overview.retry} />
      )}

      {/* Steps over what is on the page when it starts: while the figures
          load, or on an empty range, the tour is the date range and the
          bell, and says "1 of 2". */}
      <Tour
        isOpen={touring}
        onOpenChange={setTouring}
        onComplete={() => {
          writeTourSeen();
          setSeen(true);
        }}
        steps={TOUR}
      />
    </div>
  );
}

function OverviewReady({
  data,
  onRetry,
}: {
  data: OverviewData;
  onRetry: () => void;
}) {
  const retry = (
    <Button variant="secondary" size="sm" onClick={onRetry}>
      Try again
    </Button>
  );

  return (
    <>
      {data.successRate === null && (
        <Alert
          intent="warning"
          title="Some of this page couldn't load"
          actions={retry}
        >
          Success rate is unavailable right now. Everything else is up to date.
        </Alert>
      )}

      {data.awaitingApproval.value > 0 && (
        <Alert
          intent="information"
          title={`${data.awaitingApproval.value} runs are waiting for your approval`}
          actions={<Link href={href('runs')}>Review runs</Link>}
        >
          Agents pause before anything irreversible. These are paused now.
        </Alert>
      )}

      <StatGroup id="overview-stats" aria-label="This period">
        <StatTile
          label="Runs"
          value={compact.format(data.runs.value)}
          change={change(data.runs)}
          goodWhen="neutral"
        />
        <StatTile
          label="Success rate"
          value={
            data.successRate ? `${data.successRate.value.toFixed(1)}%` : '—'
          }
          change={
            data.successRate
              ? data.successRate.value - data.successRate.previous
              : undefined
          }
          changeUnit="points"
        />
        <StatTile
          label="Awaiting approval"
          value={String(data.awaitingApproval.value)}
          change={change(data.awaitingApproval)}
          goodWhen="down"
        />
        <StatTile
          label="Median run time"
          value={`${data.medianDurationSec.value}s`}
          change={change(data.medianDurationSec)}
          goodWhen="down"
        />
      </StatGroup>

      <Grid columns={[2, 1]} collapse="tablet" gap={12} align="start">
        <Card title="Activity">
          <Tabs aria-label="Activity charts" type="underline" size="sm">
            <TabItem key="volume" title="Run volume">
              <div className="demo-tab-body">
                <RunHeatmap data={data.runsByWeekdayHour} />
              </div>
            </TabItem>
            <TabItem key="reliability" title="Success rate">
              <div className="demo-tab-body">
                {data.successByDay ? (
                  <SuccessRateChart data={data.successByDay} />
                ) : (
                  <EmptyState
                    reason="error"
                    size="panel"
                    headingLevel={3}
                    title="Success rate couldn't load"
                    description="The rest of the overview is current. This chart will be back on the next successful load."
                    action={retry}
                  />
                )}
              </div>
            </TabItem>
          </Tabs>
        </Card>

        <Card title="Token budget by agent">
          <ul className="demo-budgets">
            {data.budgets.map((b) => {
              const ratio = b.usedTokens / b.limitTokens;
              return (
                <li key={b.agent}>
                  <ProgressBar
                    label={b.agent}
                    value={Math.min(b.usedTokens, b.limitTokens)}
                    max={b.limitTokens}
                    intent={
                      ratio >= 1
                        ? 'error'
                        : ratio >= 0.8
                          ? 'warning'
                          : 'primary'
                    }
                    isLabelVisible
                    isValueVisible
                    valueText={`${compact.format(b.usedTokens)} of ${compact.format(b.limitTokens)} tokens`}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      </Grid>

      <Card id="overview-token-use" title="Token use by team">
        <TreeGrid
          aria-label="Token use by team"
          density="compact"
          columns={USE_COLUMNS(data.tokenUse.reduce((a, t) => a + t.tokens, 0))}
          items={data.tokenUse}
          defaultExpandedKeys={data.tokenUse.slice(0, 1).map((t) => t.id)}
          onAction={(id) => openUse(data.tokenUse, id)}
        />
      </Card>

      <Card
        title="Recent runs"
        action={
          <Link variant="standalone" href={href('runs')}>
            All runs
          </Link>
        }
      >
        <Table aria-label="Five most recent finished runs">
          <TableHead>
            <TableRow>
              <TableCell header>Run</TableCell>
              <TableCell header>Agent</TableCell>
              <TableCell header>Outcome</TableCell>
              <TableCell header align="trailing">
                Started
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.recentRuns.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={href(`runs/${r.id}`)}>{r.task}</Link>
                </TableCell>
                <TableCell>{r.agent}</TableCell>
                <TableCell>
                  <StatusIndicator intent={OUTCOME[r.outcome].intent}>
                    {OUTCOME[r.outcome].text}
                  </StatusIndicator>
                </TableCell>
                <TableCell align="trailing">
                  {ago(r.startedMinutesAgo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

const KPI_LABELS = [
  'Runs',
  'Success rate',
  'Awaiting approval',
  'Median run time',
];

function OverviewLoading() {
  return (
    <div className="demo-loading" aria-busy="true">
      <p className="ion-visually-hidden" role="status">
        Loading overview
      </p>
      <StatGroup aria-label="This period">
        {KPI_LABELS.map((label) => (
          <StatTile key={label} label={label} value={null} isLoading />
        ))}
      </StatGroup>
      <Grid columns={[2, 1]} collapse="tablet" gap={12} align="start">
        <Card>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="rect" height="var(--spacing-128)" />
        </Card>
        <Card>
          <Skeleton variant="text" lines={4} />
        </Card>
      </Grid>
    </div>
  );
}
