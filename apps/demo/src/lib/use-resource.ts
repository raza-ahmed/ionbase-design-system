import { useCallback, useEffect, useState } from 'react';

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T };

/**
 * One async load with the three states every pattern requires, and a retry.
 * `key` is what the load depends on; a change aborts the in-flight request so a
 * slow old response can never overwrite a newer one.
 */
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
): Resource<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<Resource<T>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setResource({ status: 'loading' });
    load(controller.signal).then(
      (data) => setResource({ status: 'ready', data }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResource({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => controller.abort();
    // `load` is recreated every render by callers; `key` is the real dependency.
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...resource, retry };
}
