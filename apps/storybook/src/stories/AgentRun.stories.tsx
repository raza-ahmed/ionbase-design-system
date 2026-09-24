import React, { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import {
  AgentActivity,
  AgentActivityStep,
  AgentStop,
  Alert,
  ApprovalGate,
  StreamingText,
  agentRunFrom,
  useAgentRun,
  type AgentRunEvent,
  type AgentRunRecording,
  type UseAgentRunOptions,
} from 'ionbase-ui';

const meta: Meta = {
  title: 'Patterns/Agent run',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "`useAgentRun` turns the events a run reports into the props AgentActivity, ApprovalGate, StreamingText and AgentStop take. The same events drive a live run (`dispatch`), a stored one (`replay`) and a history page (`agentRunFrom`).\n\nIt applies the AgentRun and HumanApproval patterns' rules so a product cannot get them wrong: exactly one step is active, a stop keeps what was done and skips the rest, an approval nobody answered is never a yes, and a decision the server never received stays pending.\n\nIt owns state, not words: every label and sentence below is the product's.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* ---------------------------------------------------------------- the run */

const LABELS: Record<string, { active: string; done: string }> = {
  read: { active: 'Reading the ticket', done: 'Read the ticket' },
  check: { active: 'Checking the charges', done: 'Found a duplicate charge' },
  approve: { active: 'Waiting for approval', done: 'Refund approved' },
  refund: { active: 'Refunding $42.00', done: 'Refunded $42.00' },
  reply: { active: 'Writing the reply', done: 'Wrote the reply' },
};
const PLAN = Object.keys(LABELS).map((id) => ({ id }));
const REPLY = 'Hi Maya — you were charged twice for March. ';
const REPLY_2 =
  'I have refunded the duplicate $42.00; it will arrive in 3–5 days.';

/** A stored run, as a backend would log it. */
const RECORDING: AgentRunRecording = [
  { delay: 0, event: { type: 'run-started', steps: PLAN } },
  { delay: 100, event: { type: 'step-started', id: 'read' } },
  { delay: 400, event: { type: 'step-started', id: 'check' } },
  { delay: 400, event: { type: 'approval-requested', id: 'approve' } },
  {
    delay: 600,
    event: {
      type: 'approval-resolved',
      id: 'approve',
      decision: 'approved',
      resolution: 'Approved by Ada Reyes.',
    },
  },
  { delay: 100, event: { type: 'step-started', id: 'refund' } },
  { delay: 400, event: { type: 'step-started', id: 'reply' } },
  { delay: 200, event: { type: 'output', text: REPLY } },
  { delay: 300, event: { type: 'output', text: REPLY_2 } },
  { delay: 100, event: { type: 'output-done' } },
  { delay: 0, event: { type: 'run-finished' } },
];

/** A live run: plays up to the approval, then waits for the decision. */
function useScriptedProducer(
  dispatch: (e: AgentRunEvent) => void,
  speed: number,
) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const at = (ms: number, e: AgentRunEvent) =>
    timers.current.push(setTimeout(() => dispatch(e), ms / speed));
  const cancel = () => timers.current.splice(0).forEach(clearTimeout);

  const start = () => {
    cancel();
    at(0, { type: 'run-started', steps: PLAN });
    at(100, { type: 'step-started', id: 'read' });
    at(500, { type: 'step-started', id: 'check' });
    at(900, { type: 'approval-requested', id: 'approve' });
  };
  const afterDecision = (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected') {
      at(0, { type: 'step-skipped', id: 'refund' });
      at(0, { type: 'run-finished' });
      return;
    }
    at(0, { type: 'step-started', id: 'refund' });
    at(400, { type: 'step-started', id: 'reply' });
    at(600, { type: 'output', text: REPLY });
    at(900, { type: 'output', text: REPLY_2 });
    at(1000, { type: 'run-finished' });
  };
  useEffect(() => cancel, []);
  return { start, afterDecision, cancel };
}

