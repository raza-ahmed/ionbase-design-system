import { useState } from 'react';
import { Alert, Button, ButtonGroup, Input, Modal } from 'ionbase-ui';

import { deleteAgents, type Agent, type DeleteResult } from '../../data/agents';
import { useDemoSettings } from '../../lib/demo-settings';

/**
 * The DestructiveConfirm pattern. Title names the action and the object; the
 * body says what is lost, then what is kept; cancel precedes delete in the DOM;
 * a failure keeps the dialog open; a partial failure narrows the retry to what
 * failed. Typed confirmation only for bulk deletes, where one click removes
 * many — friction everywhere is friction nobody reads.
 */
export function DeleteAgentsModal({
  agents: initial,
  onClose,
  onDeleted,
}: {
  agents: Agent[];
  onClose: () => void;
  onDeleted: (result: DeleteResult) => void;
}) {
  const settings = useDemoSettings();
  const [targets, setTargets] = useState(initial);
  const [phase, setPhase] = useState<'idle' | 'deleting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState<DeleteResult | null>(null);
  const [typed, setTyped] = useState('');

  const bulk = targets.length > 1;
  const noun = bulk ? `${targets.length} agents` : targets[0].name;
  const phrase = `delete ${targets.length} agents`;
  const confirmed = !bulk || typed.trim().toLowerCase() === phrase;
  const deleting = phase === 'deleting';

  async function confirm() {
    setPhase('deleting');
    setError(null);
    try {
      const result = await deleteAgents(
        targets.map((a) => a.id),
        settings,
      );
      if (result.failed.length === 0) {
        onDeleted(result);
        onClose();
        return;
      }
      onDeleted(result);
      setPartial(result);
      setTargets(
        targets.filter((a) => result.failed.some((f) => f.id === a.id)),
      );
      setTyped('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhase('idle');
    }
  }

  return (
    <Modal
      isOpen
      size="sm"
      title={partial ? `Retry deleting ${noun}` : `Delete ${noun}`}
      onOpenChange={(open) => !open && !deleting && onClose()}
      showClose={!deleting}
      footer={
        <ButtonGroup stack>
          <Button variant="secondary" isDisabled={deleting} onClick={onClose}>
            {partial ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant="destructive"
            isDisabled={deleting || !confirmed}
            onClick={() => void confirm()}
          >
            {deleting ? 'Deleting…' : `Delete ${noun}`}
          </Button>
        </ButtonGroup>
      }
    >
      <div className="demo-modal-body">
        {partial && (
          <Alert
            intent="warning"
            title={`Deleted ${partial.deleted.length} of ${
              partial.deleted.length + partial.failed.length
            }`}
          >
            <ul className="demo-list">
              {partial.failed.map((f) => (
                <li key={f.id}>
                  <strong>{f.name}</strong>: {f.reason}
                </li>
              ))}
            </ul>
          </Alert>
        )}
        {error && (
          <Alert intent="error" title="Nothing was deleted">
            {error} You can try again.
          </Alert>
        )}

        <p className="ion-text-body-sm">
          <strong>Lost:</strong> run history, schedules and approval rules{' '}
          {bulk ? 'for these agents' : 'for this agent'}. <strong>Kept:</strong>{' '}
          audit log entries and anything already delivered.
        </p>

        {bulk && (
          <>
            <ul className="demo-list ion-text-body-sm">
              {targets.slice(0, 5).map((a) => (
                <li key={a.id}>{a.name}</li>
              ))}
              {targets.length > 5 && <li>and {targets.length - 5} more</li>}
            </ul>
            <Input
              size="sm"
              label={`Type “${phrase}” to confirm`}
              value={typed}
              onChange={setTyped}
              autoComplete="off"
              isDisabled={deleting}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
