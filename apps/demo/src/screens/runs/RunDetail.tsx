import { useState } from 'react';
import {
  AgentActivity,
  AgentActivityStep,
  AgentStop,
  Alert,
  ApprovalGate,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Drawer,
  EmptyState,
  Link,
  NumberInput,
  Select,
  StreamingText,
  ToolCall,
} from 'ionbase-ui';

import {
  scriptFor,
  summaryFor,
  type ApprovalStep,
  type RunStep,
  type WorkStep,
} from '../../data/runs';
import { useDemoSettings } from '../../lib/demo-settings';
import { href } from '../../lib/router';
import {
  EXPIRY_SECONDS,
  useRunEngine,
  type Phase,
  type Scenario,
  type StepStatus,
} from './use-run-engine';

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'approve', label: 'Runs to completion' },
  { value: 'fails', label: 'Fails after approval' },
  { value: 'submit-fails', label: 'Approval fails to submit once' },
  { value: 'expires', label: `Approval expires after ${EXPIRY_SECONDS}s` },
];

const PHASE_BADGE: Record<
  Phase,
  {
    intent: 'neutral' | 'success' | 'error' | 'warning' | 'information';
    text: string;
  }
> = {
  starting: { intent: 'neutral', text: 'Starting' },
  running: { intent: 'information', text: 'Running' },
  awaiting: { intent: 'warning', text: 'Waiting for approval' },
  finished: { intent: 'success', text: 'Finished' },
  failed: { intent: 'error', text: 'Failed' },
  stopped: { intent: 'neutral', text: 'Stopped' },
  expired: { intent: 'neutral', text: 'Ended without a decision' },
};

function stepText(
  step: RunStep,
  status: StepStatus,
  decision: 'approved' | 'rejected' | null,
) {
  if (status === 'active' || status === 'failed') return step.active;
  if (status === 'skipped') {
    if (step.kind === 'approval' && decision === 'rejected')
      return step.rejected;
    return `${step.active} — not done`;
  }
  return step.done;
}

/**
 * The AgentRun and HumanApproval patterns on one page. The stop control is the
 * first thing in the header for the whole run; the approval gate appears in the
 * step log where the run reached it, never in a dialog over the evidence.
 */
