import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAgentRun,
  type AgentRunEvent,
  type AgentRunStepStatus,
} from 'ionbase-ui';

import type { RunOutcome, RunScript } from '../../data/runs';
import type { DemoSettings } from '../../lib/demo-settings';

/*
 * The pretend backend. It plays a run script on timers and reports what
 * happens as IonBase `AgentRunEvent`s; `useAgentRun` turns those into state.
 * Everything here is the demo's — scenarios, latency, copy. What a stop, a
 * failure or an unanswered approval MEANS for the step log is not decided here
 * any more; that is the library's reducer, the same one a real product uses.
 */

export type StepStatus = AgentRunStepStatus;
export type Scenario = 'approve' | 'fails' | 'submit-fails' | 'expires';
export type Phase =
  | 'starting'
  | 'running'
  | 'awaiting'
  | 'finished'
  | 'failed'
  | 'stopped'
  | 'expired';

/** Expiry window for the "expires" scenario — short, so it can be watched. */
export const EXPIRY_SECONDS = 15;

const STOPPED_UNDECIDED =
  'The run was stopped before anyone decided, so nothing was sent.';

const clock = () =>
  new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

const plan = (script: RunScript) =>
  script.steps.map((_, i) => ({ id: String(i) }));

/** A finished run from the history, as the events it would have logged. */
function recordedEvents(
  script: RunScript,
  outcome: Exclude<RunOutcome, 'waiting'>,
): AgentRunEvent[] {
  const events: AgentRunEvent[] = [
    { type: 'run-started', steps: plan(script) },
  ];
  const gateAt = script.steps.findIndex((s) => s.kind === 'approval');
  const rejected = outcome === 'rejected';

  if (outcome === 'stopped') {
    events.push(
      { type: 'step-started', id: '0' },
      { type: 'step-done', id: '0' },
      { type: 'step-started', id: '1' },
      { type: 'run-stopped' },
    );
    return events;
  }

  for (const [i, step] of script.steps.entries()) {
    const id = String(i);
    if (step.kind === 'approval') {
      events.push(
        { type: 'approval-requested', id },
        {
          type: 'approval-resolved',
          id,
          decision: rejected ? 'rejected' : 'approved',
          resolution: rejected
            ? 'Rejected. Nothing was changed.'
            : outcome === 'failed'
              ? 'Approved, then the run failed before acting.'
              : 'Approved.',
        },
      );
      continue;
    }
    events.push({ type: 'step-started', id });
    if (i === gateAt + 1 && rejected) {
      events.push({ type: 'step-skipped', id });
      continue;
    }
    if (i === gateAt + 1 && outcome === 'failed') {
      events.push({ type: 'step-failed', id }, { type: 'run-failed' });
      return events;
    }
    if (step.kind === 'output') {
      events.push(
        {
          type: 'output',
          text: rejected ? step.outputIfRejected : step.output,
        },
        { type: 'output-done' },
      );
    }
    events.push({ type: 'step-done', id });
  }
  events.push({ type: 'run-finished' });
  return events;
}

class Cancelled extends Error {}

