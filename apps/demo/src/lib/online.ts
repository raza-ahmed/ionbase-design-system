import { useSyncExternalStore } from 'react';

/**
 * The connection, as the browser reports it. `navigator.onLine` is false
 * only when there is certainly no network; true means "maybe", which is why
 * a request can still fail while online and is handled as a failed load.
 */
const subscribe = (onChange: () => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** A request refused because there is no connection — not a server failure. */
export class OfflineError extends Error {
  constructor() {
    super('You’re offline.');
    this.name = 'OfflineError';
  }
}

export const isOffline = (error: unknown): boolean =>
  error instanceof OfflineError;
