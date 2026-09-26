import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import {
  Button,
  InlineLoading,
  Toggle,
  type InlineLoadingStatus,
} from 'ionbase-ui';

const ALL: InlineLoadingStatus[] = ['active', 'finished', 'error'];

/** A switch that saves when flipped, with its state beside it. */
function SavingSwitch({
  fails = false,
  successDelay,
}: {
  fails?: boolean;
  successDelay?: number;
}) {
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState<InlineLoadingStatus>('inactive');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <InlineLoading
        status={status}
        successDelay={successDelay}
        onSuccess={() => setStatus('inactive')}
      />
      <Toggle
        aria-label="Failure alerts"
        isSelected={on}
        onSelectionChange={(next) => {
          if (status === 'active') return;
          setOn(next);
          setStatus('active');
          window.setTimeout(() => {
            if (fails) setOn(!next);
            setStatus(fails ? 'error' : 'finished');
          }, 200);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof InlineLoading> = {
  title: 'Components/InlineLoading',
  component: InlineLoading,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The pending → done → failed of one action, in place: "Saving…", "Saved", "Not saved" beside the control. Its `role="status"` region is rendered in every state, so each change is announced — keep it mounted and change `status`. `onSuccess` fires `successDelay` after `finished`, to go back to `inactive`; an error stays.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {ALL.map((status) => (
        <InlineLoading key={status} status={status} />
      ))}
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof InlineLoading>;

export const AllStatuses: Story = {};
export const BesideASwitch: Story = { render: () => <SavingSwitch /> };
export const WhenItFails: Story = { render: () => <SavingSwitch fails /> };

// ------------------------------------------------------------------ tests

const onSuccessSpy = fn();
const errorSpy = fn();
const cancelSpy = fn();
const firstSpy = fn();
const latestSpy = fn();

const regions = (el: HTMLElement) =>
  [...el.querySelectorAll('.ion-inline-loading')] as HTMLElement[];

/**
 * Each state has its own shape and word: an arc and "Saving…", a check and
 * "Saved", an octagon and "Not saved". The shape is hidden; the word is read.
 */
export const EachStateHasAShapeAndAWord: Story = {
  play: async ({ canvasElement }) => {
    const [active, finished, error] = regions(canvasElement);
    await expect(active).toHaveTextContent(/^Saving…$/);
    await expect(finished).toHaveTextContent(/^Saved$/);
    await expect(error).toHaveTextContent(/^Not saved$/);
    await expect(active.querySelector('.ion-status')).toHaveClass(
      'ion-status--progress',
    );
    await expect(finished.querySelector('.ion-status')).toHaveClass(
      'ion-status--success',
    );
    await expect(error.querySelector('.ion-status')).toHaveClass(
      'ion-status--error',
    );
    for (const r of regions(canvasElement))
      await expect(r.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
  },
};

/**
 * Inactive is an empty live region: there, so the next words are announced,
 * and taking no room beside the control.
 */
export const InactiveIsAnEmptyRegion: Story = {
  render: () => <InlineLoading status="inactive" />,
  play: async ({ canvas, canvasElement }) => {
    const region = canvas.getByRole('status');
    await expect(region).toHaveTextContent(/^$/);
    await expect(region.getBoundingClientRect().width).toBe(0);
    await expect(regions(canvasElement)).toHaveLength(1);
  },
};

/**
 * One region through the whole action: the element with `role="status"` is
 * the same one before, during and after, so each change of words is
 * announced — and the error rolls the switch back.
 */
export const TheRegionOutlivesEachState: Story = {
  render: () => <SavingSwitch fails />,
  play: async ({ canvas }) => {
    const region = canvas.getByRole('status');
    await userEvent.click(canvas.getByRole('switch').closest('label')!);
    await expect(canvas.getByRole('status')).toBe(region);
    await expect(region).toHaveTextContent('Saving…');
    await waitFor(() => expect(region).toHaveTextContent('Not saved'));
    await expect(canvas.getByRole('status')).toBe(region);
    await expect(canvas.getByRole('switch')).not.toBeChecked();
  },
};

/**
 * "Saved" goes by itself: `onSuccess` fires after `successDelay`, not before,
 * and the switch was never disabled — focus stays on it throughout.
 */
export const SavedGoesAwayByItself: Story = {
  render: () => <SavingSwitch successDelay={400} />,
  play: async ({ canvas }) => {
    const region = canvas.getByRole('status');
    const toggle = canvas.getByRole('switch');
    toggle.focus();
    await userEvent.keyboard(' ');
    await expect(toggle).toHaveFocus();
    await expect(toggle).toBeEnabled();
    await waitFor(() => expect(region).toHaveTextContent('Saved'));
    await expect(toggle).toHaveFocus();
    await new Promise((r) => setTimeout(r, 200));
    await expect(region).toHaveTextContent('Saved');
    await waitFor(() => expect(region).toHaveTextContent(/^$/), {
      timeout: 1000,
    });
    await expect(toggle).toBeChecked();
  },
};

/** A re-render does not restart the delay, even with a new callback each time. */
export const ReRendersDoNotRestartTheDelay: Story = {
  render: () => {
    function Ticking({ onSuccess }: { onSuccess: () => void }) {
      const [tick, setTick] = useState(0);
      useEffect(() => {
        const t = window.setInterval(() => setTick((n) => n + 1), 50);
        return () => window.clearInterval(t);
      }, []);
      return (
        <InlineLoading
          status="finished"
          successDelay={300}
          data-tick={tick}
          onSuccess={() => onSuccess()}
        />
      );
    }
    return <Ticking onSuccess={onSuccessSpy} />;
  },
  play: async () => {
    onSuccessSpy.mockClear();
    await waitFor(() => expect(onSuccessSpy).toHaveBeenCalledTimes(1), {
      timeout: 800,
    });
  },
};

/** The callback that runs is the latest one, not the one given at `finished`. */
export const TheLatestCallbackRuns: Story = {
  render: () => {
    function Swap() {
      const [swapped, setSwapped] = useState(false);
      return (
        <>
          <InlineLoading
            status="finished"
            successDelay={300}
            onSuccess={swapped ? latestSpy : firstSpy}
          />
          <Button onPress={() => setSwapped(true)}>Swap</Button>
        </>
      );
    }
    return <Swap />;
  },
  play: async ({ canvas }) => {
    firstSpy.mockClear();
    latestSpy.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Swap' }));
    await waitFor(() => expect(latestSpy).toHaveBeenCalledTimes(1), {
      timeout: 800,
    });
    await expect(firstSpy).not.toHaveBeenCalled();
  },
};

/** An error stays: a failure that vanishes was never reported. */
export const AnErrorStays: Story = {
  render: () => (
    <InlineLoading status="error" successDelay={50} onSuccess={errorSpy} />
  ),
  play: async ({ canvas }) => {
    errorSpy.mockClear();
    await new Promise((r) => setTimeout(r, 300));
    await expect(errorSpy).not.toHaveBeenCalled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Not saved');
  },
};

/** Leaving `finished` before the delay cancels it. */
export const LeavingFinishedCancelsTheDelay: Story = {
  render: () => {
    function Flip({ onSuccess }: { onSuccess: () => void }) {
      const [status, setStatus] = useState<InlineLoadingStatus>('finished');
      return (
        <>
          <InlineLoading
            status={status}
            successDelay={300}
            onSuccess={onSuccess}
          />
          <Button onPress={() => setStatus('active')}>Save again</Button>
        </>
      );
    }
    return <Flip onSuccess={cancelSpy} />;
  },
  play: async ({ canvas }) => {
    cancelSpy.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Save again' }));
    await new Promise((r) => setTimeout(r, 500));
    await expect(cancelSpy).not.toHaveBeenCalled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Saving…');
  },
};

export const LabelsAreTranslatable: Story = {
  render: () => (
    <>
      <InlineLoading activeLabel="Wird gespeichert…" />
      <InlineLoading status="finished" finishedLabel="Gespeichert" />
      <InlineLoading status="error" errorLabel="Nicht gespeichert" />
    </>
  ),
  play: async ({ canvasElement }) => {
    await expect(regions(canvasElement).map((r) => r.textContent)).toEqual([
      'Wird gespeichert…',
      'Gespeichert',
      'Nicht gespeichert',
    ]);
  },
};

/** 16px shapes by default, beside a small control; 20px at `md`. */
export const SizesAre16And20: Story = {
  render: () => (
    <>
      <InlineLoading />
      <InlineLoading size="md" />
    </>
  ),
  play: async ({ canvasElement }) => {
    const widths = regions(canvasElement).map(
      (r) => r.querySelector('svg')!.getBoundingClientRect().width,
    );
    await expect(widths).toEqual([16, 20]);
  },
};

/** Other attributes reach the region; `role` stays `status`. */
export const PassesAttributesThrough: Story = {
  render: () => (
    <InlineLoading data-testid="l" className="extra" id="save-state" />
  ),
  play: async ({ canvas }) => {
    const l = canvas.getByTestId('l');
    await expect(l).toHaveClass('ion-inline-loading', 'extra');
    await expect(l).toHaveAttribute('id', 'save-state');
    await expect(l).toHaveAttribute('role', 'status');
  },
};
