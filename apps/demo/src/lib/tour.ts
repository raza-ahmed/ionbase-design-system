/**
 * Whether this browser saw the Overview tour through. Only `onComplete`
 * writes it: ended early, the tour is offered as if new.
 */
const KEY = 'ionbase-ops:overview-tour-seen';

export function readTourSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function writeTourSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Private mode: offered as new next time, which is harmless.
  }
}
