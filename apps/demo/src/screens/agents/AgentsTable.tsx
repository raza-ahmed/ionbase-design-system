import {
  Avatar,
  Badge,
  Button,
  Icon,
  Link,
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
  type TableSortProps,
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

/*
 * Which columns sort, and which way each starts: runs and last run newest or
 * largest first, success lowest first — the failing agents are what someone
 * sorting by success is looking for.
 */
const COLUMNS: {
  label: string;
  align?: 'trailing';
  sort?: AgentSortColumn;
  first?: 'ascending' | 'descending';
}[] = [
  { label: 'Agent', sort: 'name' },
  { label: 'Status' },
  { label: 'Team' },
  { label: 'Owner' },
  {
    label: 'Runs (7d)',
    align: 'trailing',
    sort: 'runs7d',
    first: 'descending',
  },
  { label: 'Success', align: 'trailing', sort: 'successRate' },
  { label: 'Last run', sort: 'lastRun', first: 'descending' },
];

function ColumnHeaders({ sortProps }: { sortProps: HeaderSort }) {
  return COLUMNS.map((c) => (
    <TableCell
      key={c.label}
      header
      align={c.align}
      {...(c.sort && sortProps(c.sort, { firstDirection: c.first }))}
    >
      {c.label}
    </TableCell>
  ));
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

export function AgentsTable({
  id,
  rows,
  sortProps,
  selection,
  onPause,
  onDelete,
}: {
  id: string;
  rows: Agent[];
  sortProps: HeaderSort;
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
          <ColumnHeaders sortProps={sortProps} />
          <TableCell header>
            <span className="ion-visually-hidden">Actions</span>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((a) => {
          const paused = a.status === 'paused';
          return (
            <TableRow
              key={a.id}
              isSelected={selection.isSelected(a.id)}
              selection={selection.rowSelection(a.id, `Select ${a.name}`)}
            >
              <TableCell>
                <span className="demo-cell-stack">
                  <Link
                    href={href(`agents/${a.id}`)}
                    className="ion-text--semibold"
                  >
                    {a.name}
                  </Link>
                  <span className="ion-text-caption demo-muted">
                    {a.purpose}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <Badge size="sm" intent={STATUS_INTENT[a.status]} dot>
                  {STATUS_LABEL[a.status]}
                </Badge>
              </TableCell>
              <TableCell>{teamLabel(a.team)}</TableCell>
              <TableCell>
                <span className="demo-cell-inline">
                  <span aria-hidden="true">
                    <Avatar size="mini" initials={a.owner.initials} />
                  </span>
                  {a.owner.name}
                </span>
              </TableCell>
              <TableCell align="trailing">
                {a.runs7d === null ? (
                  <Missing />
                ) : (
                  a.runs7d.toLocaleString('en')
                )}
              </TableCell>
              <TableCell align="trailing">
                {a.successRate === null ? (
                  <Missing />
                ) : (
                  `${a.successRate.toFixed(1)}%`
                )}
              </TableCell>
              <TableCell>
                {a.lastRun === null && a.runs7d === null ? (
                  <Missing />
                ) : a.lastRun ? (
                  formatDay(a.lastRun)
                ) : (
                  'Never'
                )}
              </TableCell>
              <TableCell align="trailing">
                <MenuTrigger placement="bottom end">
                  <Button
                    size="sm"
                    variant="tertiary"
                    aria-label={`Actions for ${a.name}`}
                    startIcon={<Icon as={Ellipsis} size="sm" />}
                  />
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
                      <MenuItem
                        key="delete"
                        icon={<Icon as={Trash2} size="sm" />}
                      >
                        Delete…
                      </MenuItem>
                    </MenuSection>
                  </Menu>
                </MenuTrigger>
              </TableCell>
            </TableRow>
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
}: {
  rows: number;
  sortProps: HeaderSort;
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
            <ColumnHeaders sortProps={sortProps} />
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
              {COLUMNS.map((c) => (
                <TableCell key={c.label}>
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
