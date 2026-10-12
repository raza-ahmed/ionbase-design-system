/**
 * The ListDetail pattern, worked: a workspace's members in a List, the one
 * selected in a SidePanel beside it, and the selection in the address. Arrow
 * down the list and the detail follows; nothing opens or closes.
 *
 * It is complete as it stands: `ionbase-ui` and React are its only imports,
 * and the build type-checks it against the package's published types. The
 * address is the hash (`#/members/usr_ada`) so the example needs no router;
 * with one, `readSelected` and `writeSelected` are the router's. The data
 * comes in through `loadMembers` and `loadOwnedAgents`.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  CopyButton,
  DescriptionList,
  DescriptionListItem,
  EmptyState,
  List,
  PageHeader,
  SearchField,
  SidePanel,
  SidePanelLayout,
  Skeleton,
  Stack,
  type ListItem,
} from 'ionbase-ui';

export interface Member {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: 'admin' | 'member';
  team: string;
}

export interface OwnedAgent {
  id: string;
  name: string;
}

type Load<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T };

/** One request with its three states; a newer one aborts the older. */
function useLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
): Load<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (data) => setState({ status: 'ready', data }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => controller.abort();
    // `key` is what the request depends on; `load` is new every render.
  }, [key, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/* ----------------------------------------------------- the address, a width */

const ROUTE = '#/members';

function readSelected(): string | null {
  const hash = window.location.hash;
  const id = hash.startsWith(`${ROUTE}/`) ? hash.slice(ROUTE.length + 1) : '';
  return id ? decodeURIComponent(id) : null;
}

/**
 * The selection in the address, so a link, a reload and a shared URL open the
 * same record. Replaced, never pushed: the selection moves with every arrow
 * key, and an entry per row would make Back walk the list instead of leaving.
 */
function useSelectedInAddress() {
  const [selected, setSelected] = useState(readSelected);
  useEffect(() => {
    const onBack = () => setSelected(readSelected());
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
  const write = (id: string | null) => {
    window.history.replaceState(
      null,
      '',
      id ? `${ROUTE}/${encodeURIComponent(id)}` : ROUTE,
    );
    setSelected(id);
  };
  return [selected, write] as const;
}

/** SidePanel's own breakpoint: below it, the panel opens as a modal Drawer. */
function useNarrow() {
  const query = '(width < 768px)';
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const on = () => setNarrow(media.matches);
    media.addEventListener('change', on);
    return () => media.removeEventListener('change', on);
  }, []);
  return narrow;
}

/* ---------------------------------------------------------------- the page */

export function MembersDirectory({
  loadMembers,
  loadOwnedAgents,
}: {
  loadMembers: (signal: AbortSignal) => Promise<Member[]>;
  loadOwnedAgents: (
    memberId: string,
    signal: AbortSignal,
  ) => Promise<OwnedAgent[]>;
}) {
  const members = useLoad(loadMembers, 'members');

  // The list is the page: when it cannot load, the page has nothing to show.
  // This is the FullPageError pattern, inside the shell.
  if (members.status === 'error')
    return (
      <Stack gap={24}>
        <PageHeader title="Members" />
        <EmptyState
          reason="error"
          size="page"
          headingLevel={2}
          title="Members couldn’t load"
          description={`${members.error.message} Everyone keeps their access; only this list is missing.`}
          action={
            <Button variant="secondary" onPress={members.retry}>
              Try again
            </Button>
          }
        />
      </Stack>
    );

  return (
    <Stack gap={24}>
      <PageHeader
        title="Members"
        description="Everyone in this workspace, and their role."
      />

      {members.status === 'loading' && (
        <div aria-busy="true">
          <p className="ion-visually-hidden" role="status">
            Loading members
          </p>
          <Stack gap={16}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="text" lines={2} />
            ))}
          </Stack>
        </div>
      )}

      {/* No records is the page's empty state, and no panel. */}
      {members.status === 'ready' && members.data.length === 0 && (
        <EmptyState
          reason="first-run"
          size="page"
          headingLevel={2}
          title="No one else is here yet"
          description="People appear here once they accept an invitation."
        />
      )}

      {members.status === 'ready' && members.data.length > 0 && (
        <Directory members={members.data} loadOwnedAgents={loadOwnedAgents} />
      )}
    </Stack>
  );
}

