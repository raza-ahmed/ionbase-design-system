import {
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  EmptyState,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from 'ionbase-ui';

import {
  listRuns,
  scriptFor,
  type RunOutcome,
  type RunSummary,
} from '../../data/runs';
import { useDemoSettings } from '../../lib/demo-settings';
import { href } from '../../lib/router';
import { useResource } from '../../lib/use-resource';

const OUTCOME: Record<
  RunOutcome,
  { intent: 'warning' | 'success' | 'error' | 'neutral'; text: string }
> = {
  waiting: { intent: 'warning', text: 'Waiting for approval' },
  completed: { intent: 'success', text: 'Completed' },
  failed: { intent: 'error', text: 'Failed' },
  stopped: { intent: 'neutral', text: 'Stopped' },
  rejected: { intent: 'neutral', text: 'Rejected' },
};

const RISK_INTENT = {
  low: 'neutral',
  medium: 'warning',
  high: 'error',
} as const;

const ago = (minutes: number) =>
  minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;

export function RunsScreen() {
  const settings = useDemoSettings();
  const runs = useResource(
    (signal) => listRuns(settings, signal),
    `${settings.state}|${settings.latency}`,
  );

  return (
    <div className="demo-page">
      <div>
        <h1 id="page-title" className="ion-text-h3">
          Runs
        </h1>
        <p className="ion-text-body demo-muted">
          What agents are doing, and what is waiting on a person.
        </p>
      </div>

      {runs.status === 'loading' && (
        <div className="demo-loading" aria-busy="true">
          <p className="ion-visually-hidden" role="status">
            Loading runs
          </p>
          <div className="demo-queue">
            {[0, 1, 2].map((i) => (
              <div key={i} className="demo-panel">
                <Skeleton variant="text" lines={3} />
              </div>
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
  return (
    <section aria-labelledby="queue-title" className="demo-page">
      <h2 id="queue-title" className="ion-text-h5">
        Waiting for you
      </h2>
      {runs.length === 0 ? (
        // HumanApproval's empty rule: say so in words, never an empty gate shell.
        <p className="ion-text-body demo-muted">
          Nothing is waiting for approval.
        </p>
      ) : (
        <ul className="demo-queue">
          {runs.map((r) => {
            const gate = scriptFor(r.id)?.steps.find(
              (s) => s.kind === 'approval',
            );
            return (
              <li key={r.id} className="demo-panel">
                <div className="demo-queue__head">
                  <h3 className="ion-text-h6">{r.task}</h3>
                  {gate?.kind === 'approval' && (
                    <Badge size="sm" intent={RISK_INTENT[gate.risk]}>
                      {`${gate.risk[0].toUpperCase()}${gate.risk.slice(1)} risk`}
                    </Badge>
                  )}
                </div>
                <p className="ion-text-body-sm demo-muted">
                  {r.agent} · started {ago(r.startedMinutesAgo)}
                </p>
                {gate?.kind === 'approval' && (
                  <p className="ion-text-body-sm">{gate.title()}</p>
                )}
                <Link variant="standalone" href={href(`runs/${r.id}`)}>
                  {`Review: ${r.task}`}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function History({ runs }: { runs: RunSummary[] }) {
  return (
    <section aria-labelledby="history-title" className="demo-page">
      <h2 id="history-title" className="ion-text-h5">
        History
      </h2>
      <Table aria-labelledby="history-title">
        <TableHead>
          <TableRow>
            <TableCell header>Run</TableCell>
            <TableCell header>Outcome</TableCell>
            <TableCell header>Started</TableCell>
            <TableCell header align="trailing">
              Duration
            </TableCell>
            <TableCell header>Decided by</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <span className="demo-cell-stack">
                  <Link href={href(`runs/${r.id}`)}>{r.task}</Link>
                  <span className="ion-text-caption demo-muted">{r.agent}</span>
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
                  <span className="demo-muted">Stopped before a decision</span>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
