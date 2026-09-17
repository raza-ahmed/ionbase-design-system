import { useState } from 'react';
import { Alert, Button, Checkbox, Radio, RadioGroup, Select } from 'ionbase-ui';

import { saveDefaults, type WorkspaceDefaults } from '../../data/settings';
import { useDemoSettings } from '../../lib/demo-settings';
import { SettingRow } from '../../local/SettingRow';

const MODEL_OPTIONS = [
  { value: 'swift-m', label: 'Swift M' },
  { value: 'atlas-m', label: 'Atlas M' },
  { value: 'atlas-l', label: 'Atlas L' },
  { value: 'sage-xl', label: 'Sage XL' },
];

/**
 * Save-together half of the pattern: Checkboxes and Radios, never Toggles, and a
 * save bar that exists only while something is dirty. A partial save keeps
 * what the server accepted and leaves only the refused field dirty.
 */
export function DefaultsPanel({
  initial,
}: {
  initial: WorkspaceDefaults | null;
}) {
  const settings = useDemoSettings();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<
    Partial<Record<keyof WorkspaceDefaults, string>>
  >({});
  const [announcement, setAnnouncement] = useState('');

  const disabled = !draft || saving;
  const dirtyKeys =
    draft && saved
      ? (Object.keys(draft) as (keyof WorkspaceDefaults)[]).filter(
          (k) => draft[k] !== saved[k],
        )
      : [];
  const set = (patch: Partial<WorkspaceDefaults>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveDefaults(draft, settings);
      setSaved(result.saved);
      setRejected(result.rejected);
      const refused = Object.keys(result.rejected).length;
      setAnnouncement(
        refused
          ? 'Some changes were saved. One was refused.'
          : 'Workspace defaults saved.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="demo-panel" aria-labelledby="defaults-title">
      <div>
        <h2 id="defaults-title" className="ion-text-h6">
          Workspace defaults
        </h2>
        <p className="ion-text-body-sm demo-muted">
          Applied to agents created from now on. Saved together.
        </p>
      </div>
      <p className="ion-visually-hidden" role="status">
        {announcement}
      </p>

      {error && (
        <Alert intent="error" title="Your changes weren't saved">
          {error} They're still here — try again.
        </Alert>
      )}
      {rejected.retentionDays && (
        <Alert intent="warning" title="Log retention wasn't changed">
          {rejected.retentionDays} Everything else was saved.
        </Alert>
      )}

      <SettingRow
        id="d-model"
        label="Default model"
        description="Pre-selected when someone creates an agent."
      >
        {({ labelId, descriptionId }) => (
          <Select
            size="sm"
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            options={MODEL_OPTIONS}
            value={draft?.defaultModel ?? ''}
            isDisabled={disabled}
            onChange={(e) => set({ defaultModel: e.target.value })}
          />
        )}
      </SettingRow>

      <RadioGroup
        label="Keep run logs for"
        value={draft?.retentionDays ?? ''}
        isDisabled={disabled}
        onChange={(v) =>
          set({ retentionDays: v as WorkspaceDefaults['retentionDays'] })
        }
      >
        <Radio value="30">30 days</Radio>
        <Radio value="90">90 days</Radio>
        <Radio value="365">1 year</Radio>
      </RadioGroup>

      <Checkbox
        isSelected={draft?.redactPii ?? false}
        isDisabled={disabled}
        onSelectionChange={(redactPii) => set({ redactPii })}
      >
        Redact personal data in run logs
      </Checkbox>
      <Checkbox
        isSelected={draft?.approvalForNewAgents ?? false}
        isDisabled={disabled}
        onSelectionChange={(approvalForNewAgents) =>
          set({ approvalForNewAgents })
        }
      >
        New agents ask a human before anything irreversible
      </Checkbox>

      {dirtyKeys.length > 0 && (
        <div
          className="demo-savebar"
          role="region"
          aria-label="Unsaved changes"
        >
          <span className="ion-text-body-sm">
            {dirtyKeys.length} unsaved{' '}
            {dirtyKeys.length === 1 ? 'change' : 'changes'}
          </span>
          <span className="demo-form__spacer" />
          <Button
            size="sm"
            variant="secondary"
            isDisabled={saving}
            onClick={() => {
              setDraft(saved);
              setRejected({});
              setError(null);
            }}
          >
            Discard
          </Button>
          <Button size="sm" isDisabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    </section>
  );
}
