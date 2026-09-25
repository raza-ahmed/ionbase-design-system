import { useState } from 'react';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  DescriptionList,
  DescriptionListItem,
  EmptyState,
  Link,
  List,
  PageHeader,
  SegmentedControl,
  SegmentedControlItem,
  SidePanel,
  SidePanelLayout,
  Skeleton,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  type ListItem,
} from 'ionbase-ui';

import { listRuns, scriptFor, type RunSummary } from '../../data/runs';
import { useDemoSettings } from '../../lib/demo-settings';
import { href } from '../../lib/router';
import { useResource } from '../../lib/use-resource';
import { ago, OUTCOME } from './outcome';

const RISK_INTENT = {
  low: 'neutral',
  medium: 'warning',
  high: 'error',
} as const;

export function RunsScreen() {
  const settings = useDemoSettings();
  const runs = useResource(
    (signal) => listRuns(settings, signal),
    `${settings.state}|${settings.latency}`,
  );

  return (
    <div className="demo-page">
      <PageHeader
        titleId="page-title"
        title="Runs"
        description="What agents are doing, and what is waiting on a person."
      />

      {runs.status === 'loading' && (
        <div className="demo-loading" aria-busy="true">
          <p className="ion-visually-hidden" role="status">
            Loading runs
          </p>
          <div className="demo-queue demo-queue--loading">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="text" lines={2} />
            ))}
          </div>
          <Skeleton variant="rect" height="var(--spacing-128)" />
        </div>
      )}

      {runs.status === 'error' && (
        <Alert
          intent="error"
          title="Runs couldn't load"
          actions={
            <Button size="sm" variant="secondary" onClick={runs.retry}>
              Try again
            </Button>
          }
        >
          {runs.error.message} Agents keep running; only this list is missing.
        </Alert>
      )}

      {runs.status === 'ready' && runs.data.length === 0 && (
        <EmptyState
          reason="first-run"
          size="page"
          headingLevel={2}
          title="No runs yet"
          description="Runs appear here the first time an agent is triggered."
          action={<Link href={href('agents')}>Go to agents</Link>}
        />
      )}

      {runs.status === 'ready' && runs.data.length > 0 && (
        <>
          <WaitingQueue
            runs={runs.data.filter((r) => r.outcome === 'waiting')}
          />
          <History runs={runs.data.filter((r) => r.outcome !== 'waiting')} />
        </>
      )}
    </div>
  );
}

function WaitingQueue({ runs }: { runs: RunSummary[] }) {
  // HumanApproval's queue: one row per waiting run, named by what it asks —
  // the action and its object. The decision is made on the run, beside its
  // evidence, so a row opens it and nothing here approves anything.
  const items: ListItem[] = runs.map((r) => {
    const gate = scriptFor(r.id)?.steps.find((s) => s.kind === 'approval');
    const asks = gate?.kind === 'approval' ? gate.title() : r.task;
    return {
      id: r.id,
      label: asks,
      description: `${r.agent} · ${r.task} · started ${ago(r.startedMinutesAgo)}`,
      href: href(`runs/${r.id}`),
      meta: gate?.kind === 'approval' && (
        <Badge size="sm" intent={RISK_INTENT[gate.risk]}>
          {`${gate.risk[0].toUpperCase()}${gate.risk.slice(1)} risk`}
        </Badge>
      ),
    };
  });
  return (
    <section aria-labelledby="queue-title" className="demo-page">
      <h2 id="queue-title" className="ion-text-h6">
        Waiting for you
      </h2>
      <List
        aria-labelledby="queue-title"
        className="demo-queue"
        items={items}
        // HumanApproval's empty rule: say so in words, never an empty gate shell.
        renderEmptyState={() => 'Nothing is waiting for approval.'}
      />
    </section>
  );
}

const FILTERS = {
  all: { label: 'All', matches: () => true },
  completed: {
    label: 'Completed',
    matches: (r: RunSummary) => r.outcome === 'completed',
  },
  failed: {
    label: 'Failed',
    matches: (r: RunSummary) => r.outcome === 'failed',
  },
  unfinished: {
    label: 'Unfinished',
    matches: (r: RunSummary) =>
      r.outcome === 'stopped' || r.outcome === 'rejected',
  },
} as const;
type Filter = keyof typeof FILTERS;

/** Every run in the history fits: the longest is 301s. */
const DURATION = [0, 360] as const;
type Range = readonly [number, number];

