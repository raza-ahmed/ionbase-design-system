import { ToastProvider } from 'ionbase-ui';

import { DemoSettingsProvider } from './lib/demo-settings';
import { useRoute } from './lib/router';
import { AppShell } from './shell/AppShell';
import { Overview } from './screens/Overview';
import { NotFound, Placeholder } from './screens/Placeholder';

export function App() {
  const route = useRoute();

  return (
    <DemoSettingsProvider>
      <ToastProvider placement="top-right">
        <AppShell route={route}>
          {route === 'overview' && <Overview />}
          {route === 'agents' && <Placeholder title="Agents" phase={2} />}
          {route === 'runs' && <Placeholder title="Runs" phase={3} />}
          {route === 'assistant' && <Placeholder title="Assistant" phase={3} />}
          {route === 'settings' && <Placeholder title="Settings" phase={2} />}
          {route === null && <NotFound />}
        </AppShell>
      </ToastProvider>
    </DemoSettingsProvider>
  );
}
