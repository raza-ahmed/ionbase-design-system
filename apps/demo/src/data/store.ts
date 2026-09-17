import type { DemoSettings } from '../lib/demo-settings';

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

/** For reads: "loading" never resolves, "error" rejects. */
export async function read(
  { state, latency }: CallSettings,
  signal: AbortSignal,
  failure: string,
): Promise<void> {
  await wait(state === 'loading' ? 2 ** 31 - 1 : latency, signal);
  if (state === 'error') throw new Error(failure);
}

/** For writes: always resolves eventually — a mutation stuck forever is not a state any pattern asks for. */
export async function write(
  { state, latency }: CallSettings,
  failure: string,
): Promise<void> {
  await wait(Math.max(latency, 400));
  if (state === 'error') throw new Error(failure);
}
