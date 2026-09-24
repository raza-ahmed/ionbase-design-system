import { addDays, today, type IsoDay } from '../lib/dates';
import { read, write, type CallSettings } from './store';

export type AgentStatus = 'running' | 'paused' | 'failing' | 'draft';

export interface Agent {
  id: string;
  name: string;
  purpose: string;
  status: AgentStatus;
  team: string;
  owner: { name: string; initials: string };
  /** `null` when the metrics source failed for this row — the `partial` state. */
  runs7d: number | null;
  successRate: number | null;
  lastRun: IsoDay | null;
}

export const TEAMS = [
  { value: 'finance', label: 'Finance' },
  { value: 'support', label: 'Customer support' },
  { value: 'growth', label: 'Growth' },
  { value: 'platform', label: 'Platform' },
  { value: 'legal', label: 'Legal' },
  { value: 'people', label: 'People ops' },
];

const PEOPLE = [
  { name: 'Ada Reyes', initials: 'AR' },
  { name: 'Kwame Mensah', initials: 'KM' },
  { name: 'Lin Zhou', initials: 'LZ' },
  { name: 'Priya Natarajan', initials: 'PN' },
  { name: 'Tomás Ortega', initials: 'TO' },
];

const SEED: [string, string, AgentStatus, string][] = [
  [
    'Invoice reconciler',
    'Matches supplier invoices to purchase orders',
    'running',
    'finance',
  ],
  [
    'Support triage',
    'Routes inbound tickets and drafts first replies',
    'running',
    'support',
  ],
  [
    'Churn-risk scorer',
    'Flags accounts whose usage is dropping',
    'running',
    'growth',
  ],
  [
    'Release notes writer',
    'Drafts release notes from merged pull requests',
    'paused',
    'platform',
  ],
  [
    'Contract clause checker',
    'Highlights non-standard terms in vendor contracts',
    'running',
    'legal',
  ],
  [
    'Expense auditor',
    'Checks expense claims against policy',
    'failing',
    'finance',
  ],
  [
    'Onboarding guide',
    'Answers new-hire questions in their first month',
    'running',
    'people',
  ],
  [
    'Refund approver',
    'Proposes refunds under the auto-approve limit',
    'running',
    'support',
  ],
  [
    'Incident summariser',
    'Writes the first draft of incident reports',
    'running',
    'platform',
  ],
  [
    'Lead enricher',
    'Adds firmographic data to new sign-ups',
    'paused',
    'growth',
  ],
  [
    'Renewal forecaster',
    'Predicts renewal likelihood for the quarter',
    'running',
    'finance',
  ],
  [
    'Knowledge-base curator',
    'Finds stale help articles and proposes edits',
    'running',
    'support',
  ],
  [
    'Access reviewer',
    'Lists stale permissions for quarterly review',
    'failing',
    'platform',
  ],
  [
    'Policy Q&A',
    'Answers questions about the employee handbook',
    'running',
    'people',
  ],
  [
    'Dunning assistant',
    'Sequences reminders for overdue invoices',
    'running',
    'finance',
  ],
  [
    'Feature request tagger',
    'Clusters feature requests by theme',
    'running',
    'growth',
  ],
  [
    'Cost anomaly watcher',
    'Alerts on unexpected cloud spend',
    'running',
    'platform',
  ],
  ['NDA drafter', 'Prepares mutual NDAs from the template', 'paused', 'legal'],
  [
    'Survey summariser',
    'Summarises open-text survey responses',
    'running',
    'people',
  ],
  [
    'Chargeback responder',
    'Assembles evidence for card disputes',
    'failing',
    'finance',
  ],
  [
    'Escalation predictor',
    'Warns when a ticket is likely to escalate',
    'running',
    'support',
  ],
  [
    'Pricing page tester',
    'Proposes copy variants for experiments',
    'paused',
    'growth',
  ],
  [
    'Dependency updater',
    'Opens upgrade pull requests with changelogs',
    'running',
    'platform',
  ],
  [
    'Offboarding checklist',
    'Tracks equipment and access on leaving',
    'running',
    'people',
  ],
  [
    'Tax form collector',
    'Chases missing W-9 and W-8 forms',
    'running',
    'finance',
  ],
  [
    'Sentiment monitor',
    'Tracks sentiment across support channels',
    'running',
    'support',
  ],
  [
    'Trial nurturer',
    'Suggests next steps to trial accounts',
    'running',
    'growth',
  ],
  [
    'Runbook linker',
    'Attaches the right runbook to each alert',
    'running',
    'platform',
  ],
  [
    'Trademark watcher',
    'Scans filings for conflicting marks',
    'paused',
    'legal',
  ],
  [
    'Interview scheduler',
    'Proposes panel slots across calendars',
    'running',
    'people',
  ],
];

