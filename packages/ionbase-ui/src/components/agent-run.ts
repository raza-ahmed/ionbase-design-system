/**
 * Agent run state, as a reducer over events.
 *
 * AgentActivity, ApprovalGate, StreamingText and AgentStop each render one
 * state well, and none of them knows about the others. What turns "the agent
 * started step 3" into the right props on all four — one step active at a
 * time, a stopped run keeping what it did, an unanswered approval never
 * counting as a yes — was left to every product, and every product got a
 * different edge wrong. This file is that logic, once.
 *
 * It is plain data in, plain data out: no React, no timers. The same events
 * drive a live run (from a stream, a socket, a poll) and a recorded one
 * (`replayAgentRun`), and `agentRunFrom` rebuilds a finished run for a history
 * page without playing it. `useAgentRun` wraps it for components.
 *
 * Events are JSON-serialisable on purpose, so a recording can be stored as a
 * run log and a backend can emit them as-is.
 */

/** Where a run is. The last four are ends; nothing changes a run after one. */
export type AgentRunPhase =
  | 'idle'
  | 'running'
  | 'awaiting'
  | 'finished'
  | 'failed'
  | 'stopped'
  | 'expired';

/** The same five statuses AgentActivityStep and ToolCall take. */
export type AgentRunStepStatus =
  'pending' | 'active' | 'done' | 'failed' | 'skipped';

export interface AgentRunStep {
  id: string;
  status: AgentRunStepStatus;
  label?: string;
  /** Why it failed, from `step-failed`. */
  error?: string;
  /** Whether it ever began. A planned step the run never reached is not in `log`. */
  started: boolean;
}

export interface AgentRunApproval {
  /** The step the approval belongs to. */
  stepId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  /** What happened, in words — ApprovalGate's `resolution`. */
  resolution?: string;
  /** A decision is on its way to the server. */
  isSubmitting: boolean;
  /** The decision did not arrive. The approval is still pending. */
  error?: string;
}

export interface AgentRunState {
  phase: AgentRunPhase;
  /** Every step known so far, in the order it was planned or started. */
  steps: AgentRunStep[];
  /** The latest approval, or null if the run has not asked for one. */
  approval: AgentRunApproval | null;
  output: string;
  isStreaming: boolean;
  /** Stop was requested and the run has not confirmed it yet. */
  isStopping: boolean;
  /** From `run-failed`, when the failure is the run's and not one step's. */
  error?: string;
}

/**
 * What a run reports. A producer — a backend stream, a script, a recording —
 * emits these; it never computes a status itself.
 */
export type AgentRunEvent =
  /** Optionally with the plan, so later steps can be listed as not done. */
  | { type: 'run-started'; steps?: { id: string; label?: string }[] }
  | { type: 'step-started'; id: string; label?: string }
  | { type: 'step-done'; id: string }
  | { type: 'step-failed'; id: string; error?: string }
  | { type: 'step-skipped'; id: string }
  | { type: 'approval-requested'; id: string }
  | {
      type: 'approval-resolved';
      id: string;
      decision: 'approved' | 'rejected' | 'expired';
      resolution?: string;
    }
  /** A chunk of output, appended. */
  | { type: 'output'; text: string }
  | { type: 'output-done' }
  | { type: 'run-finished' }
  | { type: 'run-failed'; error?: string }
  /** `resolution` explains an approval the stop left undecided. */
  | { type: 'run-stopped'; resolution?: string }
  /* Dispatched by useAgentRun's controls, not by a producer. */
  | { type: 'stop-requested' }
  | { type: 'stop-failed' }
  | { type: 'reset' }
  | { type: 'decision-submitted'; id: string }
  | { type: 'decision-failed'; id: string; error: string };

export const initialAgentRunState: AgentRunState = {
  phase: 'idle',
  steps: [],
  approval: null,
  output: '',
  isStreaming: false,
  isStopping: false,
};

const ENDED: AgentRunPhase[] = ['finished', 'failed', 'stopped', 'expired'];

/** Whether the run has reached an end — finished, failed, stopped or expired. */
export const agentRunHasEnded = (state: AgentRunState) =>
  ENDED.includes(state.phase);

const upsert = (
  steps: AgentRunStep[],
  id: string,
  patch: Partial<AgentRunStep>,
): AgentRunStep[] =>
  steps.some((s) => s.id === id)
    ? steps.map((s) => (s.id === id ? { ...s, ...patch } : s))
    : [...steps, { id, status: 'pending', started: false, ...patch }];

/** Exactly one step is active: starting `id` finishes whichever else was. */
const closeActive = (steps: AgentRunStep[], id: string) =>
  steps.map((s) =>
    s.status === 'active' && s.id !== id
      ? { ...s, status: 'done' as const }
      : s,
  );

/** Anything still pending or active becomes skipped — nothing looks queued after an end. */
const skipUnfinished = (steps: AgentRunStep[]) =>
  steps.map((s) =>
    s.status === 'pending' || s.status === 'active'
      ? { ...s, status: 'skipped' as const }
      : s,
  );

/**
 * The whole policy. Every rule here is one the AgentRun or HumanApproval
 * pattern states; the comment says which.
 */
