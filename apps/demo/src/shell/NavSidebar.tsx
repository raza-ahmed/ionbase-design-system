import { useState } from 'react';
import {
  Avatar,
  Button,
  Icon,
  Menu,
  MenuItem,
  Popover,
  ProgressBar,
  Sidebar,
  SidebarItem,
  SidebarSection,
} from 'ionbase-ui';
import { Bot } from 'ionbase-icons/icons/bot';
import { ChevronsUpDown } from 'ionbase-icons/icons/chevrons-up-down';
import { LayoutDashboard } from 'ionbase-icons/icons/layout-dashboard';
import { ListChecks } from 'ionbase-icons/icons/list-checks';
import { MessageSquare } from 'ionbase-icons/icons/message-square';
import { Plus } from 'ionbase-icons/icons/plus';
import { Settings } from 'ionbase-icons/icons/settings';

import { listWaitingRuns } from '../data/runs';
import { href, navigate, sectionOf, type Route } from '../lib/router';

const WORKSPACES = [
  { id: 'northwind', name: 'Northwind', initials: 'N' },
  { id: 'sandbox', name: 'Northwind sandbox', initials: 'S' },
];

const compact = new Intl.NumberFormat('en', { notation: 'compact' });
const TOKENS_USED = 1_470_000;
const TOKENS_LIMIT = 2_000_000;

const ic = (as: typeof Bot) => <Icon as={as} size="sm" />;

/**
 * The primary navigation. Rendered beside <main> on wide screens and inside a
 * Drawer on narrow ones — only one of the two is ever visible, so the
 * destinations are never listed twice to a screen reader.
 */
export function NavSidebar({ route }: { route: Route | null }) {
  const section = route && sectionOf(route);
  const waiting = listWaitingRuns();
  const [workspace, setWorkspace] = useState(WORKSPACES[0]);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // A run that is not in the waiting list still belongs to Runs.
  const runIsListed = waiting.some((r) => route === `runs/${r.id}`);

  return (
    <Sidebar
      label="Workspace"
      header={
        <Popover
          placement="bottom"
          size="sm"
          hideArrow
          showClose={false}
          title="Switch workspace"
          isOpen={switcherOpen}
          onOpenChange={setSwitcherOpen}
          content={
            <Menu
              aria-label="Workspaces"
              autoFocus
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[workspace.id]}
              onSelectionChange={(keys) => {
                const next = WORKSPACES.find(
                  (w) => keys !== 'all' && keys.has(w.id),
                );
                if (next) setWorkspace(next);
              }}
              onClose={() => setSwitcherOpen(false)}
            >
              {WORKSPACES.map((w) => (
                <MenuItem
                  key={w.id}
                  icon={<Avatar size="mini" initials={w.initials} alt="" />}
                >
                  {w.name}
                </MenuItem>
              ))}
            </Menu>
          }
        >
          <Button
            variant="tertiary"
            size="md"
            className="demo-workspace"
            startIcon={
              <Avatar size="mini" initials={workspace.initials} alt="" />
            }
            endIcon={ic(ChevronsUpDown)}
          >
            {workspace.name}
          </Button>
        </Popover>
      }
      footer={
        <ProgressBar
          label="Tokens this month"
          size="sm"
          value={TOKENS_USED}
          max={TOKENS_LIMIT}
          intent={TOKENS_USED / TOKENS_LIMIT >= 0.8 ? 'warning' : 'primary'}
          isLabelVisible
          isValueVisible
          valueText={`${compact.format(TOKENS_USED)} of ${compact.format(TOKENS_LIMIT)}`}
        />
      }
    >
      <SidebarSection>
        <SidebarItem
          label="Overview"
          icon={ic(LayoutDashboard)}
          href={href('overview')}
          isCurrent={section === 'overview'}
        />
        <SidebarItem
          label="Assistant"
          icon={ic(MessageSquare)}
          href={href('assistant')}
          isCurrent={section === 'assistant'}
        />
      </SidebarSection>

      <SidebarSection title="Operations" isCollapsible>
        <SidebarItem
          label="Agents"
          icon={ic(Bot)}
          href={href('agents')}
          isCurrent={section === 'agents'}
          actions={
            <Button
              variant="tertiary"
              size="sm"
              aria-label="New agent"
              startIcon={ic(Plus)}
              onPress={() => navigate('agents/new')}
            />
          }
        />
        <SidebarItem
          label="Runs"
          icon={ic(ListChecks)}
          href={href('runs')}
          isCurrent={route === 'runs' || (section === 'runs' && !runIsListed)}
          badge={waiting.length > 0 ? String(waiting.length) : undefined}
          defaultExpanded
        >
          {waiting.map((r) => (
            <SidebarItem
              key={r.id}
              label={r.task}
              href={href(`runs/${r.id}`)}
              isCurrent={route === `runs/${r.id}`}
            />
          ))}
        </SidebarItem>
      </SidebarSection>

      <SidebarSection title="Workspace">
        <SidebarItem
          label="Settings"
          icon={ic(Settings)}
          href={href('settings')}
          isCurrent={section === 'settings'}
        />
      </SidebarSection>
    </Sidebar>
  );
}