let agents: Agent[] = SEED.map(([name, purpose, status, team], i) => {
  const idle = status === 'paused' || status === 'draft';
  return {
    id: `agt_${(1000 + i * 37).toString(36)}`,
    name,
    purpose,
    status,
    team,
    owner: PEOPLE[(i * 3) % PEOPLE.length],
    runs7d: idle ? 0 : 40 + ((i * 97) % 900),
    successRate:
      status === 'failing' ? 71 + ((i * 7) % 12) : 93 + ((i * 13) % 70) / 10,
    lastRun: addDays(today(), -(idle ? 9 + (i % 20) : i % 3)),
  };
});

export const STATUS_LABEL: Record<AgentStatus, string> = {
  running: 'Running',
  paused: 'Paused',
  failing: 'Failing',
  draft: 'Draft',
};

export type AgentSortColumn = 'name' | 'runs7d' | 'successRate' | 'lastRun';

export interface AgentQuery {
  search: string;
  status: AgentStatus | 'all';
  team: string | null;
  /** Applied to every match before paging — sorting one page would lie. */
  sort: { column: AgentSortColumn; direction: 'ascending' | 'descending' };
  page: number;
  pageSize: number;
}

export interface AgentPage {
  rows: Agent[];
  /** Matching the filters, before paging. */
  total: number;
  /** In the workspace, ignoring filters — tells "none exist" from "none match". */
  workspaceTotal: number;
  /** Rows whose metrics failed to load. */
  degraded: number;
}

export async function listAgents(
  query: AgentQuery,
  settings: CallSettings,
  signal: AbortSignal,
): Promise<AgentPage> {
  await read(
    settings,
    signal,
    'The agents service did not respond (HTTP 503).',
  );
  const source = settings.state === 'empty' ? [] : agents;

  const needle = query.search.trim().toLowerCase();
  const matching = source.filter(
    (a) =>
      (query.status === 'all' || a.status === query.status) &&
      (query.team === null || a.team === query.team) &&
      (!needle ||
        a.name.toLowerCase().includes(needle) ||
        a.purpose.toLowerCase().includes(needle)),
  );

  const { column, direction } = query.sort;
  const sign = direction === 'ascending' ? 1 : -1;
  matching.sort((a, b) => {
    const x = a[column];
    const y = b[column];
    // Missing metrics sort last in both directions: an unknown is not a zero.
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    const order =
      typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
    return order * sign || a.name.localeCompare(b.name);
  });

  let rows = matching.slice(
    (query.page - 1) * query.pageSize,
    query.page * query.pageSize,
  );
  let degraded = 0;
  if (settings.state === 'partial') {
    // Every third row lost its metrics, the rest arrived intact.
    rows = rows.map((a, i) => {
      if (i % 3 !== 1) return a;
      degraded += 1;
      return { ...a, runs7d: null, successRate: null, lastRun: null };
    });
  }

  return {
    rows,
    total: matching.length,
    workspaceTotal: source.length,
    degraded,
  };
}

export async function setPaused(
  ids: string[],
  paused: boolean,
  settings: CallSettings,
): Promise<void> {
  await write(settings, 'The agents service did not respond (HTTP 503).');
  agents = agents.map((a) =>
    ids.includes(a.id) && a.status !== 'draft'
      ? { ...a, status: paused ? 'paused' : 'running' }
      : a,
  );
}

export interface DeleteResult {
  deleted: string[];
  failed: { id: string; name: string; reason: string }[];
}

export async function deleteAgents(
  ids: string[],
  settings: CallSettings,
): Promise<DeleteResult> {
  await write(
    settings,
    'Nothing was deleted: the agents service did not respond.',
  );
  const targets = agents.filter((a) => ids.includes(a.id));
  // Partial: anything still running refuses — it has to be paused first.
  const failed =
    settings.state === 'partial'
      ? targets
          .filter((a) => a.status === 'running')
          .slice(0, Math.max(1, Math.floor(targets.length / 2)))
          .map((a) => ({
            id: a.id,
            name: a.name,
            reason: 'Still running. Pause it, then delete.',
          }))
      : [];
  const failedIds = new Set(failed.map((f) => f.id));
  const deleted = targets.filter((a) => !failedIds.has(a.id)).map((a) => a.id);
  agents = agents.filter((a) => !deleted.includes(a.id));
  return { deleted, failed };
}