export function agentRunReducer(
  state: AgentRunState,
  event: AgentRunEvent,
): AgentRunState {
  if (event.type === 'reset') return initialAgentRunState;
  // An ended run is a record. A late event from a slow stream must not
  // reopen it — a "finished" run whose step flips back to active is a lie.
  if (agentRunHasEnded(state)) return state;

  switch (event.type) {
    case 'run-started':
      return {
        ...initialAgentRunState,
        phase: 'running',
        steps: (event.steps ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          status: 'pending',
          started: false,
        })),
      };

    case 'step-started': {
      // Exactly one step is active at a time (AgentRun). A producer that
      // starts the next step without closing the last has finished it.
      return {
        ...state,
        phase: state.phase === 'idle' ? 'running' : state.phase,
        steps: upsert(closeActive(state.steps, event.id), event.id, {
          status: 'active',
          started: true,
          ...(event.label !== undefined ? { label: event.label } : {}),
        }),
      };
    }

    case 'step-done':
      return {
        ...state,
        steps: upsert(state.steps, event.id, { status: 'done' }),
      };

    case 'step-skipped':
      return {
        ...state,
        steps: upsert(state.steps, event.id, { status: 'skipped' }),
      };

    case 'step-failed':
      return {
        ...state,
        steps: upsert(state.steps, event.id, {
          status: 'failed',
          started: true,
          error: event.error,
        }),
      };

    case 'approval-requested':
      return {
        ...state,
        phase: 'awaiting',
        steps: upsert(closeActive(state.steps, event.id), event.id, {
          status: 'active',
          started: true,
        }),
        approval: { stepId: event.id, status: 'pending', isSubmitting: false },
      };

    case 'decision-submitted':
      return state.approval?.stepId === event.id
        ? {
            ...state,
            approval: {
              ...state.approval,
              isSubmitting: true,
              error: undefined,
            },
          }
        : state;

    case 'decision-failed':
      // The decision did not arrive, so nothing happened: the approval stays
      // pending and the buttons come back (HumanApproval, error).
      return state.approval?.stepId === event.id
        ? {
            ...state,
            approval: {
              ...state.approval,
              isSubmitting: false,
              error: event.error,
            },
          }
        : state;

    case 'approval-resolved': {
      const approval: AgentRunApproval = {
        stepId: event.id,
        status: event.decision,
        resolution: event.resolution,
        isSubmitting: false,
      };
      if (event.decision === 'expired') {
        // Silence is not consent: an approval nobody answered ends the run
        // without doing the thing (HumanApproval).
        return {
          ...state,
          phase: 'expired',
          approval,
          isStreaming: false,
          isStopping: false,
          steps: skipUnfinished(state.steps),
        };
      }
      return {
        ...state,
        phase: 'running',
        approval,
        steps: upsert(state.steps, event.id, {
          status: event.decision === 'approved' ? 'done' : 'skipped',
        }),
      };
    }

    case 'output':
      return {
        ...state,
        output: state.output + event.text,
        isStreaming: true,
      };

    case 'output-done':
      return { ...state, isStreaming: false };

    case 'run-finished':
      return {
        ...state,
        phase: 'finished',
        isStreaming: false,
        isStopping: false,
        steps: state.steps.map((s) =>
          s.status === 'active'
            ? { ...s, status: 'done' as const }
            : s.status === 'pending'
              ? { ...s, status: 'skipped' as const }
              : s,
        ),
      };

    case 'run-failed': {
      // Mark the step that was running as the one that failed, keep every
      // earlier step, and skip the rest (AgentRun, error).
      const hasFailed = state.steps.some((s) => s.status === 'failed');
      const steps = hasFailed
        ? state.steps
        : state.steps.map((s) =>
            s.status === 'active' ? { ...s, status: 'failed' as const } : s,
          );
      return {
        ...state,
        phase: 'failed',
        error: event.error,
        isStreaming: false,
        isStopping: false,
        steps: skipUnfinished(steps),
      };
    }

    case 'stop-requested':
      return { ...state, isStopping: true };

    case 'stop-failed':
      // The run is still going, so the stop control must work again.
      return { ...state, isStopping: false };

    case 'run-stopped':
      // Keep what was done, mark the interrupted step skipped (AgentRun,
      // partial). An approval nobody answered did not happen.
      return {
        ...state,
        phase: 'stopped',
        isStreaming: false,
        isStopping: false,
        steps: skipUnfinished(state.steps),
        approval:
          state.approval?.status === 'pending'
            ? {
                ...state.approval,
                status: 'expired',
                isSubmitting: false,
                resolution: event.resolution ?? state.approval.resolution,
              }
            : state.approval,
      };
  }
}

/** A finished run rebuilt from its events, without playing it — for a history page. */
export const agentRunFrom = (events: AgentRunEvent[]) =>
  events.reduce(agentRunReducer, initialAgentRunState);

/** Steps that began, in order — what AgentActivity lists. Never planned-but-unreached ones. */
export const agentRunLog = (state: AgentRunState) =>
  state.steps.filter((s) => s.started);

/** A recording: each event with the milliseconds to wait before it. */
export type AgentRunRecording = { delay: number; event: AgentRunEvent }[];

export interface ReplayAgentRunOptions {
  /** 2 plays twice as fast. Default 1. */
  speed?: number;
}

/**
 * Plays a recording into `dispatch` on timers. Returns a function that cancels
 * the rest — call it on unmount, or on stop before dispatching `run-stopped`.
 */
export function replayAgentRun(
  recording: AgentRunRecording,
  dispatch: (event: AgentRunEvent) => void,
  { speed = 1 }: ReplayAgentRunOptions = {},
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let i = 0;
  const next = () => {
    if (cancelled || i >= recording.length) return;
    const { delay, event } = recording[i];
    timer = setTimeout(
      () => {
        if (cancelled) return;
        i++;
        dispatch(event);
        next();
      },
      Math.max(0, delay / speed),
    );
  };
  next();
  return () => {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
