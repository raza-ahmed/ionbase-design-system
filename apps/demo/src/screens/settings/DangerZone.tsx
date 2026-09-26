import { useState } from 'react';
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Divider,
  Input,
  Modal,
  PasswordInput,
  SettingRow,
} from 'ionbase-ui';

import { scheduleDeletion } from '../../data/settings';
import { formatDay } from '../../lib/dates';
import { useDemoSettings } from '../../lib/demo-settings';

/**
 * DestructiveConfirm at its highest consequence: the workspace name must be
 * typed exactly, and the password entered again. The demo accepts any
 * password; a real app checks it on the server with the request.
 */
export function DangerZone({
  workspaceName,
  scheduledFor,
  onChanged,
}: {
  workspaceName: string | null;
  scheduledFor: string | null;
  onChanged: () => void;
}) {
  const settings = useDemoSettings();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(schedule: boolean) {
    setPending(true);
    setError(null);
    try {
      await scheduleDeletion(schedule, settings);
      setOpen(false);
      setTyped('');
      setPassword('');
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card title="Danger zone" intent="danger">
      {scheduledFor && (
        <Alert
          intent="warning"
          title={`${workspaceName} will be deleted on ${formatDay(scheduledFor)}`}
          actions={
            <Button
              size="sm"
              variant="secondary"
              isDisabled={pending}
              onClick={() => void run(false)}
            >
              {pending ? 'Cancelling…' : 'Cancel deletion'}
            </Button>
          }
        >
          Agents are paused until then. Cancelling restores everything.
        </Alert>
      )}
      {error && !open && (
        <Alert intent="error" title="Nothing changed">
          {error}
        </Alert>
      )}

      <Divider />

      <SettingRow
        id="danger-delete"
        label="Delete workspace"
        description="Removes every agent, run log and knowledge file after 7 days."
      >
        <Button
          variant="destructive"
          size="sm"
          isDisabled={!workspaceName || Boolean(scheduledFor)}
          onClick={() => setOpen(true)}
        >
          Delete workspace…
        </Button>
      </SettingRow>

      {open && workspaceName && (
        <Modal
          isOpen
          size="sm"
          title={`Delete ${workspaceName}`}
          onOpenChange={(o) => !o && !pending && setOpen(false)}
          showClose={!pending}
          footer={
            <ButtonGroup stack>
              <Button
                variant="secondary"
                isDisabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                isDisabled={
                  pending || typed !== workspaceName || password === ''
                }
                onClick={() => void run(true)}
              >
                {pending ? 'Scheduling…' : 'Delete workspace'}
              </Button>
            </ButtonGroup>
          }
        >
          <div className="demo-modal-body">
            {error && (
              <Alert intent="error" title="Nothing was scheduled">
                {error} You can try again.
              </Alert>
            )}
            <p className="ion-text-body-sm">
              <strong>Lost after 7 days:</strong> all agents, run logs,
              knowledge files and API keys. <strong>Kept:</strong> invoices and
              the audit log, for 7 years, as the law requires.
            </p>
            <Input
              size="sm"
              label={`Type “${workspaceName}” to confirm`}
              value={typed}
              onChange={setTyped}
              autoComplete="off"
              isDisabled={pending}
            />
            <PasswordInput
              size="sm"
              label="Your password"
              description="Asked again because this deletes the workspace."
              value={password}
              onChange={setPassword}
              isDisabled={pending}
            />
          </div>
        </Modal>
      )}
    </Card>
  );
}
