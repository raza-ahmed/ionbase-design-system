import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Hash routing, because GitHub Pages has no SPA fallback: a refreshed
 * `/demo/runs` is a 404, a refreshed `/demo/#/runs` is not. A handful of routes
 * and one id parameter do not earn a router library.
 */
export const ROUTES = [
  'overview',
  'agents',
  'agents/new',
  'runs',
  'assistant',
  'members',
  'settings',
] as const;
/**
 * Detail pages carry an id: `#/runs/run_4821`, `#/agents/agt_rs` and its
 * `#/agents/agt_rs/runs` tab. `agents/new` is a route of its own and wins.
 * `#/members/usr_ada` is the Members page with Ada selected — the ListDetail
 * pattern keeps the selection in the address, so it can be shared.
 */
export type Route =
  | (typeof ROUTES)[number]
  | `runs/${string}`
  | `agents/${string}`
  | `members/${string}`;

export const href = (route: Route) => `#/${route}`;

/** `#/agents?status=paused` → `agents`. The query is the page's own state. */
const pathOf = (hash: string) => hash.replace(/^#\/?/, '').split('?')[0];

function parse(hash: string): Route | null {
  const path = pathOf(hash) || 'overview';
  if (/^(runs|members)\/[\w-]+$/.test(path)) return path as Route;
  if (path !== 'agents/new' && /^agents\/[\w-]+(\/runs)?$/.test(path))
    return path as Route;
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : null;
}

/** The top-level section a route belongs to — what the nav marks as current. */
export const sectionOf = (route: Route): Route =>
  route.startsWith('agents/')
    ? 'agents'
    : route.startsWith('runs/')
      ? 'runs'
      : route.startsWith('members/')
        ? 'members'
        : route;

export function navigate(route: Route) {
  window.location.hash = href(route);
}

/**
 * Go to a route without adding a history entry — for a selection that moves
 * with the arrow keys, where every row would otherwise be a Back press.
 */
export function replaceRoute(route: Route) {
  window.location.replace(href(route));
}

/** `null` is an unknown route — rendered as not-found, never silently redirected. */
export function useRoute(): Route | null {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

/*
 * A page's own state in the address — a table's filters, sort and page —
 * after the route: `#/agents?status=paused&page=2`. The route is unchanged by
 * it, so the page is not mounted again.
 */
const written = new Set<() => void>();
const subscribeHash = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  written.add(onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    written.delete(onChange);
  };
};
const queryOf = (hash: string) => hash.split('?')[1] ?? '';

/** The query as it is now, outside React — for a handler that writes it. */
export const readHashQuery = () => queryOf(window.location.hash);

/** The current query, as a string — compare it, or parse it with URLSearchParams. */
export function useHashQuery(): string {
  return useSyncExternalStore(
    subscribeHash,
    () => queryOf(window.location.hash),
    () => '',
  );
}

/**
 * Write the query, keeping the route. `replace` for a change that should not
 * be a Back press of its own — each keystroke of a search.
 */
export function setHashQuery(
  params: URLSearchParams,
  { replace = false }: { replace?: boolean } = {},
) {
  const qs = params.toString();
  if (qs === queryOf(window.location.hash)) return;
  const next = `#/${pathOf(window.location.hash)}${qs ? `?${qs}` : ''}`;
  if (replace) window.location.replace(next);
  else window.location.hash = next;
  // Now, not on `hashchange`, which comes a task later: a second pick in a
  // MultiSelect before it would be built on the first pick's stale value.
  for (const onChange of written) onChange();
}
