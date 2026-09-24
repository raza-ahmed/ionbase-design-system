import { useState } from 'react';
import { Alert, Toggle } from 'ionbase-ui';

import {
  saveNotification,
  type NotificationSettings,
} from '../../data/settings';
import { useDemoSettings } from '../../lib/demo-settings';
import { SettingRow } from '../../local/SettingRow';

const ROWS: {
  key: keyof NotificationSettings;
  label: string;
  description: string;
}[] = [
  {
    key: 'approvalEmails',
    label: 'Approval requests by email',
    description: 'When an agent pauses for a human, email the owning team.',
  },
  {
    key: 'failureAlerts',
    label: 'Failure alerts',
    description: 'When an agent fails twice in a row, notify its owner.',
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly digest',
    description: 'A Monday summary of runs, spend and approvals.',
  },
];

/** Immediate-apply half of the pattern. Optimistic, reverted on failure, announced either way. */
export function NotificationsPanel({
  initial,
}: {
  initial: NotificationSettings | null;
}) {
  const settings = useDemoSettings();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState<keyof NotificationSettings | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  async function change(
    key: keyof NotificationSettings,
    on: boolean,
    label: string,
  ) {
    if (!values) return;
    const previous = values[key];
    setValues({ ...values, [key]: on });
    setSaving(key);
    setFailure(null);
    try {
      await saveNotification(key, on, settings);
      setAnnouncement(`${label} turned ${on ? 'on' : 'off'}. Saved.`);
    } catch (e) {
      // A switch left in the new position after a failed save lies about the server.
      setValues((v) => (v ? { ...v, [key]: previous } : v));
      setFailure(
        `${label} couldn't be turned ${on ? 'on' : 'off'}. ${(e as Error).message}`,
      );
      setAnnouncement('');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="demo-panel" aria-labelledby="notifications-title">
      <div>
        <h2 id="notifications-title" className="ion-text-h6">
          Notifications
        </h2>
        <p className="ion-text-body-sm demo-muted">
          Changes apply as soon as you make them.
        </p>
      </div>
      <p className="ion-visually-hidden" role="status">
        {announcement}
      </p>
      {failure && (
        <Alert
          intent="error"
          title="Not saved"
          onDismiss={() => setFailure(null)}
          dismissLabel="Dismiss error"
        >
          {failure}
        </Alert>
      )}
      {ROWS.map((row) => (
        <SettingRow
          key={row.key}
          id={`n-${row.key}`}
          label={row.label}
          description={row.description}
        >
          {({ labelId, descriptionId }) => (
            <Toggle
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              isSelected={values?.[row.key] ?? false}
              isDisabled={!values || saving === row.key}
              onSelectionChange={(on) => void change(row.key, on, row.label)}
            />
          )}
        </SettingRow>
      ))}
    </section>
  );
}
