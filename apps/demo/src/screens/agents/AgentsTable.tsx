import {
  Avatar,
  Button,
  ContextMenu,
  Icon,
  Link,
  StatusIndicator,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TruncatedText,
  type TableColumn,
  type TableSortProps,
  type UseTableColumnsResult,
  type UseTableSelectionResult,
} from 'ionbase-ui';
import { Ellipsis } from 'ionbase-icons/icons/ellipsis';
import { Pause } from 'ionbase-icons/icons/pause';
import { Play } from 'ionbase-icons/icons/play';
import { Trash2 } from 'ionbase-icons/icons/trash-2';

import {
  STATUS_LABEL,
  TEAMS,
  type Agent,
  type AgentSortColumn,
  type AgentStatus,
} from '../../data/agents';
import { formatDay } from '../../lib/dates';
import { href } from '../../lib/router';

const STATUS_INTENT: Record<
  AgentStatus,
  'success' | 'neutral' | 'error' | 'information'
> = {
  running: 'success',
  paused: 'neutral',
  failing: 'error',
  draft: 'information',
};

const teamLabel = (value: string) =>
  TEAMS.find((t) => t.value === value)?.label ?? value;

/** `sortProps` from `useTableSort`, wrapped by the screen to re-query. */
export type HeaderSort = (
  column: AgentSortColumn,
  options?: { firstDirection?: 'ascending' | 'descending' },
) => TableSortProps;

export type AgentColumn =
  'agent' | 'status' | 'team' | 'owner' | 'runs' | 'success' | 'lastRun';

/*
 * The columns people choose from, and how each resizes. The agent names the
 * row, so it always stays; it is the one that resizes, since a wider column
 * shows more of each purpose under the name.
 */
export const AGENT_COLUMNS: TableColumn<AgentColumn>[] = [
  {
    key: 'agent',
    label: 'Agent',
    canHide: false,
    canResize: true,
    // The cell's own floor — 16rem and its padding — so the narrowest the
    // handle says is the narrowest it is.
    minWidth: 288,
    maxWidth: 560,
  },
  { key: 'status', label: 'Status' },
  { key: 'team', label: 'Team' },
  { key: 'owner', label: 'Owner' },
  { key: 'runs', label: 'Runs (7d)' },
  { key: 'success', label: 'Success' },
  { key: 'lastRun', label: 'Last run' },
];

export type AgentColumns = UseTableColumnsResult<AgentColumn>;

/*
 * Which columns sort, and which way each starts: runs and last run newest or
 * largest first, success lowest first — the failing agents are what someone
 * sorting by success is looking for.
 */
const HEADER: Record<
  AgentColumn,
  {
    align?: 'trailing';
    sort?: AgentSortColumn;
    first?: 'ascending' | 'descending';
  }
> = {
  agent: { sort: 'name' },
  status: {},
  team: {},
  owner: {},
  runs: { align: 'trailing', sort: 'runs7d', first: 'descending' },
  success: { align: 'trailing', sort: 'successRate' },
  lastRun: { sort: 'lastRun', first: 'descending' },
};

function ColumnHeaders({
  sortProps,
  columns,
}: {
  sortProps: HeaderSort;
  columns: AgentColumns;
}) {
  return columns.visibleColumns.map((c) => {
    const h = HEADER[c.key];
    return (
      <TableCell
        key={c.key}
        header
        align={h.align}
        {...(h.sort && sortProps(h.sort, { firstDirection: h.first }))}
        {...columns.headerProps(c.key)}
      >
        {c.label}
      </TableCell>
    );
  });
}

/** A metric the partial state failed to load: a dash to see, a word to hear. */
function Missing() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="ion-visually-hidden">Unavailable</span>
    </>
  );
}

/** One agent's cell in one column. */
function AgentCell({
  column,
  agent: a,
}: {
  column: AgentColumn;
  agent: Agent;
}) {
  switch (column) {
    case 'agent':
      return (
        <TableCell>
          <span className="demo-cell-stack">
            <Link href={href(`agents/${a.id}`)} className="ion-text--semibold">
              {a.name}
            </Link>
            {/* A purpose is written by whoever edits the agent, so no one
                can promise it is short: one line, and the rest a tab stop
                and a tooltip away — or a wider column. */}
            <TruncatedText className="ion-text-caption demo-muted">
              {a.purpose}
            </TruncatedText>
          </span>
        </TableCell>
      );
    case 'status':
      return (
        <TableCell>
          <StatusIndicator intent={STATUS_INTENT[a.status]}>
            {STATUS_LABEL[a.status]}
          </StatusIndicator>
        </TableCell>
      );
    case 'team':
      return <TableCell>{teamLabel(a.team)}</TableCell>;
    case 'owner':
      return (
        <TableCell>
          <span className="demo-cell-inline">
            <span aria-hidden="true">
              <Avatar size="mini" initials={a.owner.initials} />
            </span>
            {a.owner.name}
          </span>
        </TableCell>
      );
    case 'runs':
      return (
        <TableCell align="trailing">
          {a.runs7d === null ? <Missing /> : a.runs7d.toLocaleString('en')}
        </TableCell>
      );
    case 'success':
      return (
        <TableCell align="trailing">
          {a.successRate === null ? (
            <Missing />
          ) : (
            `${a.successRate.toFixed(1)}%`
          )}
        </TableCell>
      );
    case 'lastRun':
      return (
        <TableCell>
          {a.lastRun === null && a.runs7d === null ? (
            <Missing />
          ) : a.lastRun ? (
            formatDay(a.lastRun)
          ) : (
            'Never'
          )}
        </TableCell>
      );
  }
}

