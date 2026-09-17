import { ToastProvider } from 'ionbase-ui';

import { DemoSettingsProvider } from './lib/demo-settings';
import { useRoute } from './lib/router';
import { AppShell } from './shell/AppShell';
import { Overview } from './screens/Overview';
import { AgentsScreen } from './screens/agents/AgentsScreen';
import { AssistantScreen } from './screens/assistant/AssistantScreen';
import { NewAgentWizard } from './screens/new-agent/NewAgentWizard';
import { NotFound } from './screens/NotFound';
import { RunDetail } from './screens/runs/RunDetail';
import { RunsScreen } from './screens/runs/RunsScreen';
import { SettingsScreen } from './screens/settings/SettingsScreen';

export function App() {
  const route = useRoute();

  return (
    <DemoSettingsProvider>
      <ToastProvider placement="top-right">
        <AppShell route={route}>
          {route === 'overview' && <Overview />}
          {route === 'agents' && <AgentsScreen />}
          {route === 'agents/new' && <NewAgentWizard />}
          {route === 'runs' && <RunsScreen />}
          {route?.startsWith('runs/') && (
            <RunDetail key={route} runId={route.slice('runs/'.length)} />
          )}
          {route === 'assistant' && <AssistantScreen />}
          {route === 'settings' && <SettingsScreen />}
          {route === null && <NotFound />}
        </AppShell>
      </ToastProvider>
    </DemoSettingsProvider>
  );
}
