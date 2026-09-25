import { CommandPalette, Icon, type CommandPaletteItem } from 'ionbase-ui';
import { Bot } from 'ionbase-icons/icons/bot';
import { LayoutDashboard } from 'ionbase-icons/icons/layout-dashboard';
import { ListChecks } from 'ionbase-icons/icons/list-checks';
import { MessageSquare } from 'ionbase-icons/icons/message-square';
import { Plus } from 'ionbase-icons/icons/plus';
import { Settings } from 'ionbase-icons/icons/settings';
import { ShieldCheck } from 'ionbase-icons/icons/shield-check';

import { listAgentLinks, TEAMS } from '../data/agents';
import { listWaitingRuns } from '../data/runs';
import { navigate, type Route } from '../lib/router';

const ic = (as: typeof Bot) => <Icon as={as} size="sm" />;
const teamLabel = (team: string) =>
  TEAMS.find((t) => t.value === team)?.label ?? team;

/** Every command, rebuilt from the current data each time the palette opens. */
function buildCommands(): CommandPaletteItem[] {
  const go = (
    route: Route,
    label: string,
    icon: typeof Bot,
    keywords?: string[],
  ): CommandPaletteItem => ({
    id: `route:${route}`,
    label: `Go to ${label}`,
    icon: ic(icon),
    section: 'Navigation',
    keywords,
  });

  return [
    {
      id: 'route:agents/new',
      label: 'Create agent',
      description: 'Set up a new agent in four steps',
      icon: ic(Plus),
      section: 'Actions',
      keywords: ['new', 'add'],
    },
    ...listWaitingRuns().map((r) => ({
      id: `route:runs/${r.id}`,
      label: `Review: ${r.task}`,
      description: `${r.agent} is waiting for approval`,
      icon: ic(ShieldCheck),
      section: 'Waiting for you',
      keywords: ['approve', 'approval', 'reject'],
    })),
    go('overview', 'Overview', LayoutDashboard, ['home', 'dashboard']),
    go('assistant', 'Assistant', MessageSquare, ['chat', 'ask']),
    go('agents', 'Agents', Bot),
    go('runs', 'Runs', ListChecks, ['history']),
    go('settings', 'Settings', Settings, ['preferences', 'workspace']),
    ...listAgentLinks().map((a) => ({
      id: `route:agents/${a.id}`,
      label: `Open ${a.name}`,
      description: teamLabel(a.team),
      section: 'Agents',
    })),
  ];
}

/**
 * The product's command palette: ⌘K / Ctrl+K from anywhere, or the header's
 * Search button. Every command is also reachable from the sidebar or a page —
 * the palette is the fast route, never the only one.
 */
export function AppCommands({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <CommandPalette
      label="Search and commands"
      placeholder="Search agents, pages and actions…"
      // Built only while open: the list reads the data as it is right now.
      commands={isOpen ? buildCommands() : []}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onAction={(id) => navigate(id.slice('route:'.length) as Route)}
    />
  );
}
