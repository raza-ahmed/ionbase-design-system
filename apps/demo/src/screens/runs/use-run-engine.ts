import { useCallback, useEffect, useRef, useState } from 'react';

import type { RunOutcome, RunScript } from '../../data/runs';
import type { DemoSettings } from '../../lib/demo-settings';

export type StepStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped';
export type Scenario = 'approve' | 'fails' | 'submit-fails' | 'expires';
export type Phase =
  | 'starting'
  | 'running'
  | 'awaiting'
  | 'finished'
  | 'failed'
  | 'stopped'
  | 'expired';

export interface GateState {
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  isSubmitting: boolean;
  error: string | null;
  resolution: string | null;
  amount: string | undefined;
}

export interface RunState {
  phase: Phase;
  statuses: StepStatus[];
  gate: GateState | null;
  decision: 'approved' | 'rejected' | null;
  output: string;
  streaming: boolean;
  isStopping: boolean;
  /** Last step that began, or -1. The log shows steps up to here and no further. */
  lastStarted: number;
}

/** Expiry window for the "expires" scenario — short, so it can be watched. */
export const EXPIRY_SECONDS = 15;

const initial = (script: RunScript): RunState => ({
  phase: 'starting',
  statuses: script.steps.map(() => 'pending'),
  gate: null,
  decision: null,
  output: '',
  streaming: false,
  isStopping: false,
  lastStarted: -1,
});

const clock = () =>
  new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

const setAt = <T>(list: T[], i: number, value: T) =>
  list.map((v, j) => (j === i ? value : v));

/** Everything after `from` that never ran is marked skipped, so no step still looks queued. */
const skipRest = (statuses: StepStatus[], from: number): StepStatus[] =>
  statuses.map((s, j) =>
    j >= from && (s === 'pending' || s === 'active') ? 'skipped' : s,
  );

/** A finished run from the history, rebuilt without playing it. */
function recorded(
  script: RunScript,
  outcome: Exclude<RunOutcome, 'waiting'>,
): RunState {
  const gateAt = script.steps.findIndex((s) => s.kind === 'approval');
  const sendAt = gateAt + 1;
  const last = script.steps.length - 1;
  const outputStep = script.steps[last];
  const done = script.steps.map((): StepStatus => 'done');
  const gate = (
    status: GateState['status'],
    resolution: string,
  ): GateState => ({
    status,
    isSubmitting: false,
    error: null,
    resolution,
    amount: undefined,
  });
  const text = (rejected: boolean) =>
    outputStep.kind === 'output'
      ? rejected
        ? outputStep.outputIfRejected
        : outputStep.output
      : '';
  const base = { ...initial(script), streaming: false, lastStarted: last };

  switch (outcome) {
    case 'completed':
      return {
        ...base,
        phase: 'finished',
        statuses: done,
        decision: 'approved',
        gate: gate('approved', 'Approved.'),
        output: text(false),
      };
    case 'rejected':
      return {
        ...base,
        phase: 'finished',
        statuses: setAt(setAt(done, gateAt, 'skipped'), sendAt, 'skipped'),
        decision: 'rejected',
        gate: gate('rejected', 'Rejected. Nothing was changed.'),
        output: text(true),
      };
    case 'failed':
      return {
        ...base,
        lastStarted: sendAt,
        phase: 'failed',
        statuses: skipRest(
          setAt(done, sendAt, 'failed').map((s, j) =>
            j > sendAt ? 'pending' : s,
          ),
          sendAt + 1,
        ),
        decision: 'approved',
        gate: gate('approved', 'Approved, then the run failed before acting.'),
      };
    case 'stopped':
      return {
        ...base,
        lastStarted: 1,
        phase: 'stopped',
        statuses: skipRest(
          done.map((s, j) => (j >= 1 ? 'pending' : s)),
          1,
        ),
      };
  }
}

class Stopped extends Error {}

/**
 * Plays a run script on timers. The effect's controller ends a playback when
 * the page changes; `stop()` ends it the way a user would, which is a
 * different outcome and is recorded as one.
 */
