import { useState } from 'react';
import { Badge, Button, Icon, Popover, Select, Toggle } from 'ionbase-ui';
import { SlidersHorizontal } from 'ionbase-icons/icons/sliders-horizontal';

import {
  useDemoSettings,
  type ForcedState,
  type Latency,
} from '../lib/demo-settings';

const STATES: { value: ForcedState; label: string }[] = [
  { value: 'live', label: 'Live data' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
  { value: 'partial', label: 'Partial failure' },
];

const LATENCIES: { value: string; label: string }[] = [
  { value: '0', label: 'No delay' },
  { value: '800', label: '0.8s delay' },
  { value: '3000', label: '3s delay' },
];

/**
 * Presenter-only controls. Deliberately outside <main> and labelled as a demo
 * affordance, so they are never mistaken for part of Ionbase Ops. Folded into
 * one corner button so they stop covering the page; a forced state shows on
 * the button itself, so nobody takes a simulated outage for a real one.
 */
export function DemoControls() {
  const { theme, state, latency, update } = useDemoSettings();
  const [open, setOpen] = useState(false);
  const forced = STATES.find((s) => s.value === state);

  return (
    <aside className="demo-controls" aria-label="Demo controls">
      <Popover
        title="Demo controls"
        placement="top"
        size="sm"
        isOpen={open}
        onOpenChange={setOpen}
        content={
          <div className="demo-controls__panel">
            <Select
              size="sm"
              label="Screen state"
              options={STATES}
              value={state}
              onChange={(e) => update({ state: e.target.value as ForcedState })}
            />
            <Select
              size="sm"
              label="Simulated latency"
              options={LATENCIES}
              value={String(latency)}
              onChange={(e) =>
                update({ latency: Number(e.target.value) as Latency })
              }
            />
            <Toggle
              size="sm"
              isSelected={theme === 'dark'}
              onSelectionChange={(on) =>
                update({ theme: on ? 'dark' : 'light' })
              }
            >
              Dark mode
            </Toggle>
          </div>
        }
      >
        <Button
          variant="secondary"
          size="sm"
          className="demo-controls__trigger"
          startIcon={<Icon as={SlidersHorizontal} size="sm" />}
        >
          Demo
        </Button>
      </Popover>
      {state !== 'live' && (
        <Badge intent="warning" size="sm">
          {`Showing: ${forced?.label}`}
        </Badge>
      )}
    </aside>
  );
}
