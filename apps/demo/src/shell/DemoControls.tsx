import { Badge, Select, Toggle } from 'ionbase-ui';

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
 * Presenter-only bar. Deliberately outside <main> and labelled as a demo
 * affordance, so it is never mistaken for part of Ionbase Ops.
 */
export function DemoControls() {
  const { theme, state, latency, update } = useDemoSettings();

  return (
    <aside className="demo-controls" aria-label="Demo controls">
      <Badge intent="information" size="sm" shape="rounded">
        Demo
      </Badge>
      <Select
        size="sm"
        aria-label="Screen state"
        options={STATES}
        value={state}
        onChange={(e) => update({ state: e.target.value as ForcedState })}
      />
      <Select
        size="sm"
        aria-label="Simulated latency"
        options={LATENCIES}
        value={String(latency)}
        onChange={(e) => update({ latency: Number(e.target.value) as Latency })}
      />
      <Toggle
        size="sm"
        isSelected={theme === 'dark'}
        onSelectionChange={(on) => update({ theme: on ? 'dark' : 'light' })}
      >
        Dark mode
      </Toggle>
    </aside>
  );
}