export function useRunEngine(
  script: RunScript | undefined,
  outcome: RunOutcome | undefined,
  scenario: Scenario,
  settings: Pick<DemoSettings, 'state' | 'latency'>,
) {
  const [state, setState] = useState<RunState | null>(() =>
    script ? initial(script) : null,
  );
  const [generation, setGeneration] = useState(0);

  const stopRequested = useRef(false);
  const wake = useRef<(() => void) | null>(null);
  const decide = useRef<((d: 'approved' | 'rejected') => void) | null>(null);
  const submitAttempts = useRef(0);
  const latency = settings.latency;

  useEffect(() => {
    if (!script || !outcome) return;
    if (outcome !== 'waiting') {
      setState(recorded(script, outcome));
      return;
    }
    setState(initial(script));
    // Forced "loading": the run never gets past starting — header and stop only.
    if (settings.state === 'loading') return;

    let alive = true;
    stopRequested.current = false;
    submitAttempts.current = 0;
    const patch = (fn: (s: RunState) => RunState) => {
      if (alive) setState((s) => (s ? fn(s) : s));
    };

    const sleep = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(done, ms);
        function done() {
          wake.current = null;
          if (!alive) reject(new Error('reset'));
          else if (stopRequested.current) reject(new Stopped());
          else resolve();
        }
        wake.current = () => {
          window.clearTimeout(t);
          done();
        };
      });

    async function play() {
      if (!script) return;
      const steps = script.steps;
      let current = 0;
      let decision: 'approved' | 'rejected' | null = null;
      try {
        await sleep(Math.max(900, latency));
        for (current = 0; current < steps.length; current++) {
          const step = steps[current];
          const i = current;
          patch((s) => ({
            ...s,
            phase: 'running',
            lastStarted: i,
            statuses: setAt(s.statuses, i, 'active'),
          }));

          if (step.kind === 'work') {
            const isTheAction =
              decision !== null && steps[i - 1]?.kind === 'approval';
            if (isTheAction && decision === 'rejected') {
              patch((s) => ({
                ...s,
                statuses: setAt(s.statuses, i, 'skipped'),
              }));
              continue;
            }
            await sleep(step.ms);
            if (isTheAction && scenario === 'fails') {
              patch((s) => ({
                ...s,
                phase: 'failed',
                statuses: skipRest(setAt(s.statuses, i, 'failed'), i + 1),
              }));
              return;
            }
            patch((s) => ({ ...s, statuses: setAt(s.statuses, i, 'done') }));
          }

          if (step.kind === 'approval') {
            patch((s) => ({
              ...s,
              phase: 'awaiting',
              gate: {
                status: 'pending',
                isSubmitting: false,
                error: null,
                resolution: null,
                amount: step.editable?.initial,
              },
            }));
            const waiting = new Promise<'approved' | 'rejected'>((resolve) => {
              decide.current = resolve;
            });
            const expiry =
              scenario === 'expires'
                ? sleep(EXPIRY_SECONDS * 1000).then(() => 'expired' as const)
                : new Promise<never>(() => {});
            const result = await Promise.race([waiting, expiry]);
            decide.current = null;
            if (result === 'expired') {
              // Silence is not consent: the safe default is not doing the thing.
              patch((s) => ({
                ...s,
                phase: 'expired',
                statuses: skipRest(s.statuses, i),
                gate: s.gate && {
                  ...s.gate,
                  status: 'expired',
                  resolution: `No one decided within ${EXPIRY_SECONDS} seconds, so nothing was sent. The run ended safely.`,
                },
              }));
              return;
            }
            decision = result;
            patch((s) => ({
              ...s,
              phase: 'running',
              decision: result,
              statuses: setAt(
                s.statuses,
                i,
                result === 'approved' ? 'done' : 'skipped',
              ),
            }));
          }

          if (step.kind === 'output') {
            const full =
              decision === 'rejected' ? step.outputIfRejected : step.output;
            patch((s) => ({ ...s, streaming: true, output: '' }));
            const words = full.split(/(?<= )/);
            for (const word of words) {
              await sleep(45);
              patch((s) => ({ ...s, output: s.output + word }));
            }
            patch((s) => ({
              ...s,
              streaming: false,
              statuses: setAt(s.statuses, i, 'done'),
            }));
          }
        }
        patch((s) => ({ ...s, phase: 'finished' }));
      } catch (e) {
        if (!(e instanceof Stopped)) return;
        const at = current;
        patch((s) => ({
          ...s,
          phase: 'stopped',
          isStopping: false,
          streaming: false,
          statuses: skipRest(s.statuses, at),
          gate:
            s.gate && s.gate.status === 'pending'
              ? {
                  ...s.gate,
                  isSubmitting: false,
                  status: 'expired',
                  resolution:
                    'The run was stopped before anyone decided, so nothing was sent.',
                }
              : s.gate,
        }));
      }
    }

    void play();
    return () => {
      alive = false;
      wake.current?.();
    };
  }, [script, outcome, scenario, settings.state, latency, generation]);

  const stop = useCallback(() => {
    setState((s) => (s ? { ...s, isStopping: true } : s));
    // Stopping takes as long as a request does; the control stays put meanwhile.
    window.setTimeout(
      () => {
        stopRequested.current = true;
        wake.current?.();
        // A run parked on an approval is waiting on a promise, not a timer.
        if (decide.current) {
          setState(
            (s) =>
              s && {
                ...s,
                phase: 'stopped',
                isStopping: false,
                statuses: skipRest(s.statuses, s.statuses.indexOf('active')),
                gate: s.gate && {
                  ...s.gate,
                  status: 'expired',
                  resolution:
                    'The run was stopped before anyone decided, so nothing was sent.',
                },
              },
          );
        }
      },
      Math.max(500, latency),
    );
  }, [latency]);

  const submit = useCallback(
    (d: 'approved' | 'rejected') => {
      setState(
        (s) =>
          s &&
          s.gate && {
            ...s,
            gate: { ...s.gate, isSubmitting: true, error: null },
          },
      );
      window.setTimeout(
        () => {
          if (scenario === 'submit-fails' && submitAttempts.current === 0) {
            submitAttempts.current += 1;
            // The action must not proceed: status stays pending, buttons come back.
            setState(
              (s) =>
                s &&
                s.gate && {
                  ...s,
                  gate: {
                    ...s.gate,
                    isSubmitting: false,
                    error:
                      'Your decision didn’t reach the server, so nothing happened. Try again.',
                  },
                },
            );
            return;
          }
          setState(
            (s) =>
              s &&
              s.gate && {
                ...s,
                gate: {
                  ...s.gate,
                  isSubmitting: false,
                  status: d,
                  resolution: `${d === 'approved' ? 'Approved' : 'Rejected'} by Ada Reyes at ${clock()}.`,
                },
              },
          );
          decide.current?.(d);
        },
        Math.max(600, latency),
      );
    },
    [scenario, latency],
  );

  const setAmount = useCallback((amount: string) => {
    setState((s) => s && s.gate && { ...s, gate: { ...s.gate, amount } });
  }, []);

  const replay = useCallback(() => setGeneration((g) => g + 1), []);

  return {
    state,
    stop,
    approve: () => submit('approved'),
    reject: () => submit('rejected'),
    setAmount,
    replay,
  };
}
