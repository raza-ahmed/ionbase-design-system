import type { RunOutcome } from '../../data/runs';

/** How a run's outcome reads everywhere it is listed: Runs, and Overview. */
export const OUTCOME: Record<
  RunOutcome,
  { intent: 'warning' | 'success' | 'error' | 'neutral'; text: string }
> = {
  waiting: { intent: 'warning', text: 'Waiting for approval' },
  completed: { intent: 'success', text: 'Completed' },
  failed: { intent: 'error', text: 'Failed' },
  stopped: { intent: 'neutral', text: 'Stopped' },
  rejected: { intent: 'neutral', text: 'Rejected' },
};

export const ago = (minutes: number) =>
  minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
