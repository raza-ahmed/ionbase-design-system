import { useState } from 'react';
import { Alert, Button, ButtonGroup, Calendar, Modal } from 'ionbase-ui';

import { addDays, formatDay, today } from '../../lib/dates';

/**
 * Pause until a day: the day is the dialog's whole question, and it is
 * chosen by where it falls — after the weekend, before month end — so the
 * month is shown in the dialog, not behind a DatePicker's popover over it.
 * From tomorrow, for up to 90 days; the button names the day once one is
 * picked.
 */
export function PauseUntilModal({
  agentName,
  onPause,
  onClose,
}: {
  agentName: string;
  onPause: (resumesOn: string) => Promise<void>;
  onClose: () => void;
}) {
  const [day, setDay] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = today();

  async function pause() {
    if (!day) return;
    setPending(true);
    setError(null);
    try {
      await onPause(day);
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <Modal
      isOpen
      size="sm"
      title={`Pause ${agentName}`}
      onOpenChange={(o) => !o && !pending && onClose()}
      showClose={!pending}
      footer={
        <ButtonGroup stack>
          <Button variant="secondary" isDisabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button isDisabled={!day || pending} onClick={() => void pause()}>
            {pending
              ? 'Pausing…'
              : day
                ? `Pause until ${formatDay(day)}`
                : 'Pause until…'}
          </Button>
        </ButtonGroup>
      }
    >
      <div className="demo-modal-body">
        {error && (
          <Alert intent="error" title="It was not paused">
            {error} You can try again.
          </Alert>
        )}
        <Calendar
          label="Resume on"
          description="It resumes at the start of the day, UTC. Resume it sooner from this page."
          value={day}
          onChange={setDay}
          minValue={addDays(start, 1)}
          maxValue={addDays(start, 90)}
          isDisabled={pending}
        />
      </div>
    </Modal>
  );
}
