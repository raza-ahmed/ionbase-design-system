import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button, Tour, type TourProps, type TourStep } from 'ionbase-ui';

const meta: Meta<typeof Tour> = {
  title: 'Components/Tour',
  component: Tour,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Coachmarks in a sequence: one at a time, each pointing at its target, with "2 of 4", Back, Next, and Done on the last. The close button and Escape end it, and focus goes back to what started it.\n\n**Steps are data:** each names its target by `id`. A target that is not on the page when the tour starts is skipped, and the count is of the steps that remain. **Finished is not dismissed:** `onComplete` fires for Done only.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tour>;

const STEPS: TourStep[] = [
  {
    target: 't-range',
    title: 'Pick the period',
    body: 'Every figure on the page follows the dates chosen here.',
  },
  {
    target: 't-hidden',
    title: 'Hidden on this page',
    body: 'Not drawn, so not a step.',
  },
  {
    target: 't-runs',
    title: 'Runs, at a glance',
    body: 'How many ran, and how many needed a person.',
  },
  {
    target: 't-tokens',
    title: 'Where the tokens went',
    body: 'Open a team to see its agents.',
    placement: 'top',
  },
];

/** A page with three targets and one that is not drawn. */
function Page({
  steps = STEPS,
  ...props
}: Partial<TourProps> & { steps?: TourStep[] }) {
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [stepsSeen, setStepsSeen] = useState<number[]>([]);
  return (
    <div style={{ display: 'grid', gap: 16, padding: '1rem 1rem 16rem' }}>
      <Button size="sm" variant="secondary" onPress={() => setOpen(true)}>
        Take the tour
      </Button>
      <div id="t-range" style={{ padding: 8 }}>
        Last 7 days
      </div>
      <div id="t-hidden" style={{ display: 'none' }}>
        Not drawn
      </div>
      <div id="t-runs" style={{ padding: 8 }}>
        412 runs
      </div>
      <div id="t-tokens" style={{ padding: 8, marginTop: 160 }}>
        Token use by team
      </div>
      <output data-testid="completed">{completed}</output>
      <output data-testid="steps">{stepsSeen.join(' ')}</output>
      <Tour
        steps={steps}
        isOpen={open}
        onOpenChange={setOpen}
        onComplete={() => setCompleted((n) => n + 1)}
        onStepChange={(i) => setStepsSeen((s) => [...s, i])}
        {...props}
      />
    </div>
  );
}

const doc = () => within(document.body);
const start = (canvas: ReturnType<typeof within>) =>
  userEvent.click(canvas.getByRole('button', { name: 'Take the tour' }));
const step = async (name: string) => {
  const dialog = await doc().findByRole('dialog', { name });
  await waitFor(() => expect(document.activeElement).toBe(dialog));
  return dialog;
};

export const Default: Story = { render: () => <Page /> };

/**
 * Started from a button, it opens at the first step with focus in it, its
 * target ringed, and says where the reader is — of the three steps whose
 * targets are drawn, not the four listed.
 */
export const StartsAtTheFirstStep: Story = {
  render: () => <Page />,
  play: async ({ canvas }) => {
    await start(canvas);
    const dialog = await step('Pick the period');
    await expect(dialog).toHaveTextContent('1 of 3');
    await expect(document.getElementById('t-range')).toHaveAttribute(
      'data-ion-coachmark-target',
    );
    // The first step has no Back.
    await expect(
      within(dialog).queryByRole('button', { name: 'Back' }),
    ).toBeNull();
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * Next moves on — a new dialog, focused and read out, with the ring moved to
 * its target — skipping the step that is not drawn; Back goes back; Done on
 * the last finishes it, calls `onComplete` once, and gives focus back.
 */
export const NextBackAndDone: Story = {
  render: () => <Page />,
  play: async ({ canvas }) => {
    await start(canvas);
    let dialog = await step('Pick the period');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    dialog = await step('Runs, at a glance');
    await expect(dialog).toHaveTextContent('2 of 3');
    await expect(document.getElementById('t-runs')).toHaveAttribute(
      'data-ion-coachmark-target',
    );
    await expect(document.getElementById('t-range')).not.toHaveAttribute(
      'data-ion-coachmark-target',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
    dialog = await step('Pick the period');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    dialog = await step('Runs, at a glance');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    dialog = await step('Where the tokens went');
    await expect(dialog).toHaveTextContent('3 of 3');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(canvas.getByTestId('completed')).toHaveTextContent('1');
    // onStepChange gets indexes in `steps`: 2 and 3, never the skipped 1.
    await expect(canvas.getByTestId('steps')).toHaveTextContent('2 0 2 3');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        canvas.getByRole('button', { name: 'Take the tour' }),
      ),
    );
    await expect(
      document.querySelector('[data-ion-coachmark-target]'),
    ).toBeNull();
  },
};

/** End tour and Escape end it without completing it, and give focus back. */
export const EndingIsNotCompleting: Story = {
  render: () => <Page />,
  play: async ({ canvas }) => {
    await start(canvas);
    let dialog = await step('Pick the period');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'End tour' }),
    );
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(canvas.getByTestId('completed')).toHaveTextContent('0');
    const asker = canvas.getByRole('button', { name: 'Take the tour' });
    await waitFor(() => expect(document.activeElement).toBe(asker));

    // Started again, it begins at the first step, not where it was left.
    await start(canvas);
    dialog = await step('Pick the period');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    await step('Runs, at a glance');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(canvas.getByTestId('completed')).toHaveTextContent('0');
    await waitFor(() => expect(document.activeElement).toBe(asker));
    await start(canvas);
    await step('Pick the period');
    await userEvent.keyboard('{Escape}');
  },
};

/** One step is no sequence: no "1 of 1", and its button is Done. */
export const OneStepHasNoCount: Story = {
  render: () => <Page steps={[STEPS[0]]} />,
  play: async ({ canvas }) => {
    await start(canvas);
    const dialog = await step('Pick the period');
    await expect(dialog).not.toHaveTextContent(/of 1/);
    await expect(
      within(dialog).getByRole('button', { name: 'Done' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

/** Every string is `labels`', and the count arrives as numbers. */
export const LabelsAndTheCount: Story = {
  render: () => (
    <Page
      labels={{
        next: 'Onward',
        back: 'Return',
        done: 'Finish',
        close: 'Stop the tour',
        progress: (current, total) => `Step ${current}/${total}`,
      }}
    />
  ),
  play: async ({ canvas }) => {
    await start(canvas);
    let dialog = await step('Pick the period');
    await expect(dialog).toHaveTextContent('Step 1/3');
    await expect(
      within(dialog).getByRole('button', { name: 'Stop the tour' }),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Onward' }),
    );
    dialog = await step('Runs, at a glance');
    await expect(
      within(dialog).getByRole('button', { name: 'Return' }),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Onward' }),
    );
    dialog = await step('Where the tokens went');
    await expect(
      within(dialog).getByRole('button', { name: 'Finish' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

/** With no target on the page, nothing opens. */
export const NoTargetsNoTour: Story = {
  render: () => <Page steps={[{ target: 'nowhere', title: 'Nothing here' }]} />,
  play: async ({ canvas }) => {
    await start(canvas);
    await expect(doc().queryByRole('dialog')).toBeNull();
  },
};
