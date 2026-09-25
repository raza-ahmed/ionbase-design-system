import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { DateRangePicker } from 'ionbase-ui';
import type { DateRange } from 'ionbase-ui';

const meta: Meta<typeof DateRangePicker> = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
  /*
   * Wider than DatePicker's canvas and with room below: two fields side by side
   * and a two-month calendar under them. `usePopover` flips the overlay above
   * the trigger when there is no room under it, and a canvas with no room tests
   * the flipped case by accident.
   */
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '26rem', paddingBottom: '28rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Two segmented date fields sharing one calendar.\n\n**Not two `DatePicker`s side by side.** Two independent pickers cannot stop the end preceding the start, cannot draw the band between the ends, and make the user reconcile two calendars from memory. `useDateRangePicker` owns both ends: the second click completes the range in whichever order the two dates fall.\n\n**The value commits live — there is no Apply button.** `onChange` fires the moment the second end lands and the calendar closes. A draft model would make Escape and an outside click silently discard a selection the user watched themselves make, and there is no way to tell those gestures apart from "I am done". Clear stays, because clearing has no other affordance.\n\n**Relative presets must be functions.** A literal `{ start, end }` is evaluated once, when the module is first imported, so "Last 7 days" becomes seven days before whenever the tab was opened.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DateRangePicker>;

const overlay = () => within(document.body);

const open = async (canvas: ReturnType<typeof within>) =>
  userEvent.click(canvas.getByRole('button', { name: 'Open calendar' }));

/*
 * Relative presets, written as functions — which is the whole point of the
 * shape. Built from the browser's own today rather than from a fixed date, so
 * the story demonstrates the behaviour a consumer will actually get.
 */
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const presets = [
  {
    label: 'Today',
    value: () => ({ start: iso(new Date()), end: iso(new Date()) }),
  },
  {
    label: 'Last 7 days',
    value: (): DateRange => ({ start: iso(daysAgo(6)), end: iso(new Date()) }),
  },
  {
    label: 'Last 30 days',
    value: (): DateRange => ({ start: iso(daysAgo(29)), end: iso(new Date()) }),
  },
  {
    label: 'Month to date',
    value: (): DateRange => {
      const now = new Date();
      return {
        start: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: iso(now),
      };
    },
  },
  {
    label: 'Year to date',
    value: (): DateRange => {
      const now = new Date();
      return { start: iso(new Date(now.getFullYear(), 0, 1)), end: iso(now) };
    },
  },
];

export const Default: Story = {
  args: {
    label: 'Reporting period',
    defaultValue: { start: '2026-04-06', end: '2026-04-20' },
    description: 'Both ends included.',
  },
};

export const Empty: Story = {
  args: { label: 'Reporting period', description: 'No period selected yet.' },
};

/** The Stripe-style shortcut rail, which is what `presets` is for. */
export const WithPresets: Story = {
  args: { ...Default.args, presets },
};

export const Small: Story = { args: { ...Default.args, size: 'sm' } };
export const Large: Story = { args: { ...Default.args, size: 'lg' } };

/** One month, for a range that genuinely sits inside one. */
export const OneMonth: Story = {
  args: { ...Default.args, visibleMonths: 1 },
};

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    errorMessage: 'The period cannot be longer than 90 days.',
  },
};

export const Disabled: Story = { args: { ...Default.args, isDisabled: true } };

export const Bounded: Story = {
  args: {
    label: 'Reporting period',
    defaultValue: { start: '2026-05-04', end: '2026-05-18' },
    minValue: '2026-05-01',
    maxValue: '2026-05-31',
    description: 'May only.',
  },
};

/* --------------------------------------------------------------- the tests */

/**
 * Two named fields in one group. A range picker that announced both ends as
 * "date" would be unusable without sight of the dash between them.
 */
export const BothEndsAreNamed: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group');
    await expect(group).toHaveAccessibleName('Reporting period');

    // Six spinbuttons: month/day/year, twice. The dash is aria-hidden.
    const segments = canvas.getAllByRole('spinbutton');
    await expect(segments).toHaveLength(6);

    const names = segments.map((s) => s.getAttribute('aria-label') ?? '');
    await expect(names.some((n) => /start/i.test(n))).toBe(true);
    await expect(names.some((n) => /end/i.test(n))).toBe(true);
  },
};

/** The calendar opens as a dialog, and Escape closes it. */
export const CalendarOpensAndCloses: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Open calendar' });
    await open(canvas);
    await expect(await overlay().findByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(overlay().queryByRole('dialog')).not.toBeInTheDocument();
    });
    await expect(document.activeElement).toBe(button);
  },
};

/** Two grids by default, because a range usually crosses a month boundary. */
export const TwoMonthsByDefault: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await expect(within(dialog).getAllByRole('grid')).toHaveLength(2);
  },
};

