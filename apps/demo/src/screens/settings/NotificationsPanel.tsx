import { useState } from 'react';
import {
  Alert,
  Card,
  InlineLoading,
  SettingRow,
  Toggle,
  type InlineLoadingStatus,
} from 'ionbase-ui';

import {
  saveNotification,
  type NotificationSettings,
} from '../../data/settings';
import { useDemoSettings } from '../../lib/demo-settings';

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

/**
 * Immediate-apply half of the pattern. Optimistic, reverted on failure, and
 * each row says how its save went beside its switch — Saving…, Saved, Not
 * saved — with InlineLoading, which is mounted with the row so every change
 * is announced. The switch stays enabled while it saves: disabling it would
 * throw a keyboard user's focus to the top of the page. A press mid-save is
 * ignored instead.
 */
export function NotificationsPanel({
  initial,
}: {
  initial: NotificationSettings | null;
}) {
  const settings = useDemoSettings();
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<
    Partial<Record<keyof NotificationSettings, InlineLoadingStatus>>
  >({});
  const [failure, setFailure] = useState<string | null>(null);

  async function change(
    key: keyof NotificationSettings,
    on: boolean,
    label: string,
  ) {
    if (!values || status[key] === 'active') return;
    const previous = values[key];
    setValues({ ...values, [key]: on });
    setStatus((s) => ({ ...s, [key]: 'active' }));
    setFailure(null);
    try {
      await saveNotification(key, on, settings);
      setStatus((s) => ({ ...s, [key]: 'finished' }));
    } catch (e) {
      // A switch left in the new position after a failed save lies about the server.
      setValues((v) => (v ? { ...v, [key]: previous } : v));
      setFailure(
        `${label} couldn't be turned ${on ? 'on' : 'off'}. ${(e as Error).message}`,
      );
      setStatus((s) => ({ ...s, [key]: 'error' }));
    }
  }

  return (
    <Card
      title="Notifications"
      description="Changes apply as soon as you make them."
    >
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
            <span className="demo-inline-save">
              <Toggle
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                isSelected={values?.[row.key] ?? false}
                isDisabled={!values}
                onSelectionChange={(on) => void change(row.key, on, row.label)}
              />
              <InlineLoading
                status={status[row.key] ?? 'inactive'}
                onSuccess={() =>
                  setStatus((s) => ({ ...s, [row.key]: 'inactive' }))
                }
              />
            </span>
          )}
        </SettingRow>
      ))}
    </Card>
  );
}
