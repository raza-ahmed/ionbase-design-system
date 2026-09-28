import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { Button, DateTimePicker, type DateTimePickerProps } from 'ionbase-ui';

/** The picker with its value written out, so a test can read it. */
function Harness({
  initial = null,
  ...props
}: Partial<DateTimePickerProps> & { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <DateTimePicker
        label="Run starts"
        description="Workspace time, UTC."
        value={value}
        onChange={setValue}
        {...props}
      />
      <output data-testid="value">{value ?? 'nothing'}</output>
      <Button
        size="sm"
        variant="secondary"
        onPress={() => setValue('2026-04-13T08:30')}
      >
        Next day, 08:30
      </Button>
    </>
  );
}

const meta: Meta<typeof DateTimePicker> = {
  title: 'Components/DateTimePicker',
  component: DateTimePicker,
  tags: ['autodocs'],
  // Room for the popover to open downward — see DatePicker's stories.
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '22rem', paddingBottom: '30rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A date and a time of day as one value: when a run starts, when a window opens. One segmented field — day, month, year, hour, minute, in the reader\'s own order and clock — with the calendar and a time field in its popover.\n\n**The value is `YYYY-MM-DDTHH:MM`, a wall-clock reading with no zone.** Say which zone in the `description`. **`minValue` is one moment**, checked against the date and the time together — "not before now" needs no code of its own.\n\nNot a DatePicker beside a TimeField: two fields hold two values, and every rule that spans them is the caller\'s.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DateTimePicker>;

// The popover is portalled to <body> — see DatePicker's stories.
const overlay = () => within(document.body);
const value = (canvas: ReturnType<typeof within>) =>
  canvas.getByTestId('value');
const open = (canvas: ReturnType<typeof within>) =>
  userEvent.click(canvas.getByRole('button', { name: 'Open calendar' }));

export const Default: Story = {
  args: {
    label: 'Run starts',
    defaultValue: '2026-04-12T14:30',
    description: 'Workspace time, UTC.',
  },
};

export const Empty: Story = {
  args: { label: 'Run starts', description: 'Workspace time, UTC.' },
};

export const Small: Story = { args: { ...Default.args, size: 'sm' } };

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    errorMessage: 'Choose a time after the window closes.',
  },
};

export const Disabled: Story = { args: { ...Default.args, isDisabled: true } };

/**
 * One labelled group of spinbuttons: the date's three and the time's, with
 * AM/PM in a 12-hour locale. Not two fields.
 */
export const IsOneGroupOfDateAndTimeSegments: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Run starts' });
    const segments = within(group).getAllByRole('spinbutton');
    await expect(segments.map((s) => s.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/month/i),
        expect.stringMatching(/day,/i),
        expect.stringMatching(/year/i),
        expect.stringMatching(/hour/i),
        expect.stringMatching(/minute/i),
        expect.stringMatching(/AM\/PM/i),
      ]),
    );
    await expect(segments).toHaveLength(6);
    // The time is wrapped in bidi isolates, which read as nothing.
    await expect(group.textContent?.replace(/[\u2066-\u2069]/g, '')).toBe(
      '4/12/2026, 2:30 PM',
    );
  },
};

/** `hourCycle={24}` drops AM/PM; the value is 24-hour either way. */
export const TwentyFourHour: Story = {
  args: { ...Default.args, hourCycle: 24 },
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Run starts' });
    await expect(within(group).getAllByRole('spinbutton')).toHaveLength(5);
    await expect(group).toHaveTextContent('14:30');
  },
};

/**
 * A day picked keeps the time already set, and the popover stays open for
 * the time; the time field under the calendar changes the value too. Escape
 * closes it, and focus goes back to the button.
 */
export const APickedDayKeepsItsTime: Story = {
  render: () => <Harness initial="2026-04-12T14:30" />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: /April 20, 2026/ }),
    );
    await expect(value(canvas)).toHaveTextContent('2026-04-20T14:30');
    await expect(overlay().getByRole('dialog')).toBeVisible();

    const time = within(dialog).getByRole('group', { name: 'Time' });
    const [hour] = within(time).getAllByRole('spinbutton');
    hour.focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(value(canvas)).toHaveTextContent('2026-04-20T15:30');
    // The time is a second step, ruled off from the calendar.
    const section = time.closest('.ion-date-time-picker__time')!;
    await expect(getComputedStyle(section).borderTopWidth).toBe('1px');

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(overlay().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        canvas.getByRole('button', { name: 'Open calendar' }),
      ),
    );
  },
};