export const OneMonthShowsOneGrid: Story = {
  args: OneMonth.args,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await expect(within(dialog).getAllByRole('grid')).toHaveLength(1);
  },
};

/**
 * Two clicks make a range, and `onChange` reports both ends as ISO strings.
 *
 * The second click is the commit — there is no Apply to press afterwards, which
 * is what this asserts as much as the value itself.
 */
export const TwoClicksCommitTheRange: Story = {
  render: function Render(args) {
    const [seen, setSeen] = useState<DateRange | null>(null);
    return (
      <>
        <DateRangePicker {...args} onChange={setSeen} />
        <p data-testid="seen">{seen ? `${seen.start}..${seen.end}` : 'none'}</p>
      </>
    );
  },
  args: { label: 'Reporting period', defaultValue: Default.args!.defaultValue },
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: /8 April 2026|April 8/ }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: /15 April 2026|April 15/ }),
    );

    await waitFor(async () => {
      await expect(canvas.getByTestId('seen')).toHaveTextContent(
        '2026-04-08..2026-04-15',
      );
    });
  },
};

/**
 * A preset sets the range and closes the calendar — the same outcome as a
 * complete selection in the grid, because it IS one.
 */
export const APresetSetsTheRange: Story = {
  render: function Render(args) {
    const [seen, setSeen] = useState<DateRange | null>(null);
    return (
      <>
        <DateRangePicker {...args} onChange={setSeen} />
        <p data-testid="seen">{seen ? `${seen.start}..${seen.end}` : 'none'}</p>
      </>
    );
  },
  args: { label: 'Reporting period', presets },
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Today' }),
    );

    const today = iso(new Date());
    await waitFor(async () => {
      await expect(canvas.getByTestId('seen')).toHaveTextContent(
        `${today}..${today}`,
      );
    });
    // The grid's second click closes it; a preset has to behave the same way.
    await waitFor(async () => {
      await expect(overlay().queryByRole('dialog')).not.toBeInTheDocument();
    });
  },
};

/**
 * The preset rail is a named group of toggle buttons.
 *
 * `aria-pressed` rather than `aria-current` or a radio group: these report
 * whether the current value matches them, and the grid beside them is the
 * counter-example to any claim that they are the only way to choose.
 */
export const PresetsAreLabelledToggles: Story = {
  args: { label: 'Reporting period', presets },
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    const rail = within(dialog).getByRole('group', {
      name: 'Date range shortcuts',
    });

    const today = within(rail).getByRole('button', { name: 'Today' });
    await expect(today).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(today);
    await open(canvas);
    const reopened = await overlay().findByRole('dialog');
    await expect(
      within(reopened).getByRole('button', { name: 'Today' }),
    ).toHaveAttribute('aria-pressed', 'true');
  },
};

/** Clear empties the value and leaves the calendar open to pick again. */
export const ClearEmptiesTheValue: Story = {
  render: function Render(args) {
    const [seen, setSeen] = useState<DateRange | null | undefined>(undefined);
    return (
      <>
        <DateRangePicker {...args} onChange={setSeen} />
        <p data-testid="seen">
          {seen === undefined ? 'untouched' : seen ? 'set' : 'cleared'}
        </p>
      </>
    );
  },
  args: Default.args,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Clear' }),
    );

    await waitFor(async () => {
      await expect(canvas.getByTestId('seen')).toHaveTextContent('cleared');
    });
    // Still open: clearing is nearly always the first half of choosing again.
    await expect(overlay().getByRole('dialog')).toBeInTheDocument();
  },
};

/** A form posts both ends, under `<name>-start` and `<name>-end`. */
export const FormPostsBothEnds: Story = {
  render: function Render(args) {
    const [posted, setPosted] = useState('');
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setPosted(`${data.get('period-start')}..${data.get('period-end')}`);
        }}
      >
        <DateRangePicker {...args} name="period" />
        <button type="submit">Submit</button>
        <p data-testid="posted">{posted}</p>
      </form>
    );
  },
  args: Default.args,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await waitFor(async () => {
      await expect(canvas.getByTestId('posted')).toHaveTextContent(
        '2026-04-06..2026-04-20',
      );
    });
  },
};

/**
 * An end date typed past `maxValue` turns the whole box invalid and names the
 * bound — the same rule as DatePicker and TimeField. Before 0.81.1 only the
 * segments were marked.
 */
export const OutOfBoundsIsShownNotClamped: Story = {
  args: Bounded.args,
  play: async ({ canvas, canvasElement }) => {
    // Start month, day, year, then the end's month.
    const endMonth = canvas.getAllByRole('spinbutton')[3];
    endMonth.focus();
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() =>
      expect(canvasElement.querySelector('.ion-input')).toHaveClass(
        'ion-input--invalid',
      ),
    );
    await expect(
      canvas.getByText(/5\/31\/2026 or earlier/),
    ).toBeInTheDocument();
  },
};
