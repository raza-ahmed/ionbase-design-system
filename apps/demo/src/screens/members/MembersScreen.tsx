import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  CopyButton,
  DescriptionList,
  DescriptionListItem,
  EmptyState,
  Link,
  List,
  PageHeader,
  SearchField,
  SidePanel,
  SidePanelLayout,
  Skeleton,
  StatusIndicator,
  useToast,
  type ListItem,
} from 'ionbase-ui';

import { STATUS_LABEL, type AgentStatus } from '../../data/agents';
import {
  getMemberActivity,
  listMembers,
  ROLE_LABEL,
  type Member,
} from '../../data/members';
import { useDemoSettings } from '../../lib/demo-settings';
import { useMediaQuery } from '../../lib/media';
import { isOffline } from '../../lib/online';
import { href, replaceRoute } from '../../lib/router';
import { useResource } from '../../lib/use-resource';
import { FullPageError } from '../../shell/FullPageError';

/** SidePanel's own breakpoint: below it the panel is a Drawer. */
const NARROW = '(width < 768px)';

const STATUS_INTENT: Record<
  AgentStatus,
  'success' | 'neutral' | 'error' | 'warning'
> = {
  running: 'success',
  paused: 'neutral',
  failing: 'error',
  draft: 'warning',
};

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const day = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function lastActive(minutes: number | null): string {
  if (minutes === null) return 'Invited, not joined yet';
  if (minutes < 60) return relative.format(-minutes, 'minute');
  if (minutes < 1_440)
    return relative.format(-Math.round(minutes / 60), 'hour');
  return relative.format(-Math.round(minutes / 1_440), 'day');
}

/**
 * The ListDetail pattern: the workspace's people in a List, the one selected
 * in a SidePanel beside it, and the selection in the address.
 */
export function MembersScreen({ selectedId }: { selectedId: string | null }) {
  const settings = useDemoSettings();
  const members = useResource(
    (signal) => listMembers(settings, signal),
    `${settings.state}|${settings.latency}`,
  );

  // The list is the page: when it cannot load there is nothing to show.
  if (members.status === 'error')
    return (
      <FullPageError
        kind={isOffline(members.error) ? 'offline' : 'failed'}
        pageTitle="Members"
        title="Members couldn’t load"
        description={`${members.error.message} Everyone keeps their access; only this list is missing.`}
        error={members.error}
        onRetry={members.retry}
        secondaryAction={<Link href={href('overview')}>Go to overview</Link>}
      />
    );

  return (
    <div className="demo-page">
      <PageHeader
        titleId="page-title"
        title="Members"
        description="Everyone in this workspace, their role and the agents they own."
      />

      {members.status === 'loading' && (
        <div aria-busy="true">
          <p className="ion-visually-hidden" role="status">
            Loading members
          </p>
          <div className="demo-queue demo-queue--loading">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="text" lines={2} />
            ))}
          </div>
        </div>
      )}

      {members.status === 'ready' && members.data.length === 0 && (
        <EmptyState
          reason="first-run"
          size="page"
          headingLevel={2}
          title="No one else is here yet"
          description="People appear here once they accept an invitation to the workspace."
          action={<Link href={href('overview')}>Go to overview</Link>}
        />
      )}

      {members.status === 'ready' && members.data.length > 0 && (
        <Directory members={members.data} selectedId={selectedId} />
      )}
    </div>
  );
}

