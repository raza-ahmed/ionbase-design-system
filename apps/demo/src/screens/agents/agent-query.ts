import type { TableSort } from 'ionbase-ui';

import {
  TEAMS,
  type AgentSortColumn,
  type AgentStatus,
} from '../../data/agents';

/**
 * The Agents listing, as it is written in the address:
 * `#/agents?q=invoice&status=paused&team=finance&team=legal&sort=-runs7d&page=2&size=20`.
 * A value at its default is left out, so `#/agents` is the default view and
 * a shared link carries only what was chosen.
 */
export interface AgentListing {
  search: string;
  status: AgentStatus | 'all';
  teams: string[];
  sort: TableSort<AgentSortColumn>;
  page: number;
  pageSize: number;
}

export const DEFAULT_SORT: TableSort<AgentSortColumn> = {
  column: 'name',
  direction: 'ascending',
};
export const PAGE_SIZES = [10, 20, 50];
const STATUSES: AgentStatus[] = ['running', 'paused', 'failing'];
const SORTS: AgentSortColumn[] = ['name', 'runs7d', 'successRate', 'lastRun'];

/**
 * Read defensively: an address is typed, pasted and kept for months. A value
 * that no longer means anything — a status renamed, a team deleted, page
 * "abc" — falls back to its default, never to an error page.
 */
export function readListing(query: string): AgentListing {
  const p = new URLSearchParams(query);
  const status = p.get('status') as AgentStatus | null;
  const sortParam = p.get('sort') ?? '';
  const column = sortParam.replace(/^-/, '') as AgentSortColumn;
  const page = Number(p.get('page'));
  const size = Number(p.get('size'));
  return {
    search: p.get('q')?.trim() ?? '',
    status: status && STATUSES.includes(status) ? status : 'all',
    teams: [...new Set(p.getAll('team'))].filter((t) =>
      TEAMS.some((o) => o.value === t),
    ),
    sort: SORTS.includes(column)
      ? {
          column,
          direction: sortParam.startsWith('-') ? 'descending' : 'ascending',
        }
      : DEFAULT_SORT,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    pageSize: PAGE_SIZES.includes(size) ? size : PAGE_SIZES[0],
  };
}

export function writeListing(l: AgentListing): URLSearchParams {
  const p = new URLSearchParams();
  if (l.search) p.set('q', l.search);
  if (l.status !== 'all') p.set('status', l.status);
  for (const t of l.teams) p.append('team', t);
  if (
    l.sort.column !== DEFAULT_SORT.column ||
    l.sort.direction !== DEFAULT_SORT.direction
  )
    p.set(
      'sort',
      `${l.sort.direction === 'descending' ? '-' : ''}${l.sort.column}`,
    );
  if (l.page > 1) p.set('page', String(l.page));
  if (l.pageSize !== PAGE_SIZES[0]) p.set('size', String(l.pageSize));
  return p;
}
