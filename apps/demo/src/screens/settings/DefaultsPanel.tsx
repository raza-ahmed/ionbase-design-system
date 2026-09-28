import { useState } from 'react';
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  CheckboxGroup,
  DualListbox,
  Link,
  Radio,
  RadioGroup,
  Select,
  SettingRow,
  Toggletip,
} from 'ionbase-ui';

import { listMemberOptions } from '../../data/members';
import { saveDefaults, type WorkspaceDefaults } from '../../data/settings';
import { useDemoSettings } from '../../lib/demo-settings';
import { href } from '../../lib/router';

const MODEL_OPTIONS = [
  { value: 'swift-m', label: 'Swift M' },
  { value: 'atlas-m', label: 'Atlas M' },
  { value: 'atlas-l', label: 'Atlas L' },
  { value: 'sage-xl', label: 'Sage XL' },
];

const SAFEGUARDS = ['redactPii', 'approvalForNewAgents'] as const;

/* Everyone who can be asked. An invitation not yet accepted cannot answer. */
const APPROVER_OPTIONS = listMemberOptions().map((m) => ({
  value: m.id,
  label: m.name,
  description:
    m.lastActiveMinutesAgo === null ? 'Invited, not joined yet' : m.team,
  isDisabled: m.lastActiveMinutesAgo === null,
}));

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
  // Checked on save, then as it changes — the Form pattern's rule.
  const [triedToSave, setTriedToSave] = useState(false);
  const noApprovers = !!draft && draft.approvers.length === 0;

  const disabled = !draft || saving;
  const dirtyKeys =
    draft && saved
      ? (Object.keys(draft) as (keyof WorkspaceDefaults)[]).filter(
          // By value: the approvers are a list, a new one on every change.
          (k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k]),
        )
      : [];
  const set = (patch: Partial<WorkspaceDefaults>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save() {
    if (!draft) return;
    if (noApprovers) {
      // Refused here, not by the server: the field says why, and focus goes
      // to the list that needs an entry.
      setTriedToSave(true);
      setAnnouncement('');
      document
        .querySelectorAll<HTMLElement>('#d-approvers [role="listbox"]')[1]
        ?.focus();
      return;
    }
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
    <Card
      title="Workspace defaults"
      description="Applied to agents created from now on. Saved together."
    >
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
        <Select
          size="sm"
          options={MODEL_OPTIONS}
          value={draft?.defaultModel ?? ''}
          isDisabled={disabled}
          onChange={(e) => set({ defaultModel: e.target.value })}
        />
      </SettingRow>

      <RadioGroup
        label={
          <>
            Keep run logs for{' '}
            {/* Why the limit exists, and where to read more: optional, and it
                holds a link — so a Toggletip, not a Tooltip. */}
            <Toggletip aria-label="About log retention" size="sm">
              Logs past the period are deleted every night, including the
              redacted copies.{' '}
              <Link href={href('assistant')}>Ask how retention works</Link>
            </Toggletip>
          </>
        }
        description="Longer than a year needs the Enterprise plan."
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

      {/* Two booleans on the server, one question on the page: the group is
          what announces "Safeguards" with each box. */}
      <CheckboxGroup
        label="Safeguards"
        value={SAFEGUARDS.filter((k) => draft?.[k])}
        isDisabled={disabled}
        onChange={(on) =>
          set(Object.fromEntries(SAFEGUARDS.map((k) => [k, on.includes(k)])))
        }
      >
        <Checkbox value="redactPii">Redact personal data in run logs</Checkbox>
        <Checkbox value="approvalForNewAgents">
          New agents ask a human before anything irreversible
        </Checkbox>
      </CheckboxGroup>

      {/* The order is the setting: who is asked first, and who next. */}
      <DualListbox
        id="d-approvers"
        label="Approval order"
        description="Who a new agent asks when it needs approval, in this order. The next is asked if one does not answer within a day."
        options={APPROVER_OPTIONS}
        value={draft?.approvers ?? []}
        onChange={(approvers) => set({ approvers })}
        isReorderable
        isDisabled={disabled}
        isRequired
        isInvalid={triedToSave && noApprovers}
        errorMessage="Choose at least one approver."
        labels={{
          available: 'Everyone',
          selected: 'Approvers',
          add: 'Add to approvers',
          remove: 'Remove from approvers',
          empty: 'No one yet',
        }}
      />

      {dirtyKeys.length > 0 && (
        <div
          className="demo-savebar"
          role="region"
          aria-label="Unsaved changes"
        >
          <ButtonGroup
            start={
              <span className="ion-text-body-sm">
                {dirtyKeys.length} unsaved{' '}
                {dirtyKeys.length === 1 ? 'change' : 'changes'}
              </span>
            }
          >
            <Button
              size="sm"
              variant="secondary"
              isDisabled={saving}
              onClick={() => {
                setDraft(saved);
                setTriedToSave(false);
                setRejected({});
                setError(null);
              }}
            >
              Discard
            </Button>
            <Button size="sm" isDisabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </ButtonGroup>
        </div>
      )}
    </Card>
  );
}