function Directory({
  members,
  selectedId,
}: {
  members: Member[];
  selectedId: string | null;
}) {
  const narrow = useMediaQuery(NARROW);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = members.filter(
    (m) =>
      !query || m.name.toLowerCase().includes(query) || m.email.includes(query),
  );
  // Detail of a row the search has hidden would be a lie; it comes back
  // when the row does. An id that matches no one is said in the panel.
  const selected = selectedId
    ? (members.find((m) => m.id === selectedId) ?? 'unknown')
    : null;
  const visible =
    selected === 'unknown' || (selected && shown.includes(selected));

  // Replace, never push: the selection moves with every arrow key, and a
  // history entry per row would make Back walk the list instead of leaving.
  const select = (id: string | null) =>
    replaceRoute(id ? `members/${id}` : 'members');

  const items: ListItem[] = shown.map((m) => ({
    id: m.id,
    label: m.name,
    description: m.email,
    leading: <Avatar size="sm" initials={m.initials} />,
    meta: m.role === 'admin' && <Badge size="sm">Admin</Badge>,
  }));

  return (
    <>
      <SearchField
        size="sm"
        aria-label="Search members"
        placeholder="Search by name or email"
        value={search}
        onChange={setSearch}
        className="demo-members-search"
      />
      <SidePanelLayout>
        <List
          aria-label="Members"
          className="demo-queue"
          items={items}
          // Wide: the selection follows focus, and the panel beside follows
          // the selection — arrow down the list and read each one. Narrow:
          // the panel is a modal Drawer, so a row opens it on a press, not on
          // arrival, or tabbing into the list would open a dialog.
          {...(narrow
            ? { onAction: select }
            : {
                selectionMode: 'single' as const,
                selectedKeys:
                  selected && selected !== 'unknown' ? [selected.id] : [],
                onSelectionChange: (keys: Set<string>) =>
                  select([...keys][0] ?? null),
                // Enter or a double click goes into the detail.
                onAction: () =>
                  document
                    .querySelector<HTMLElement>('#member-panel h2')
                    ?.focus(),
              })}
          renderEmptyState={() => `No one matches “${search.trim()}”.`}
        />
        <SidePanel
          id="member-panel"
          size="sm"
          autoFocus={false}
          isOpen={!!visible}
          onOpenChange={(isOpen) => !isOpen && select(null)}
          title={
            selected === 'unknown' ? 'Member not found' : (selected?.name ?? '')
          }
          description={
            selected && selected !== 'unknown'
              ? ROLE_LABEL[selected.role]
              : undefined
          }
        >
          {selected === 'unknown' ? (
            <EmptyState
              reason="no-results"
              size="panel"
              headingLevel={3}
              title="There is no member with this ID"
              description="They may have left the workspace, or the link is wrong."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => select(null)}
                >
                  Show everyone
                </Button>
              }
            />
          ) : (
            selected && <MemberDetail key={selected.id} member={selected} />
          )}
        </SidePanel>
      </SidePanelLayout>
    </>
  );
}

function MemberDetail({ member }: { member: Member }) {
  const settings = useDemoSettings();
  const toast = useToast();
  const activity = useResource(
    (signal) => getMemberActivity(member.id, settings, signal),
    `${member.id}|${settings.state}|${settings.latency}`,
  );

  return (
    <div className="demo-member-detail">
      {/* What the list already had shows at once; only the agents wait. */}
      <DescriptionList layout="stacked">
        <DescriptionListItem term="Email">
          <span className="demo-copy-value">
            <span>{member.email}</span>
            <CopyButton
              value={member.email}
              isIconOnly
              size="sm"
              label="Copy email"
              copiedLabel="Email copied"
              onCopyError={(_, text) =>
                toast.toast({
                  intent: 'error',
                  title: "Couldn't copy the email",
                  message: text,
                })
              }
            />
          </span>
        </DescriptionListItem>
        <DescriptionListItem term="Team">{member.team}</DescriptionListItem>
        <DescriptionListItem term="Joined">
          {day.format(new Date(member.joined))}
        </DescriptionListItem>
        <DescriptionListItem term="Last active">
          {lastActive(member.lastActiveMinutesAgo)}
        </DescriptionListItem>
      </DescriptionList>

      <section aria-labelledby="member-agents" className="demo-member-agents">
        <h3 id="member-agents" className="ion-text-body-sm ion-text--semibold">
          Agents they own
        </h3>
        {activity.status === 'loading' && (
          <div aria-busy="true">
            <span className="ion-visually-hidden" role="status">
              Loading agents
            </span>
            <Skeleton variant="text" lines={2} />
          </div>
        )}
        {activity.status === 'error' && (
          <Alert
            intent="error"
            title="Their agents couldn't load"
            actions={
              <Button size="sm" variant="secondary" onPress={activity.retry}>
                Try again
              </Button>
            }
          >
            {activity.error.message} The rest of their details are up to date.
          </Alert>
        )}
        {activity.status === 'ready' &&
          (activity.data.agents.length === 0 ? (
            <p className="ion-text-body-sm demo-muted">Owns no agents.</p>
          ) : (
            <ul className="demo-member-agent-list">
              {activity.data.agents.map((a) => (
                <li key={a.id}>
                  <Link href={href(`agents/${a.id}`)}>{a.name}</Link>
                  <StatusIndicator intent={STATUS_INTENT[a.status]} size="sm">
                    {STATUS_LABEL[a.status]}
                  </StatusIndicator>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
