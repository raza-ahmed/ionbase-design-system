import { useEffect, useState } from 'react';

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
  'settings',
] as const;
/**
 * Detail pages carry an id: `#/runs/run_4821`, `#/agents/agt_rs` and its
 * `#/agents/agt_rs/runs` tab. `agents/new` is a route of its own and wins.
 */
export type Route =
  (typeof ROUTES)[number] | `runs/${string}` | `agents/${string}`;

export const href = (route: Route) => `#/${route}`;

function parse(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '') || 'overview';
  if (/^runs\/[\w-]+$/.test(path)) return path as Route;
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
      : route;

export function navigate(route: Route) {
  window.location.hash = href(route);
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
