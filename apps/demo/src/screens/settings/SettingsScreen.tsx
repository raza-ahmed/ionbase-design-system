import { useState } from 'react';
import { Alert, Button, PageHeader } from 'ionbase-ui';

import { getSettings, type WorkspaceSettings } from '../../data/settings';
import { useDemoSettings } from '../../lib/demo-settings';
import { useResource } from '../../lib/use-resource';
import { AdvancedPanel } from './AdvancedPanel';
import { DangerZone } from './DangerZone';
import { DefaultsPanel } from './DefaultsPanel';
import { NotificationsPanel } from './NotificationsPanel';

/**
 * The SettingsPanel pattern, twice over and never mixed: Notifications apply
 * immediately (Toggles), Workspace defaults save together (Checkboxes, Radios,
 * Select, a save bar). Each panel says which it is.
 */
export function SettingsScreen() {
  const settings = useDemoSettings();
  const [version, setVersion] = useState(0);
  const result = useResource(
    (signal) => getSettings(settings, signal),
    `${settings.state}|${settings.latency}|${version}`,
  );

  // Panels hold local edit state seeded from `initial`, so they remount when
  // the load lands or a reload happens.
  // Loading shows every group with its labels and the controls disabled.
  const data: WorkspaceSettings | null =
    result.status === 'ready' ? result.data : null;

  return (
    <div className="demo-page demo-page--narrow">
      <PageHeader
        titleId="page-title"
        title="Settings"
        description={`${data ? data.workspaceName : 'Workspace'} · notifications, defaults and access.`}
      />

      {result.status === 'error' ? (
        <Alert
          intent="error"
          title="Settings couldn't load"
          actions={
            <Button size="sm" variant="secondary" onClick={result.retry}>
              Try again
            </Button>
          }
        >
          {result.error.message} Nothing has changed.
        </Alert>
      ) : (
        <div
          className="demo-page"
          aria-busy={result.status === 'loading' || undefined}
        >
          {result.status === 'loading' && (
            <p className="ion-visually-hidden" role="status">
              Loading settings
            </p>
          )}
          <NotificationsPanel
            key={`n${version}${result.status}`}
            initial={data?.notifications ?? null}
          />
          <DefaultsPanel
            key={`d${version}${result.status}`}
            initial={data?.defaults ?? null}
          />
          <AdvancedPanel plan={data?.plan ?? null} />
          <DangerZone
            workspaceName={data?.workspaceName ?? null}
            scheduledFor={data?.deletionScheduledFor ?? null}
            onChanged={() => setVersion((v) => v + 1)}
          />
        </div>
      )}
    </div>
  );
}