/** Tab from the calendar reaches the time field, inside the popover. */
export const TabGoesFromTheCalendarToTheTime: Story = {
  render: () => <Harness initial="2026-04-12T14:30" />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    const time = within(dialog).getByRole('group', { name: 'Time' });
    for (let i = 0; i < 6 && !time.contains(document.activeElement); i++)
      await browserUser.keyboard('{Tab}');
    await expect(time.contains(document.activeElement)).toBe(true);
    await expect(document.activeElement).toHaveAttribute('role', 'spinbutton');
  },
};

/**
 * A day picked with no time yet takes midnight when the popover closes —
 * shown in the field, to change.
 */
export const ADayWithNoTimeTakesMidnight: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    const [day] = within(dialog)
      .getAllByRole('button')
      .filter(
        (b) =>
          /\b15, \d{4}/.test(b.getAttribute('aria-label') ?? '') &&
          b.getAttribute('aria-disabled') !== 'true',
      );
    await userEvent.click(day);
    // Nothing is committed until there is a time, or the popover closes.
    await expect(value(canvas)).toHaveTextContent('nothing');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(value(canvas)).toHaveTextContent(/^\d{4}-\d{2}-15T00:00$/),
    );
  },
};

/**
 * `minValue` is one moment. On its day an earlier time is out of range and
 * the field says why; the same time a day later is fine.
 */
export const MinValueBoundsTheDateAndTimeTogether: Story = {
  render: () => (
    <Harness initial="2026-04-12T08:30" minValue="2026-04-12T09:00" />
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Run starts' });
    await expect(group).toHaveAttribute('data-invalid', 'true');
    await expect(canvas.getByText(/or later/)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Next day, 08:30' }),
    );
    await expect(value(canvas)).toHaveTextContent('2026-04-13T08:30');
    await expect(group).not.toHaveAttribute('data-invalid');
    await expect(canvas.getByText('Workspace time, UTC.')).toBeVisible();
  },
};

/** `second` adds a seconds segment, and `:SS` to the value. */
export const SecondsGranularity: Story = {
  render: () => <Harness initial="2026-04-12T14:30:15" granularity="second" />,
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Run starts' });
    const second = within(group)
      .getAllByRole('spinbutton')
      .find((s) => /second/i.test(s.getAttribute('aria-label') ?? ''))!;
    second.focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(value(canvas)).toHaveTextContent('2026-04-12T14:30:16');
  },
};

/** A form posts the ISO value, which the spinbuttons cannot carry themselves. */
export const FormPostsTheIsoValue: Story = {
  render: function Render() {
    const [posted, setPosted] = useState('');
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPosted(String(new FormData(e.currentTarget).get('starts') ?? ''));
        }}
      >
        <DateTimePicker
          label="Run starts"
          name="starts"
          defaultValue="2026-04-12T14:30"
        />
        <button type="submit">Submit</button>
        <p data-testid="posted">{posted}</p>
      </form>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(canvas.getByTestId('posted')).toHaveTextContent(
      /^2026-04-12T14:30$/,
    );
  },
};

/** A `Date`, or a string with a zone, throws rather than rendering nothing. */
export const AZonedOrDateValueThrows: Story = {
  render: function Render() {
    const thrown = (value: unknown) => {
      try {
        // @ts-expect-error — deliberately wrong, which is the point.
        DateTimePicker({ label: 'Broken', value });
        return 'no error';
      } catch (e) {
        return (e as Error).message;
      }
    };
    return (
      <>
        <p data-testid="date">{thrown(new Date('2026-04-12T14:30'))}</p>
        <p data-testid="zoned">{thrown('2026-04-12T14:30Z')}</p>
        <p data-testid="unreal">{thrown('2026-02-30T14:30')}</p>
      </>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('date')).toHaveTextContent(
      /expected a YYYY-MM-DDTHH:MM string/,
    );
    await expect(canvas.getByTestId('zoned')).toHaveTextContent(
      /expected a YYYY-MM-DDTHH:MM string/,
    );
    await expect(canvas.getByTestId('unreal')).toHaveTextContent(
      /not a real date/,
    );
  },
};

/** `labels` name the calendar button and the time field. */
export const LabelsNameTheButtonAndTheTime: Story = {
  args: {
    ...Default.args,
    labels: { calendar: 'Pick a day', time: 'Start time' },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Pick a day' }));
    const dialog = await overlay().findByRole('dialog');
    await expect(
      within(dialog).getByRole('group', { name: 'Start time' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

/** With no visible label, `aria-label` names the group. */
export const AriaLabelNamesTheField: Story = {
  args: { 'aria-label': 'Window opens', defaultValue: '2026-04-12T14:30' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Window opens' }),
    ).toBeVisible();
  },
};
