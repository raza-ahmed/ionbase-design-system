'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import {
  agentRunHasEnded,
  agentRunLog,
  agentRunReducer,
  initialAgentRunState,
  replayAgentRun,
  type AgentRunEvent,
  type AgentRunRecording,
  type AgentRunState,
  type ReplayAgentRunOptions,
} from './agent-run.js';

export interface UseAgentRunOptions {
  /**
   * Stop the real run. Resolve once it has stopped; the hook then records the
   * run as stopped (unless your producer already sent `run-stopped`). Throw if
   * it could not be stopped, and the stop control comes back.
   *
   * Not needed for a replay — stopping a replay cancels it.
   */
  onStop?: () => void | Promise<void>;
  /**
   * Send an approval decision. Resolve — optionally with the resolution text,
   * e.g. "Approved by Ada at 14:02" — once it is recorded. Throw if it did not
   * arrive: the approval stays pending and says so, because a decision the
   * server never received must not look made.
   *
   * Without it the approval renders without buttons, as a record.
   */
  onDecision?: (
    stepId: string,
    decision: 'approved' | 'rejected',
  ) => void | string | Promise<void | string>;
}

/**
 * useAgentRun — run state for AgentActivity, ApprovalGate, StreamingText and
 * AgentStop, from events.
 *
 * Feed it events with `dispatch` from however the run reports progress, or
 * play a recording with `replay`. It hands back the state and props ready to
 * spread, and applies the AgentRun and HumanApproval patterns' rules on the
 * way: one active step, a stopped run keeps what it did, an unanswered
 * approval is not a yes, a failed decision is not a decision.
 */
export function useAgentRun(options: UseAgentRunOptions = {}) {
  const [state, dispatch] = useReducer(agentRunReducer, initialAgentRunState);

  // Async handlers read the latest state and options, not the render's.
  const stateRef = useRef(state);
  stateRef.current = state;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const cancelReplay = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelReplay.current?.(), []);

  const reset = useCallback(() => {
    cancelReplay.current?.();
    cancelReplay.current = null;
    dispatch({ type: 'reset' });
  }, []);

  const replay = useCallback(
    (recording: AgentRunRecording, replayOptions?: ReplayAgentRunOptions) => {
      reset();
      const cancel = replayAgentRun(recording, dispatch, replayOptions);
      cancelReplay.current = () => {
        cancel();
        cancelReplay.current = null;
      };
    },
    [reset],
  );

  const stop = useCallback(async () => {
    const s = stateRef.current;
    if (agentRunHasEnded(s) || s.isStopping || s.phase === 'idle') return;
    dispatch({ type: 'stop-requested' });
    if (cancelReplay.current) {
      cancelReplay.current();
      dispatch({ type: 'run-stopped' });
      return;
    }
    try {
      await optionsRef.current.onStop?.();
    } catch {
      dispatch({ type: 'stop-failed' });
      return;
    }
    dispatch({ type: 'run-stopped' });
  }, []);

  const decide = useCallback(async (decision: 'approved' | 'rejected') => {
    const approval = stateRef.current.approval;
    const send = optionsRef.current.onDecision;
    if (!send || !approval || approval.status !== 'pending') return;
    if (approval.isSubmitting) return;
    const id = approval.stepId;
    dispatch({ type: 'decision-submitted', id });
    try {
      const resolution = await send(id, decision);
      dispatch({
        type: 'approval-resolved',
        id,
        decision,
        resolution: typeof resolution === 'string' ? resolution : undefined,
      });
    } catch (e) {
      dispatch({
        type: 'decision-failed',
        id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  const approve = useCallback(() => void decide('approved'), [decide]);
  const reject = useCallback(() => void decide('rejected'), [decide]);
  const onStop = useCallback(() => void stop(), [stop]);

  const hasEnded = agentRunHasEnded(state);
  const interactive = options.onDecision !== undefined;

  return useMemo(
    () => ({
      state,
      dispatch: dispatch as (event: AgentRunEvent) => void,
      reset,
      replay,
      /** Steps that began — what AgentActivity lists. */
      log: agentRunLog(state),
      hasEnded,
      /** Show AgentStop while this is true. */
      isRunning: state.phase === 'running' || state.phase === 'awaiting',
      stop,
      approve,
      reject,
      /** Spread onto AgentStop. */
      stopProps: { onStop, isStopping: state.isStopping },
      /** Spread onto StreamingText. */
      outputProps: {
        isStreaming: state.isStreaming,
        children: state.output,
      },
      /** Spread onto the ApprovalGate for `state.approval.stepId`, with your title. */
      approvalProps: state.approval && {
        status: state.approval.status,
        isSubmitting: state.approval.isSubmitting,
        resolution: state.approval.resolution,
        ...(interactive && state.approval.status === 'pending'
          ? { onApprove: approve, onReject: reject }
          : {}),
      },
    }),
    [
      state,
      reset,
      replay,
      hasEnded,
      stop,
      approve,
      reject,
      onStop,
      interactive,
    ],
  );
}

export type UseAgentRunResult = ReturnType<typeof useAgentRun>;
export type { AgentRunState };
