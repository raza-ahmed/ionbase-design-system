import { lazy, Suspense } from 'react';
import { Spinner, ToastProvider } from 'ionbase-ui';

import { DemoSettingsProvider } from './lib/demo-settings';
import { useRoute, type Route } from './lib/router';
import { AppShell } from './shell/AppShell';
import { NotFound } from './screens/NotFound';
import { CrashWhenForced, PageErrorBoundary } from './shell/PageErrorBoundary';

/*
 * One chunk per screen. The shell is eager — the PageShell pattern says never
 * block the header on a page's data, and a code chunk is data. visx, the date
 * pickers and the table only load on the screens that use them.
 */
const Overview = lazy(() =>
  import('./screens/Overview').then((m) => ({ default: m.Overview })),
);
const AgentsScreen = lazy(() =>
  import('./screens/agents/AgentsScreen').then((m) => ({
    default: m.AgentsScreen,
  })),
);
const NewAgentWizard = lazy(() =>
  import('./screens/new-agent/NewAgentWizard').then((m) => ({
    default: m.NewAgentWizard,
  })),
);
const RunsScreen = lazy(() =>
  import('./screens/runs/RunsScreen').then((m) => ({ default: m.RunsScreen })),
);
const AgentDetail = lazy(() =>
  import('./screens/agent-detail/AgentDetail').then((m) => ({
    default: m.AgentDetail,
  })),
);
const RunDetail = lazy(() =>
  import('./screens/runs/RunDetail').then((m) => ({ default: m.RunDetail })),
);
const AssistantScreen = lazy(() =>
  import('./screens/assistant/AssistantScreen').then((m) => ({
    default: m.AssistantScreen,
  })),
);
const MembersScreen = lazy(() =>
  import('./screens/members/MembersScreen').then((m) => ({
    default: m.MembersScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import('./screens/settings/SettingsScreen').then((m) => ({
    default: m.SettingsScreen,
  })),
);

/**
 * Which page a route is: an agent's Overview and Runs tabs are one page, so
 * switching between them keeps it — and its loaded data — mounted. So is
 * Members with whoever is selected: the selection is in the address, and
 * moving it must not mount the list again.
 */
function pageOf(route: Route | null): string {
  if (route === null) return 'not-found';
  if (route.startsWith('agents/'))
    return route.split('/').slice(0, 2).join('/');
  if (route.startsWith('members/')) return 'members';
  return route;
}

/** Each route's page name, for a page that crashed before it could say. */
function pageTitleOf(route: Route | null): string {
  if (route === null) return 'Page not found';
  if (route === 'agents/new') return 'New agent';
  if (route.startsWith('agents/')) return 'Agent';
  if (route.startsWith('runs/')) return 'Run';
  if (route.startsWith('members/')) return 'Members';
  const names: Record<string, string> = {
    overview: 'Overview',
    agents: 'Agents',
    runs: 'Runs',
    assistant: 'Assistant',
    members: 'Members',
    settings: 'Settings',
  };
  return names[route] ?? 'Page';
}

export function App() {
  const route = useRoute();

  return (
    <DemoSettingsProvider>
      <ToastProvider placement="top-right" label="Status messages">
        <AppShell route={route}>
          {/*
            The FullPageError pattern's crash case: caught inside the shell,
            keyed by the page so going elsewhere clears it.
          */}
          <PageErrorBoundary key={pageOf(route)} pageTitle={pageTitleOf(route)}>
            <CrashWhenForced />
            <Suspense
              fallback={
                <div className="demo-page" aria-busy="true">
                  <Spinner label="Loading page" />
                </div>
              }
            >
              {route === 'overview' && <Overview />}
              {route === 'agents' && <AgentsScreen />}
              {route === 'agents/new' && <NewAgentWizard />}
              {route?.startsWith('agents/') && route !== 'agents/new' && (
                <AgentDetail
                  key={route.split('/')[1]}
                  id={route.split('/')[1]}
                  tab={route.endsWith('/runs') ? 'runs' : 'overview'}
                />
              )}
              {route === 'runs' && <RunsScreen />}
              {route?.startsWith('runs/') && (
                <RunDetail key={route} runId={route.slice('runs/'.length)} />
              )}
              {route === 'assistant' && <AssistantScreen />}
              {(route === 'members' || route?.startsWith('members/')) && (
                <MembersScreen selectedId={route.split('/')[1] ?? null} />
              )}
              {route === 'settings' && <SettingsScreen />}
              {route === null && <NotFound />}
            </Suspense>
          </PageErrorBoundary>
        </AppShell>
      </ToastProvider>
    </DemoSettingsProvider>
  );
}
