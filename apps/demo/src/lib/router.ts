import { useEffect, useState } from 'react';

/**
 * Hash routing, because GitHub Pages has no SPA fallback: a refreshed
 * `/demo/runs` is a 404, a refreshed `/demo/#/runs` is not. Five flat routes do
 * not earn a router library.
 */
export const ROUTES = [
  'overview',
  'agents',
  'runs',
  'assistant',
  'settings',
] as const;
export type Route = (typeof ROUTES)[number];

export const href = (route: Route) => `#/${route}`;

function parse(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '') || 'overview';
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : null;
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
