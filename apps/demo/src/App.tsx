import { lazy, Suspense } from 'react';
import { Spinner, ToastProvider } from 'ionbase-ui';

import { DemoSettingsProvider } from './lib/demo-settings';
import { useRoute } from './lib/router';
import { AppShell } from './shell/AppShell';
import { NotFound } from './screens/NotFound';

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
const SettingsScreen = lazy(() =>
  import('./screens/settings/SettingsScreen').then((m) => ({
    default: m.SettingsScreen,
  })),
);

export function App() {
  const route = useRoute();

  return (
    <DemoSettingsProvider>
      <ToastProvider placement="top-right" label="Status messages">
        <AppShell route={route}>
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
            {route === 'settings' && <SettingsScreen />}
            {route === null && <NotFound />}
          </Suspense>
        </AppShell>
      </ToastProvider>
    </DemoSettingsProvider>
  );
}