export interface AgentDraft {
  name: string;
  purpose: string;
  team: string | null;
  trigger: 'schedule' | 'webhook' | 'manual';
  startDate: IsoDay | null;
  frequency: string;
  escalationPhone: string;
  knowledgeFiles: string[];
  requireApproval: boolean;
  monthlyTokenBudget: string;
}

export function nameTaken(name: string): boolean {
  const n = name.trim().toLowerCase();
  return agents.some((a) => a.name.toLowerCase() === n);
}

export async function createAgent(
  draft: AgentDraft,
  settings: CallSettings,
): Promise<Agent> {
  await write(
    settings,
    'The agent was not created: the agents service did not respond.',
  );
  const agent: Agent = {
    id: `agt_${Date.now().toString(36)}`,
    name: draft.name.trim(),
    purpose: draft.purpose.trim(),
    status: 'paused',
    team: draft.team ?? 'platform',
    owner: PEOPLE[0],
    runs7d: 0,
    successRate: null,
    lastRun: null,
  };
  agents = [agent, ...agents];
  return agent;
}

/* ------------------------------------------------------------ one agent */

export interface AgentDay {
  day: IsoDay;
  completed: number;
  failed: number;
  stopped: number;
}

export interface AgentRunRow {
  id: string;
  day: IsoDay;
  outcome: 'completed' | 'failed' | 'stopped';
  durationSec: number;
}

export interface AgentDetail {
  agent: Agent;
  /** Runs per day for the last 14 days, oldest first. `null` when the metrics source failed. */
  daily: AgentDay[] | null;
  /** Newest first. */
  recentRuns: AgentRunRow[];
  medianDurationSec: number | null;
}

/** Deterministic noise, so a reload shows the same fortnight. */
const noise = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** `null` is "no agent with this id" — the screen's not-found, not an error. */
export async function getAgent(
  id: string,
  settings: CallSettings,
  signal: AbortSignal,
): Promise<AgentDetail | null> {
  await read(
    settings,
    signal,
    'The agents service did not respond (HTTP 503).',
  );
  const agent = agents.find((a) => a.id === id);
  if (!agent) return null;

  const seed = [...id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const idle =
    settings.state === 'empty' ||
    agent.status === 'draft' ||
    agent.status === 'paused';
  const failRate = 1 - (agent.successRate ?? 95) / 100;
  const perDay = idle ? 0 : Math.max(4, Math.round((agent.runs7d ?? 70) / 7));

  const daily: AgentDay[] = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(today(), i - 13);
    if (idle) return { day, completed: 0, failed: 0, stopped: 0 };
    const total = Math.round(perDay * (0.6 + noise(seed + i) * 0.8));
    // Each run draws its own outcome at the agent's own rates, so the chart
    // agrees with the success-rate tile. Rounding a rate per day instead
    // gave 0 failures on every day of a 93% agent.
    let failed = 0;
    let stopped = 0;
    for (let j = 0; j < total; j++) {
      const r = noise(seed + i * 31 + j);
      if (r < failRate) failed += 1;
      else if (r > 0.98) stopped += 1;
    }
    return {
      day,
      completed: Math.max(0, total - failed - stopped),
      failed,
      stopped,
    };
  });

  const recentRuns: AgentRunRow[] = idle
    ? []
    : Array.from({ length: 12 }, (_, i) => {
        const r = noise(seed + i * 11);
        return {
          id: `${id}-r${120 - i}`,
          day: addDays(today(), -Math.floor(i / 3)),
          outcome: r < failRate ? 'failed' : r > 0.96 ? 'stopped' : 'completed',
          durationSec: 20 + Math.round(noise(seed + i * 7) * 200),
        };
      });
  const sorted = recentRuns.map((r) => r.durationSec).sort((a, b) => a - b);

  return {
    // Empty is a brand-new agent: nothing has run, so no rate and no last run
    // either — a 93% success rate beside "no runs" is a page contradicting itself.
    agent:
      settings.state === 'empty'
        ? { ...agent, runs7d: 0, successRate: null, lastRun: null }
        : agent,
    // Partial: the agent loaded, its metrics did not — the page still works.
    daily: settings.state === 'partial' ? null : daily,
    recentRuns,
    medianDurationSec: sorted.length
      ? sorted[Math.floor(sorted.length / 2)]
      : null,
  };
}