export function AgentsTable({
  id,
  rows,
  sortProps,
  columns,
  selection,
  onPause,
  onDelete,
}: {
  id: string;
  rows: Agent[];
  sortProps: HeaderSort;
  columns: AgentColumns;
  selection: UseTableSelectionResult<string>;
  onPause: (agent: Agent, paused: boolean) => void;
  onDelete: (agent: Agent) => void;
}) {
  return (
    <Table id={id} aria-label="Agents">
      <TableHead>
        <TableRow
          selection={selection.headSelection(
            rows.map((a) => a.id),
            'Select all agents on this page',
          )}
        >
          <ColumnHeaders sortProps={sortProps} columns={columns} />
          <TableCell header>
            <span className="ion-visually-hidden">Actions</span>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((a) => {
          const paused = a.status === 'paused';
          // One menu, two ways in: the row's own ⋯ button, and a right-click
          // or Shift+F10 on the row. The context menu is the shortcut; the
          // button is what makes every action reachable without it.
          const rowMenu = (
            <Menu
              onAction={(key) => {
                if (key === 'pause') onPause(a, !paused);
                else onDelete(a);
              }}
            >
              {/* Delete sits apart from the everyday action, behind a rule,
                  so it is never the row the pointer lands on by habit. */}
              <MenuSection aria-label="Run">
                <MenuItem
                  key="pause"
                  icon={<Icon as={paused ? Play : Pause} size="sm" />}
                  isDisabled={a.status === 'draft'}
                >
                  {paused ? 'Resume' : 'Pause'}
                </MenuItem>
              </MenuSection>
              <MenuSection aria-label="Danger">
                <MenuItem key="delete" icon={<Icon as={Trash2} size="sm" />}>
                  Delete…
                </MenuItem>
              </MenuSection>
            </Menu>
          );
          return (
            <ContextMenu
              key={a.id}
              aria-label={`Actions for ${a.name}`}
              menu={rowMenu}
            >
              <TableRow
                isSelected={selection.isSelected(a.id)}
                selection={selection.rowSelection(a.id, `Select ${a.name}`)}
              >
                {columns.visibleColumns.map((c) => (
                  <AgentCell key={c.key} column={c.key} agent={a} />
                ))}
                <TableCell align="trailing">
                  <MenuTrigger placement="bottom end">
                    <Button
                      size="sm"
                      variant="tertiary"
                      aria-label={`Actions for ${a.name}`}
                      startIcon={<Icon as={Ellipsis} size="sm" />}
                    />
                    {rowMenu}
                  </MenuTrigger>
                </TableCell>
              </TableRow>
            </ContextMenu>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * The pattern's loading state: the real header, skeleton rows, and the same
 * leading selection and trailing actions columns so nothing shifts when rows
 * land. Widths are tokens, not percentages — a percentage of an auto-sized
 * cell resolves to nothing and the skeleton disappears.
 */
const SKELETON_WIDTH: Record<string, string> = {
  Agent: 'var(--spacing-128)',
  Owner: 'var(--spacing-96)',
  Team: 'var(--spacing-80)',
};

export function AgentsTableSkeleton({
  rows,
  sortProps,
  columns,
}: {
  rows: number;
  sortProps: HeaderSort;
  columns: AgentColumns;
}) {
  return (
    <div aria-busy="true">
      <p className="ion-visually-hidden" role="status">
        Loading agents
      </p>
      <Table aria-label="Agents (loading)">
        <TableHead>
          <TableRow>
            <TableCell header>
              <span className="ion-visually-hidden">Select</span>
            </TableCell>
            {/* The real headers, sort state and all, so nothing moves when
                the rows arrive. */}
            <ColumnHeaders sortProps={sortProps} columns={columns} />
            <TableCell header>
              <span className="ion-visually-hidden">Actions</span>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: Math.min(rows, 10) }, (_, r) => (
            <TableRow key={r}>
              <TableCell>
                <Skeleton
                  variant="rect"
                  width="var(--spacing-20)"
                  height="var(--spacing-20)"
                />
              </TableCell>
              {columns.visibleColumns.map((c) => (
                <TableCell key={c.key}>
                  <Skeleton
                    variant="text"
                    width={SKELETON_WIDTH[c.label] ?? 'var(--spacing-48)'}
                  />
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