function History({ runs: all }: { runs: RunSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  // The thumbs move on onChange; the table filters on onChangeEnd, once per
  // drag — the DataTable pattern's rule, so a drag is not dozens of refilters.
  const [duration, setDuration] = useState<Range>(DURATION);
  const [applied, setApplied] = useState<Range>(DURATION);
  // The run shown beside the table. A run filtered out of the table closes
  // the panel with it: detail of a row you can no longer see is a lie.
  const [openId, setOpenId] = useState<string | null>(null);
  const narrowed = applied[0] > DURATION[0] || applied[1] < DURATION[1];
  const runs = all
    .filter(FILTERS[filter].matches)
    .filter(
      (r) =>
        !narrowed ||
        (r.durationSec !== null &&
          r.durationSec >= applied[0] &&
          r.durationSec <= applied[1]),
    );
  const open = runs.find((r) => r.id === openId);

  return (
    <section aria-labelledby="history-title" className="demo-page">
      <div className="demo-section-head">
        <h2 id="history-title" className="ion-text-h6">
          History
        </h2>
        <div className="demo-history-filters">
          <SegmentedControl
            label="Show runs"
            size="sm"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
          >
            {Object.entries(FILTERS).map(([value, f]) => (
              <SegmentedControlItem key={value} value={value}>
                {f.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <Slider<Range>
            label="Duration"
            className="demo-history-duration"
            value={duration}
            onChange={setDuration}
            onChangeEnd={setApplied}
            minValue={DURATION[0]}
            maxValue={DURATION[1]}
            step={10}
            formatOptions={{
              style: 'unit',
              unit: 'second',
              unitDisplay: 'short',
            }}
            thumbLabels={['Shortest', 'Longest']}
          />
        </div>
      </div>
      {/* Not labelled by the heading: the section already is, and two landmarks
          with one name are indistinguishable (axe landmark-unique). */}
      {runs.length === 0 ? (
        <p className="ion-text-body demo-muted">
          No {FILTERS[filter].label.toLowerCase()} runs
          {narrowed ? ' of that duration' : ''} in the history.
        </p>
      ) : (
        <SidePanelLayout>
          <Table aria-label="Run history">
            <TableHead>
              <TableRow>
                <TableCell header>Run</TableCell>
                <TableCell header>Outcome</TableCell>
                <TableCell header>Started</TableCell>
                <TableCell header align="trailing">
                  Duration
                </TableCell>
                <TableCell header>Decided by</TableCell>
                <TableCell header>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="demo-cell-stack">
                      <Link href={href(`runs/${r.id}`)}>{r.task}</Link>
                      <span className="ion-text-caption demo-muted">
                        {r.agent}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge size="sm" dot intent={OUTCOME[r.outcome].intent}>
                      {OUTCOME[r.outcome].text}
                    </Badge>
                  </TableCell>
                  <TableCell>{ago(r.startedMinutesAgo)}</TableCell>
                  <TableCell align="trailing">
                    {r.durationSec ? `${r.durationSec}s` : '—'}
                  </TableCell>
                  <TableCell>
                    {r.reviewers.length === 0 ? (
                      <span className="demo-muted">
                        Stopped before a decision
                      </span>
                    ) : (
                      <AvatarGroup size="sm" max={3}>
                        {r.reviewers.map((p) => (
                          <Avatar
                            key={p.initials}
                            initials={p.initials}
                            alt={p.name}
                          />
                        ))}
                      </AvatarGroup>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="tertiary"
                      aria-label={`Details: ${r.task}`}
                      aria-expanded={r.id === openId}
                      onPress={() => setOpenId(r.id)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <SidePanel
            className="demo-run-panel"
            size="sm"
            headingLevel={3}
            isOpen={!!open}
            onOpenChange={(isOpen) => !isOpen && setOpenId(null)}
            title={open?.task}
            description={open && `${open.agent} · ${open.id}`}
            footer={
              open && (
                <Link variant="standalone" href={href(`runs/${open.id}`)}>
                  Open run
                </Link>
              )
            }
          >
            {open && (
              <DescriptionList layout="stacked">
                <DescriptionListItem term="Outcome">
                  <Badge size="sm" dot intent={OUTCOME[open.outcome].intent}>
                    {OUTCOME[open.outcome].text}
                  </Badge>
                </DescriptionListItem>
                <DescriptionListItem term="Started">
                  {ago(open.startedMinutesAgo)}
                </DescriptionListItem>
                <DescriptionListItem term="Duration">
                  {open.durationSec && `${open.durationSec}s`}
                </DescriptionListItem>
                <DescriptionListItem term="Decided by">
                  {open.reviewers.length
                    ? open.reviewers.map((p) => p.name).join(', ')
                    : 'Stopped before a decision'}
                </DescriptionListItem>
              </DescriptionList>
            )}
          </SidePanel>
        </SidePanelLayout>
      )}
    </section>
  );
}
