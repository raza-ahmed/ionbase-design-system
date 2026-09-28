import { addDays, today, type IsoDay } from '../lib/dates';
import { listAgentsOwnedBy, type Agent } from './agents';
import { read, type CallSettings } from './store';

export type MemberRole = 'admin' | 'member';

export interface Member {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: MemberRole;
  team: string;
  joined: IsoDay;
  /** Minutes since they last did anything; `null` for an invitation not yet accepted. */
  lastActiveMinutesAgo: number | null;
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  admin: 'Workspace admin',
  member: 'Member',
};

/* The people who own the agents, and three who own none. */
const SEED: [string, string, MemberRole, string, number, number | null][] = [
  ['Ada Reyes', 'AR', 'admin', 'Finance', 410, 2],
  ['Kwame Mensah', 'KM', 'admin', 'Platform', 388, 45],
  ['Lin Zhou', 'LZ', 'member', 'Customer support', 301, 180],
  ['Priya Natarajan', 'PN', 'member', 'Growth', 265, 1_500],
  ['Tomás Ortega', 'TO', 'member', 'Legal', 190, 4_300],
  ['Noor Haddad', 'NH', 'member', 'People ops', 64, 900],
  ['Sofia Lindqvist', 'SL', 'member', 'Finance', 12, 20_000],
  ['Ravi Kapoor', 'RK', 'member', 'Growth', 2, null],
];

/** "Tomás Ortega" → "tomas": the id's and the address's handle. */
const handleOf = (name: string) =>
  name
    .split(' ')[0]
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();

const members: Member[] = SEED.map(
  ([name, initials, role, team, joinedDaysAgo, lastActiveMinutesAgo]) => ({
    id: `usr_${handleOf(name)}`,
    name,
    initials,
    email: `${handleOf(name)}@ionbase.example`,
    role,
    team,
    joined: addDays(today(), -joinedDaysAgo),
    lastActiveMinutesAgo,
  }),
);

/**
 * Everyone, synchronously, for a field that picks among them — the approval
 * order in Settings. A field's options are not a page's data: they are
 * there when the field is.
 */
export function listMemberOptions(): Pick<
  Member,
  'id' | 'name' | 'team' | 'lastActiveMinutesAgo'
>[] {
  return members.map(({ id, name, team, lastActiveMinutesAgo }) => ({
    id,
    name,
    team,
    lastActiveMinutesAgo,
  }));
}

export async function listMembers(
  settings: CallSettings,
  signal: AbortSignal,
): Promise<Member[]> {
  await read(
    settings,
    signal,
    'The directory service did not respond (HTTP 503).',
  );
  return settings.state === 'empty' ? [] : members;
}

export interface MemberActivity {
  agents: Pick<Agent, 'id' | 'name' | 'status'>[];
}

/**
 * The detail's own call, apart from the list's: which agents a member owns.
 * In the `partial` state it fails, so the pane shows its own error while the
 * list, and the facts the list already had, stay.
 */
export async function getMemberActivity(
  id: string,
  settings: CallSettings,
  signal: AbortSignal,
): Promise<MemberActivity> {
  await read(
    settings.state === 'partial' ? { ...settings, state: 'error' } : settings,
    signal,
    'The activity service did not respond (HTTP 503).',
  );
  const member = members.find((m) => m.id === id);
  return { agents: member ? listAgentsOwnedBy(member.name) : [] };
}