function RunView({ run }: { run: ReturnType<typeof useAgentRun> }) {
  const { state, log } = run;
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <strong>Refund a duplicate charge</strong>
        {run.isRunning && (
          <AgentStop size="sm" label="Stop run" {...run.stopProps} />
        )}
        {run.hasEnded && <span data-testid="phase">{state.phase}</span>}
      </div>

      {/* Nothing before the first step — an empty list says "produced nothing". */}
      {log.length > 0 && (
        <AgentActivity>
          {log.map((step) => (
            <AgentActivityStep
              key={step.id}
              status={step.status}
              data-step={step.id}
              detail={
                step.id === state.approval?.stepId && run.approvalProps ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <ApprovalGate
                      title="Refund $42.00 to Maya Chen"
                      risk="medium"
                      approveLabel="Refund"
                      rejectLabel="Don't refund"
                      {...run.approvalProps}
                    />
                    {state.approval?.error && (
                      <Alert intent="error" title="Decision not recorded">
                        {state.approval.error}
                      </Alert>
                    )}
                  </div>
                ) : undefined
              }
            >
              {step.status === 'active' || step.status === 'pending'
                ? LABELS[step.id].active
                : step.status === 'skipped'
                  ? `Did not: ${LABELS[step.id].active.toLowerCase()}`
                  : LABELS[step.id].done}
            </AgentActivityStep>
          ))}
        </AgentActivity>
      )}

      {state.phase === 'stopped' && (
        <Alert intent="warning" title="Run stopped">
          Done:{' '}
          {log
            .filter((s) => s.status === 'done')
            .map((s) => LABELS[s.id].done.toLowerCase())
            .join('; ') || 'nothing'}
          .
        </Alert>
      )}

      {state.output && (
        <StreamingText label="Reply" minLines={2} {...run.outputProps} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- stories */

function Replay({ speed = 1 }: { speed?: number }) {
  const run = useAgentRun();
  useEffect(() => run.replay(RECORDING, { speed }), []);
  return <RunView run={run} />;
}

/** A stored run, played back. With no `onDecision` the gate is a record: no buttons. */
export const ReplayARecordedRun: Story = {
  render: () => <Replay speed={4} />,
  play: async ({ canvas }) => {
    await waitFor(
      () => expect(canvas.getByTestId('phase')).toHaveTextContent('finished'),
      {
        timeout: 4000,
      },
    );
    const steps = canvas.getAllByRole('listitem');
    await expect(steps).toHaveLength(5);
    await expect(canvas.getByText('Refunded $42.00')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Refund' })).toBeNull();
    await expect(
      canvas.getByText(/refunded the duplicate/),
    ).toBeInTheDocument();
  },
};

function Live({
  speed = 1,
  onDecision,
}: {
  speed?: number;
  onDecision?: UseAgentRunOptions['onDecision'];
}) {
  const producer = useRef<ReturnType<typeof useScriptedProducer>>(null!);
  const run = useAgentRun({
    onStop: async () => producer.current.cancel(),
    onDecision: async (id, decision) => {
      const resolution = await onDecision?.(id, decision);
      producer.current.afterDecision(decision);
      return (
        resolution ??
        `${decision === 'approved' ? 'Approved' : 'Rejected'} by you.`
      );
    },
  });
  producer.current = useScriptedProducer(run.dispatch, speed);
  useEffect(() => producer.current.start(), []);
  return <RunView run={run} />;
}

/** A live run waits at the gate; approving carries it through to the end. */
export const ApproveAndFinish: Story = {
  render: () => <Live speed={4} />,
  play: async ({ canvas }) => {
    const approve = await canvas.findByRole(
      'button',
      { name: 'Refund' },
      { timeout: 3000 },
    );
    // One active step at a time: the gate's step, and nothing else.
    await expect(
      canvas
        .getAllByRole('listitem')
        .filter((li) => li.textContent?.includes('Waiting')),
    ).toHaveLength(1);
    await userEvent.click(approve);
    await waitFor(
      () => expect(canvas.getByTestId('phase')).toHaveTextContent('finished'),
      {
        timeout: 4000,
      },
    );
    await expect(canvas.getByText('Approved by you.')).toBeInTheDocument();
    await expect(canvas.getByText('Wrote the reply')).toBeInTheDocument();
  },
};

/**
 * The decision did not reach the server. It must not look made: the gate
 * stays pending, the buttons come back, and the error says what happened.
 */
export const DecisionThatFailsStaysPending: Story = {
  render: () => {
    let attempts = 0;
    return (
      <Live
        speed={4}
        onDecision={async () => {
          if (attempts++ === 0)
            throw new Error(
              'Your decision didn’t reach the server. Try again.',
            );
        }}
      />
    );
  },
  play: async ({ canvas }) => {
    const approve = await canvas.findByRole(
      'button',
      { name: 'Refund' },
      { timeout: 3000 },
    );
    await userEvent.click(approve);
    await expect(
      await canvas.findByText('Decision not recorded'),
    ).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Refund' })).toBeEnabled();
    await expect(canvas.queryByTestId('phase')).toBeNull();
    // Second try goes through.
    await userEvent.click(canvas.getByRole('button', { name: 'Refund' }));
    await waitFor(
      () => expect(canvas.getByTestId('phase')).toHaveTextContent('finished'),
      {
        timeout: 4000,
      },
    );
  },
};

/**
 * Stopping at the gate: what was done stays done, the approval nobody gave is
 * expired — never approved — and the steps after it are skipped.
 */
export const StopKeepsWhatWasDone: Story = {
  render: () => <Live speed={4} />,
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', { name: 'Refund' }, { timeout: 3000 });
    await userEvent.click(canvas.getByRole('button', { name: 'Stop run' }));
    await waitFor(() =>
      expect(canvas.getByTestId('phase')).toHaveTextContent('stopped'),
    );
    await expect(canvas.getByText('Read the ticket')).toBeInTheDocument();
    await expect(
      canvas.getByText('Found a duplicate charge'),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Refund' })).toBeNull();
    await expect(canvasElement).toHaveTextContent(/Expired without a decision/);
    // Refund and reply never started, so they are not in the log at all.
    await expect(
      canvasElement.querySelector('[data-step="refund"]'),
    ).toBeNull();
  },
};

/** The reducer, directly: the rules hold without React. */
export const RulesHoldWithoutReact: Story = {
  render: () => <p>The reducer is pure; this story only runs its checks.</p>,
  play: async () => {
    // Starting a step closes the last one.
    const two = agentRunFrom([
      { type: 'run-started' },
      { type: 'step-started', id: 'a' },
      { type: 'step-started', id: 'b' },
    ]);
    await expect(two.steps.map((s) => s.status)).toEqual(['done', 'active']);

    // A failure marks the running step and skips what was planned after it.
    const failed = agentRunFrom([
      { type: 'run-started', steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
      { type: 'step-started', id: 'a' },
      { type: 'step-started', id: 'b' },
      { type: 'run-failed', error: 'Timed out' },
    ]);
    await expect(failed.steps.map((s) => s.status)).toEqual([
      'done',
      'failed',
      'skipped',
    ]);
    await expect(failed.steps.map((s) => s.started)).toEqual([
      true,
      true,
      false,
    ]);

    // An ended run is a record: a late event from a slow stream is ignored.
    const late = agentRunFrom([
      { type: 'run-started' },
      { type: 'step-started', id: 'a' },
      { type: 'run-finished' },
      { type: 'step-started', id: 'b' },
      { type: 'output', text: 'late' },
    ]);
    await expect(late.phase).toBe('finished');
    await expect(late.steps).toHaveLength(1);
    await expect(late.output).toBe('');

    // An approval nobody answered ends the run without acting.
    const expired = agentRunFrom([
      { type: 'run-started', steps: [{ id: 'gate' }, { id: 'act' }] },
      { type: 'approval-requested', id: 'gate' },
      { type: 'approval-resolved', id: 'gate', decision: 'expired' },
    ]);
    await expect(expired.phase).toBe('expired');
    await expect(expired.steps.map((s) => s.status)).toEqual([
      'skipped',
      'skipped',
    ]);
  },
};
