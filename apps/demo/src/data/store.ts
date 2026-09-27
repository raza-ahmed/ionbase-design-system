import type { DemoSettings } from '../lib/demo-settings';
import { OfflineError } from '../lib/online';

/**
 * Shared plumbing for the pretend backend. Every call waits the presenter's
 * latency and honours the forced state, so each screen's loading, error and
 * partial paths are genuine code paths.
 */
export type CallSettings = Pick<DemoSettings, 'state' | 'latency'>;

export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/**
 * For reads: "loading" never resolves, "error" rejects. With no connection
 * every call is refused, as a real one would be — the offline paths are
 * genuine too.
 */
export async function read(
  { state, latency }: CallSettings,
  signal: AbortSignal,
  failure: string,
): Promise<void> {
  if (!navigator.onLine) throw new OfflineError();
  await wait(state === 'loading' ? 2 ** 31 - 1 : latency, signal);
  if (!navigator.onLine) throw new OfflineError();
  if (state === 'error') throw new Error(failure);
}

/** For writes: always resolves eventually — a mutation stuck forever is not a state any pattern asks for. */
export async function write(
  { state, latency }: CallSettings,
  failure: string,
): Promise<void> {
  if (!navigator.onLine) throw new OfflineError();
  await wait(Math.max(latency, 400));
  if (!navigator.onLine) throw new OfflineError();
  if (state === 'error') throw new Error(failure);
}
