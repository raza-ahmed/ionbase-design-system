import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Link,
  Icon,
  Menu,
  MenuItem,
  Popover,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from 'ionbase-ui';
import { Ellipsis } from 'ionbase-icons/icons/ellipsis';
import { Pause } from 'ionbase-icons/icons/pause';
import { Play } from 'ionbase-icons/icons/play';
import { Trash2 } from 'ionbase-icons/icons/trash-2';

import {
  STATUS_LABEL,
  TEAMS,
  type Agent,
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

const COLUMNS = [
  'Agent',
  'Status',
  'Team',
  'Owner',
  'Runs (7d)',
  'Success',
  'Last run',
];

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
  rows,
  selected,
  onSelectedChange,
  onPause,
  onDelete,
}: {
  rows: Agent[];
  selected: ReadonlySet<string>;
  onSelectedChange: (next: ReadonlySet<string>) => void;
  onPause: (agent: Agent, paused: boolean) => void;
  onDelete: (agent: Agent) => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const selectedHere = rows.filter((a) => selected.has(a.id)).length;

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onSelectedChange(next);
  };

  return (
    <Table aria-label="Agents">
      <TableHead>
        <TableRow
          selection={{
            'aria-label': 'Select all agents on this page',
            isSelected: selectedHere > 0 && selectedHere === rows.length,
            isIndeterminate: selectedHere > 0 && selectedHere < rows.length,
            onSelectionChange: (on) =>
              onSelectedChange(new Set(on ? rows.map((a) => a.id) : [])),
          }}
        >
          {COLUMNS.map((c, i) => (
            <TableCell
              key={c}
              header
              align={i >= 4 && i <= 5 ? 'trailing' : undefined}
            >
              {c}
            </TableCell>
          ))}
          <TableCell header>
            <span className="ion-visually-hidden">Actions</span>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((a) => {
          const isSelected = selected.has(a.id);
          const paused = a.status === 'paused';
          return (
            <TableRow
              key={a.id}
              isSelected={isSelected}
              selection={{
                'aria-label': `Select ${a.name}`,
                isSelected,
                onSelectionChange: (on) => toggle(a.id, on),
              }}
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
                <Popover
                  aria-label={`Actions for ${a.name}`}
                  size="sm"
                  placement="bottom"
                  hideArrow
                  isOpen={menuFor === a.id}
                  onOpenChange={(open) => setMenuFor(open ? a.id : null)}
                  content={
                    <Menu>
                      <MenuItem
                        icon={<Icon as={paused ? Play : Pause} size="sm" />}
                        isDisabled={a.status === 'draft'}
                        onClick={() => {
                          setMenuFor(null);
                          onPause(a, !paused);
                        }}
                      >
                        {paused ? 'Resume' : 'Pause'}
                      </MenuItem>
                      <MenuItem
                        icon={<Icon as={Trash2} size="sm" />}
                        onClick={() => {
                          setMenuFor(null);
                          onDelete(a);
                        }}
                      >
                        Delete…
                      </MenuItem>
                    </Menu>
                  }
                >
                  <Button
                    size="sm"
                    variant="tertiary"
                    aria-label={`Actions for ${a.name}`}
                    startIcon={<Icon as={Ellipsis} size="sm" />}
                  />
                </Popover>
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

export function AgentsTableSkeleton({ rows }: { rows: number }) {
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
            {COLUMNS.map((c) => (
              <TableCell key={c} header>
                {c}
              </TableCell>
            ))}
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
                <TableCell key={c}>
                  <Skeleton
                    variant="text"
                    width={SKELETON_WIDTH[c] ?? 'var(--spacing-48)'}
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