export function RunDetail({ runId }: { runId: string }) {
  const settings = useDemoSettings();
  const script = scriptFor(runId);
  const summary = summaryFor(runId);
  const [scenario, setScenario] = useState<Scenario>('approve');
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const run = useRunEngine(script, summary?.outcome, scenario, settings);

  if (!script || !summary || !run.state) {
    return (
      <div className="demo-page">
        <h1 id="page-title" className="ion-text-h4">
          Run not found
        </h1>
        <EmptyState
          reason="no-results"
          size="page"
          headingLevel={2}
          title="There is no run with this ID"
          description="It may have been from a different workspace."
          action={<Link href={href('runs')}>Back to runs</Link>}
        />
      </div>
    );
  }

  const { state } = run;
  const live = summary.outcome === 'waiting';
  const ended = ['finished', 'failed', 'stopped', 'expired'].includes(
    state.phase,
  );
  const reached = script.steps
    .map((step, i) => ({ step, i, status: state.statuses[i] }))
    // Steps that began. Ones the run never reached are not the log's to list;
    // the stopped Alert names them instead.
    .filter((s) => s.i <= state.lastStarted);
  const outputIndex = script.steps.findIndex((s) => s.kind === 'output');
  const showOutput =
    state.statuses[outputIndex] !== 'pending' &&
    state.statuses[outputIndex] !== 'skipped';
  const failedAt = state.statuses.indexOf('failed');
  const doneSteps = reached
    .filter((s) => s.status === 'done')
    .map((s) => s.step.done);
  const notDone = script.steps
    .filter((_, i) => state.statuses[i] === 'skipped')
    .map((step) => step.active[0].toLowerCase() + step.active.slice(1));

  return (
    <div className="demo-page demo-page--narrow">
      <Breadcrumb>
        <BreadcrumbItem href={href('runs')}>Runs</BreadcrumbItem>
        <BreadcrumbItem isCurrent>{script.task}</BreadcrumbItem>
      </Breadcrumb>

      <div className="demo-run-header">
        <div className="demo-run-header__title">
          <h1 id="page-title" className="ion-text-h4">
            {script.task}
          </h1>
          <p className="ion-text-body-sm demo-muted">
            {script.agent} · requested by {script.requestedBy}
          </p>
        </div>
        <div className="demo-run-header__actions">
          {live && !ended && (
            <AgentStop
              size="sm"
              label="Stop run"
              stoppingLabel="Stopping…"
              isStopping={state.isStopping}
              onStop={run.stop}
            />
          )}
          {ended && (
            <Badge intent={PHASE_BADGE[state.phase].intent}>
              {PHASE_BADGE[state.phase].text}
            </Badge>
          )}
          {live && ended && (
            <Button size="sm" variant="secondary" onClick={run.replay}>
              Replay run
            </Button>
          )}
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => setDetailsOpen(true)}
          >
            Details
          </Button>
        </div>
      </div>

      {live && (
        <div className="demo-scenario">
          <Badge intent="information" size="sm" shape="rounded">
            Demo
          </Badge>
          <Select
            size="sm"
            aria-label="Scenario for this run"
            options={SCENARIOS}
            value={scenario}
            onChange={(e) => setScenario(e.target.value as Scenario)}
          />
          <span className="ion-text-caption demo-muted">
            Changing it restarts the run.
          </span>
        </div>
      )}

      {/* The empty state: before the first step exists there is no log at all. */}
      {reached.length > 0 && (
        <section className="demo-panel" aria-labelledby="log-title">
          <h2 id="log-title" className="ion-text-h6">
            What the agent did
          </h2>
          <AgentActivity>
            {reached.map(({ step, i, status }) => (
              <AgentActivityStep
                key={i}
                status={status}
                detail={
                  step.kind === 'approval' && state.gate ? (
                    <Gate
                      step={step}
                      gate={state.gate}
                      editing={editing}
                      onEditingChange={setEditing}
                      onAmount={run.setAmount}
                      onApprove={run.approve}
                      onReject={run.reject}
                    />
                  ) : step.kind === 'work' ? (
                    <WorkDetail step={step} status={status} />
                  ) : undefined
                }
              >
                {stepText(step, status, state.decision)}
              </AgentActivityStep>
            ))}
          </AgentActivity>
        </section>
      )}

      {failedAt >= 0 && (
        <Alert
          intent="error"
          title={`Failed while ${script.steps[failedAt].active.toLowerCase()}`}
          actions={
            live && (
              <Button size="sm" variant="secondary" onClick={run.replay}>
                Replay run
              </Button>
            )
          }
        >
          {(script.steps[failedAt] as { failure?: string }).failure} Every step
          before it is kept above.
        </Alert>
      )}

      {state.phase === 'stopped' && (
        <Alert intent="warning" title="Run stopped">
          {doneSteps.length
            ? `Done: ${doneSteps.join('; ')}. `
            : 'Stopped before the first step finished. '}
          {notDone.length > 0 && `Not done: ${notDone.join('; ')}.`}
        </Alert>
      )}

      {showOutput && (
        <section className="demo-panel" aria-labelledby="result-title">
          <h2 id="result-title" className="ion-text-h6">
            Result
          </h2>
          <StreamingText isStreaming={state.streaming} minLines={4}>
            {state.output}
          </StreamingText>
        </section>
      )}

      {/* StreamingText is not a live region by design; the end is announced once, here. */}
      <p className="ion-visually-hidden" role="status">
        {ended ? `Run ${PHASE_BADGE[state.phase].text.toLowerCase()}.` : ''}
      </p>

      <Drawer
        isOpen={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Run details"
        description={script.task}
        size="sm"
        footer={
          <Link variant="standalone" href={href('agents')}>
            Open agents
          </Link>
        }
      >
        <dl className="demo-review__list">
          {[
            ['Run ID', runId],
            ['Agent', script.agent],
            ['Requested by', script.requestedBy],
            ['Model', script.model],
            ['Started', `${summary.startedMinutesAgo} minutes ago`],
            [
              'Duration',
              summary.durationSec ? `${summary.durationSec}s` : 'In progress',
            ],
          ].map(([k, v]) => (
            <div key={k} className="demo-review__row">
              <dt className="ion-text-body-sm demo-muted">{k}</dt>
              <dd className="ion-text-body-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </Drawer>
    </div>
  );
}

function Gate({
  step,
  gate,
  editing,
  onEditingChange,
  onAmount,
  onApprove,
  onReject,
}: {
  step: ApprovalStep;
  gate: NonNullable<ReturnType<typeof useRunEngine>['state']>['gate'] & object;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onAmount: (amount: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [draft, setDraft] = useState<number | null>(
    gate.amount ? Number(gate.amount) : null,
  );
  const valid = draft !== null && draft > 0;

  return (
    <ApprovalGate
      title={step.title(gate.amount)}
      risk={step.risk}
      status={gate.status}
      isSubmitting={gate.isSubmitting}
      approveLabel={step.approveLabel}
      rejectLabel={step.rejectLabel}
      onApprove={onApprove}
      onReject={onReject}
      onEdit={
        step.editable && !editing ? () => onEditingChange(true) : undefined
      }
      editLabel="Change amount"
      resolution={gate.resolution}
    >
      <div className="demo-gate-body">
        {gate.error && (
          <Alert intent="error" title="Decision not recorded">
            {gate.error}
          </Alert>
        )}
        <ul className="demo-list ion-text-body-sm">
          {step.lines(gate.amount).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {editing && step.editable && gate.status === 'pending' && (
          <div className="demo-gate-edit">
            <NumberInput
              size="sm"
              label={step.editable.label}
              formatOptions={{ style: 'currency', currency: 'USD' }}
              minValue={0.01}
              step={0.01}
              showStepper={false}
              value={draft}
              onChange={setDraft}
              isInvalid={!valid}
              errorMessage={valid ? undefined : 'Enter an amount like 120.00'}
            />
            <Button
              size="sm"
              variant="secondary"
              isDisabled={!valid}
              onClick={() => {
                onAmount(draft!.toFixed(2));
                onEditingChange(false);
              }}
            >
              Use this amount
            </Button>
          </div>
        )}
      </div>
    </ApprovalGate>
  );
}

/** The plain-language result first; the tool call underneath is the evidence for it. */
function WorkDetail({ step, status }: { step: WorkStep; status: StepStatus }) {
  const text =
    status === 'failed'
      ? step.failure
      : status === 'done'
        ? step.detail
        : undefined;
  if (!step.tool || status === 'pending' || status === 'skipped') return text;
  return (
    <span className="demo-work-detail">
      {text && <span>{text}</span>}
      <ToolCall
        title={step.tool.title}
        name={step.tool.name}
        status={status}
        input={step.tool.input}
        output={status === 'done' ? step.tool.output : undefined}
        durationMs={status === 'done' ? step.ms : undefined}
      />
    </span>
  );
}