function Directory({
  members,
  loadOwnedAgents,
}: {
  members: Member[];
  loadOwnedAgents: (
    memberId: string,
    signal: AbortSignal,
  ) => Promise<OwnedAgent[]>;
}) {
  const narrow = useNarrow();
  const [selectedId, select] = useSelectedInAddress();
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const shown = members.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || m.email.includes(q),
  );

  // An id that matches no one is said in the panel, not a 404: the page is
  // there, one record is not. A row the search hides closes the panel, and
  // opens it again when the row comes back.
  const selected = selectedId
    ? (members.find((m) => m.id === selectedId) ?? 'unknown')
    : null;
  const isOpen =
    selected === 'unknown' || (selected !== null && shown.includes(selected));

  // Nothing interactive in a row: the row is the control.
  const items: ListItem[] = shown.map((m) => ({
    id: m.id,
    label: m.name,
    description: m.email,
    leading: <Avatar size="sm" initials={m.initials} />,
    meta: m.role === 'admin' && <Badge size="sm">Admin</Badge>,
  }));

  return (
    <Stack gap={16}>
      <SearchField
        size="sm"
        aria-label="Search members"
        placeholder="Search by name or email"
        value={search}
        onChange={setSearch}
      />
      {/* The List first, then the panel: reading order is DOM order. */}
      <SidePanelLayout>
        <List
          aria-label="Members"
          items={items}
          // Wide: the selection follows focus and the panel follows the
          // selection. Narrow: the panel is a modal Drawer, so a row opens it
          // on a press, never on arrival, or tabbing in would open a dialog.
          {...(narrow
            ? { onAction: select }
            : {
                selectionMode: 'single' as const,
                selectedKeys:
                  selected && selected !== 'unknown' ? [selected.id] : [],
                onSelectionChange: (keys: Set<string>) =>
                  select([...keys][0] ?? null),
                // Enter or a double click goes on into the detail.
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
          // It opened because of where focus already is; focus stays on the row.
          autoFocus={false}
          isOpen={isOpen}
          onOpenChange={(open) => !open && select(null)}
          title={
            selected === 'unknown' ? 'Member not found' : (selected?.name ?? '')
          }
          description={
            selected && selected !== 'unknown'
              ? selected.role === 'admin'
                ? 'Workspace admin'
                : 'Member'
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
            selected && (
              <MemberDetail
                key={selected.id}
                member={selected}
                loadOwnedAgents={loadOwnedAgents}
              />
            )
          )}
        </SidePanel>
      </SidePanelLayout>
    </Stack>
  );
}

function MemberDetail({
  member,
  loadOwnedAgents,
}: {
  member: Member;
  loadOwnedAgents: (
    memberId: string,
    signal: AbortSignal,
  ) => Promise<OwnedAgent[]>;
}) {
  const agents = useLoad(
    (signal) => loadOwnedAgents(member.id, signal),
    member.id,
  );

  return (
    <Stack gap={24}>
      {/* What the list already had shows at once; only the agents wait. */}
      <DescriptionList layout="stacked">
        <DescriptionListItem term="Email">
          <Stack direction="row" align="center" gap={4}>
            <span>{member.email}</span>
            <CopyButton
              value={member.email}
              isIconOnly
              size="sm"
              label="Copy email"
              copiedLabel="Email copied"
            />
          </Stack>
        </DescriptionListItem>
        <DescriptionListItem term="Team">{member.team}</DescriptionListItem>
      </DescriptionList>

      <section aria-labelledby="owned-agents">
        <Stack gap={8}>
          <h3 id="owned-agents" className="ion-text-body-sm ion-text--semibold">
            Agents they own
          </h3>
          {/* Its own request: a Skeleton under the facts, never the panel blanked. */}
          {agents.status === 'loading' && (
            <div aria-busy="true">
              <span className="ion-visually-hidden" role="status">
                Loading agents
              </span>
              <Skeleton variant="text" lines={2} />
            </div>
          )}
          {/* One record's missing part: the list and the rest of it stay. */}
          {agents.status === 'error' && (
            <Alert
              intent="error"
              title="Their agents couldn’t load"
              actions={
                <Button size="sm" variant="secondary" onPress={agents.retry}>
                  Try again
                </Button>
              }
            >
              {agents.error.message} The rest of their details are up to date.
            </Alert>
          )}
          {agents.status === 'ready' &&
            (agents.data.length === 0 ? (
              <p className="ion-text-body-sm">Owns no agents.</p>
            ) : (
              <Stack as="ul" gap={4}>
                {agents.data.map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </Stack>
            ))}
        </Stack>
      </section>
    </Stack>
  );
}