export function useRunEngine(
  script: RunScript | undefined,
  outcome: RunOutcome | undefined,
  scenario: Scenario,
  settings: Pick<DemoSettings, 'state' | 'latency'>,
) {
  const latency = settings.latency;
  const [generation, setGeneration] = useState(0);
  const [amount, setAmount] = useState<string | undefined>();

  // The current playback. Bumping `token` cancels whatever is sleeping.
  const token = useRef(0);
  const wakers = useRef(new Set<() => void>());
  const decide = useRef<((d: 'approved' | 'rejected') => void) | null>(null);
  const submitAttempts = useRef(0);

  const cancelPlayback = () => {
    token.current += 1;
    for (const wake of wakers.current) wake();
    wakers.current.clear();
    decide.current = null;
  };

  const sleep = (ms: number, mine: number) =>
    new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(done, ms);
      const wake = () => {
        window.clearTimeout(t);
        done();
      };
      wakers.current.add(wake);
      function done() {
        wakers.current.delete(wake);
        if (token.current !== mine) reject(new Cancelled());
        else resolve();
      }
    });

  const run = useAgentRun({
    onStop: async () => {
      // Stopping takes as long as a request does; the control says so meanwhile.
      await new Promise((r) => window.setTimeout(r, Math.max(500, latency)));
      cancelPlayback();
      run.dispatch({ type: 'run-stopped', resolution: STOPPED_UNDECIDED });
    },
    onDecision: async (_id, decision) => {
      await new Promise((r) => window.setTimeout(r, Math.max(600, latency)));
      if (scenario === 'submit-fails' && submitAttempts.current++ === 0) {
        throw new Error(
          'Your decision didn’t reach the server, so nothing happened. Try again.',
        );
      }
      // Next task, not now: the hook records the decision when this returns,
      // and the script must not start the next step before it has.
      const resume = decide.current;
      window.setTimeout(() => resume?.(decision), 0);
      return `${decision === 'approved' ? 'Approved' : 'Rejected'} by Ada Reyes at ${clock()}.`;
    },
  });
  const { dispatch, reset } = run;

  useEffect(() => {
    if (!script || !outcome) return;
    cancelPlayback();
    reset();
    if (outcome !== 'waiting') {
      for (const e of recordedEvents(script, outcome)) dispatch(e);
      return;
    }
    const mine = token.current;
    submitAttempts.current = 0;
    const gate = script.steps.find((s) => s.kind === 'approval');
    setAmount(gate?.kind === 'approval' ? gate.editable?.initial : undefined);
    dispatch({ type: 'run-started', steps: plan(script) });
    // Forced "loading": the run never gets past starting — header and stop only.
    if (settings.state === 'loading') return;

    async function play() {
      if (!script) return;
      const steps = script.steps;
      let decision: 'approved' | 'rejected' | null = null;
      await sleep(Math.max(900, latency), mine);
      for (const [i, step] of steps.entries()) {
        const id = String(i);

        if (step.kind === 'approval') {
          dispatch({ type: 'approval-requested', id });
          const waiting = new Promise<'approved' | 'rejected'>((resolve) => {
            decide.current = resolve;
          });
          const expiry =
            scenario === 'expires'
              ? sleep(EXPIRY_SECONDS * 1000, mine).then(
                  () => 'expired' as const,
                )
              : new Promise<never>(() => {});
          const result = await Promise.race([waiting, expiry]);
          decide.current = null;
          if (result === 'expired') {
            dispatch({
              type: 'approval-resolved',
              id,
              decision: 'expired',
              resolution: `No one decided within ${EXPIRY_SECONDS} seconds, so nothing was sent. The run ended safely.`,
            });
            return;
          }
          decision = result;
          continue;
        }

        dispatch({ type: 'step-started', id });

        if (step.kind === 'work') {
          const isTheAction =
            decision !== null && steps[i - 1]?.kind === 'approval';
          if (isTheAction && decision === 'rejected') {
            dispatch({ type: 'step-skipped', id });
            continue;
          }
          await sleep(step.ms, mine);
          if (isTheAction && scenario === 'fails') {
            dispatch({ type: 'step-failed', id, error: step.failure });
            dispatch({ type: 'run-failed' });
            return;
          }
          dispatch({ type: 'step-done', id });
        }

        if (step.kind === 'output') {
          const full =
            decision === 'rejected' ? step.outputIfRejected : step.output;
          for (const word of full.split(/(?<= )/)) {
            await sleep(45, mine);
            dispatch({ type: 'output', text: word });
          }
          dispatch({ type: 'output-done' });
          dispatch({ type: 'step-done', id });
        }
      }
      dispatch({ type: 'run-finished' });
    }

    play().catch((e) => {
      if (!(e instanceof Cancelled)) throw e;
    });
    return cancelPlayback;
  }, [script, outcome, scenario, settings.state, latency, generation]);

  const replay = useCallback(() => setGeneration((g) => g + 1), []);

  /*
   * The shape RunDetail reads. The library's state is keyed by step id; the
   * screen indexes by position, because its copy lives on the script.
   */
  const { state: s } = run;
  const state = useMemo(() => {
    if (!script) return null;
    const byId = new Map(s.steps.map((step) => [step.id, step]));
    const statuses = script.steps.map(
      (_, i): StepStatus => byId.get(String(i))?.status ?? 'pending',
    );
    const lastStarted = script.steps.reduce(
      (last, _, i) => (byId.get(String(i))?.started ? i : last),
      -1,
    );
    const approval = s.approval;
    return {
      phase: (s.phase === 'idle' ? 'starting' : s.phase) as Phase,
      statuses,
      lastStarted,
      output: s.output,
      streaming: s.isStreaming,
      isStopping: s.isStopping,
      decision:
        approval?.status === 'approved' || approval?.status === 'rejected'
          ? approval.status
          : null,
      gate: approval && {
        status: approval.status,
        isSubmitting: approval.isSubmitting,
        error: approval.error ?? null,
        resolution: approval.resolution ?? null,
        amount,
      },
    };
  }, [script, s, amount]);

  return {
    state,
    stop: run.stop,
    approve: run.approve,
    reject: run.reject,
    setAmount,
    replay,
  };
}
