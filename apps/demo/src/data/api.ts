import type { DemoSettings } from '../lib/demo-settings';
import type { IsoDay } from '../lib/dates';
import { generateOverview, type OverviewData } from './overview';

/**
 * A pretend backend. Latency and failures are real promises, so loading, empty,
 * error and partial are the screens' genuine code paths rather than props a
 * screen was told to fake.
 */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export async function getOverview(
  range: { start: IsoDay; end: IsoDay },
  { state, latency }: Pick<DemoSettings, 'state' | 'latency'>,
  signal: AbortSignal,
): Promise<OverviewData> {
  // "loading" never resolves; only a settings change (which aborts) ends it.
  await wait(state === 'loading' ? 2 ** 31 - 1 : latency, signal);

  if (state === 'error') {
    throw new Error('The metrics service did not respond (HTTP 503).');
  }
  return generateOverview(range.start, range.end, {
    empty: state === 'empty',
    partial: state === 'partial',
  });
}
