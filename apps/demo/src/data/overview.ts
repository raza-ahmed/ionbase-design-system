import { addDays, dayCount, eachDay, type IsoDay } from '../lib/dates';
import { listAgentLinks, TEAMS } from './agents';
import { listRecentRuns, listWaitingRuns, type RunSummary } from './runs';

export interface Kpi {
  value: number;
  /** Same metric over the previous period of equal length. */
  previous: number;
}

export interface AgentBudget {
  agent: string;
  usedTokens: number;
  limitTokens: number;
}

/**
 * Tokens spent, as a tree: each team, the agents in it, and the models each
 * agent called. A team's figures are its agents' added up, and an agent's its
 * models'. Largest first at every level.
 */
export interface TokenUse {
  /** `team:finance`, an agent's id, or `agt_x/atlas-m` — unique in the tree. */
  id: string;
  kind: 'team' | 'agent' | 'model';
  name: string;
  /** The team a team row stands for, or the agent an agent or model row is. */
  target: string;
  runs: number;
  tokens: number;
  children?: TokenUse[];
}

export interface OverviewData {
  range: { start: IsoDay; end: IsoDay };
  runs: Kpi;
  /** `null` when that source failed — the `partial` state. */
  successRate: Kpi | null;
  awaitingApproval: Kpi;
  /** Newest first, for the Overview's short list. */
  recentRuns: RunSummary[];
  medianDurationSec: Kpi;
  /** 7 rows (Mon–Sun) × 24 columns (hour, UTC): run counts. */
  runsByWeekdayHour: number[][];
  /** `null` alongside `successRate`. */
  successByDay: { day: IsoDay; rate: number }[] | null;
  budgets: AgentBudget[];
  tokenUse: TokenUse[];
}

/** Mulberry32 — a seeded PRNG, so the same range always shows the same numbers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedOf = (s: string) =>
  [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

const AGENTS = [
  { agent: 'Invoice reconciler', limitTokens: 500_000 },
  { agent: 'Support triage', limitTokens: 1_200_000 },
  { agent: 'Churn-risk scorer', limitTokens: 300_000 },
  { agent: 'Release notes writer', limitTokens: 150_000 },
];

const MODELS = [
  { id: 'swift-s', name: 'Swift S', perRun: 900 },
  { id: 'atlas-m', name: 'Atlas M', perRun: 4_200 },
  { id: 'atlas-l', name: 'Atlas L', perRun: 11_000 },
  { id: 'sage-xl', name: 'Sage XL', perRun: 26_000 },
];

const sum = (rows: TokenUse[], key: 'runs' | 'tokens') =>
  rows.reduce((a, r) => a + r[key], 0);
const largestFirst = (a: TokenUse, b: TokenUse) => b.tokens - a.tokens;

/** Every agent that ran, under its team, split by the models it called. */
function tokenUseOf(random: () => number, scale: number): TokenUse[] {
  const byTeam = new Map<string, TokenUse[]>();
  for (const agent of listAgentLinks()) {
    // A few agents did not run in any range: a team shows who did.
    if (random() < 0.2) continue;
    const first = Math.floor(random() * MODELS.length);
    const used =
      random() < 0.5
        ? [MODELS[first]]
        : [MODELS[first], MODELS[(first + 1) % MODELS.length]];
    const models: TokenUse[] = used.map((m) => {
      const runs = Math.max(1, Math.round((20 + random() * 180) * scale));
      return {
        id: `${agent.id}/${m.id}`,
        kind: 'model',
        name: m.name,
        target: agent.id,
        runs,
        tokens: Math.round(runs * m.perRun * (0.7 + random() * 0.6)),
      };
    });
    const row: TokenUse = {
      id: agent.id,
      kind: 'agent',
      name: agent.name,
      target: agent.id,
      runs: sum(models, 'runs'),
      tokens: sum(models, 'tokens'),
      children: models.sort(largestFirst),
    };
    byTeam.set(agent.team, [...(byTeam.get(agent.team) ?? []), row]);
  }
  return TEAMS.filter((t) => byTeam.has(t.value))
    .map((t): TokenUse => {
      const agents = byTeam.get(t.value)!.sort(largestFirst);
      return {
        id: `team:${t.value}`,
        kind: 'team',
        name: t.label,
        target: t.value,
        runs: sum(agents, 'runs'),
        tokens: sum(agents, 'tokens'),
        children: agents,
      };
    })
    .sort(largestFirst);
}

export function generateOverview(
  start: IsoDay,
  end: IsoDay,
  { empty = false, partial = false } = {},
): OverviewData {
  const days = dayCount(start, end);
  const random = rng(seedOf(start + end));
  const scale = empty ? 0 : days / 14;

  // Business-hours shape: weekdays busier, a peak mid-afternoon UTC.
  const runsByWeekdayHour = Array.from({ length: 7 }, (_, weekday) =>
    Array.from({ length: 24 }, (_, hour) => {
      const weekdayWeight = weekday < 5 ? 1 : 0.25;
      const hourWeight = Math.exp(-((hour - 14) ** 2) / 18);
      return Math.round(
        (4 + 40 * hourWeight) * weekdayWeight * scale * (0.6 + random() * 0.8),
      );
    }),
  );
  const runs = runsByWeekdayHour.flat().reduce((a, b) => a + b, 0);

  const successByDay = eachDay(start, end).map((day) => ({
    day,
    rate: Math.min(100, 93 + random() * 6.5 - (random() < 0.12 ? 5 : 0)),
  }));
  const meanRate =
    successByDay.reduce((a, d) => a + d.rate, 0) / successByDay.length;

  return {
    range: { start, end },
    runs: { value: runs, previous: Math.round(runs * (0.8 + random() * 0.3)) },
    successRate:
      partial || empty
        ? null
        : { value: meanRate, previous: meanRate - 1.5 + random() * 2 },
    // Now, not over the range — the same count the navigation and Runs show.
    awaitingApproval: {
      value: empty ? 0 : listWaitingRuns().length,
      previous: Math.round(1 + random() * 4),
    },
    recentRuns: empty ? [] : listRecentRuns(5),
    medianDurationSec: {
      value: empty ? 0 : Math.round(38 + random() * 20),
      previous: Math.round(40 + random() * 20),
    },
    runsByWeekdayHour,
    successByDay: partial || empty ? null : successByDay,
    tokenUse: empty
      ? []
      : tokenUseOf(rng(seedOf(`tokens${start}${end}`)), scale),
    budgets: AGENTS.map((a) => ({
      ...a,
      usedTokens: empty
        ? 0
        : Math.round(a.limitTokens * Math.min(1.05, 0.35 + random() * 0.7)),
    })),
  };
}

export function defaultRange(end: IsoDay) {
  return { start: addDays(end, -13), end };
}
