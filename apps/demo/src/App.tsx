import { ToastProvider } from 'ionbase-ui';

import { DemoSettingsProvider } from './lib/demo-settings';
import { useRoute } from './lib/router';
import { AppShell } from './shell/AppShell';
import { Overview } from './screens/Overview';
import { AgentsScreen } from './screens/agents/AgentsScreen';
import { NewAgentWizard } from './screens/new-agent/NewAgentWizard';
import { NotFound, Placeholder } from './screens/Placeholder';
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
          {route === 'runs' && <Placeholder title="Runs" phase={3} />}
          {route === 'assistant' && <Placeholder title="Assistant" phase={3} />}
          {route === 'settings' && <SettingsScreen />}
          {route === null && <NotFound />}
        </AppShell>
      </ToastProvider>
    </DemoSettingsProvider>
  );
}
