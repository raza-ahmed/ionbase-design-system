import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Calendar } from 'ionbase-ui';

const meta: Meta<typeof Calendar> = {
  title: 'Components/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  args: { label: 'Resume on', defaultFocusedValue: '2026-10-01' },
  parameters: {
    docs: {
      description: {
        component:
          'One month in the page, for a day chosen by where it falls — a day to resume on, a delivery day — and for a place where a DatePicker\'s popover would be a second layer, such as a Modal.\n\n**DatePicker first.** A date someone knows is typed faster than it is found. **The value is `YYYY-MM-DD`**, as DatePicker\'s; `onChange` never gets `null`, because a day in a grid is changed by picking another. `label` names the calendar with the visible month — "Resume on October 2026".',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {};

export const WithAValue: Story = {
  args: {
    defaultValue: '2026-10-09',
    description: 'At the start of the day, UTC.',
  },
};

export const Bounded: Story = {
  args: {
    minValue: '2026-10-06',
    maxValue: '2026-10-24',
    description: 'From tomorrow, for up to 18 days.',
  },
};

export const Invalid: Story = {
  args: {
    value: '2026-10-03',
    minValue: '2026-10-06',
    errorMessage: 'Pick a day from 6 October.',
    description: 'From tomorrow.',
  },
};

/** Named by `label` and the month shown, so paging months says where you are. */
export const NamedWithTheMonth: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('application', { name: /^Resume on,? October 2026$/ }),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(
      canvas.getByRole('application', { name: /^Resume on,? November 2026$/ }),
    ).toBeInTheDocument();
  },
};

/** A click picks the day, and `onChange` reports it as `YYYY-MM-DD`. */
export const APressPicksTheDay: Story = {
  args: { onChange: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /October 14, 2026/ }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith('2026-10-14');
    await expect(
      canvas.getByRole('button', { name: /October 14, 2026/ }),
    ).toHaveAccessibleName(/selected/i);
  },
};

/** Arrows move a day or a week; Enter picks. */
export const TheKeyboardMovesAndPicks: Story = {
  args: { defaultValue: '2026-10-09', onChange: fn() },
  play: async ({ canvas, args }) => {
    canvas.getByRole('button', { name: /October 9, 2026/ }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith('2026-10-17');
    await userEvent.keyboard('{PageDown}');
    await expect(document.activeElement).toHaveAccessibleName(
      /November 17, 2026/,
    );
  },
};

/** Days past the bounds cannot be picked, and the arrows stop at them. */
export const BoundsStopTheDaysAndTheArrows: Story = {
  args: { ...Bounded.args, onChange: fn() },
  play: async ({ canvas, args }) => {
    const before = canvas.getByRole('button', { name: /October 5, 2026/ });
    await expect(before).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(before);
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(
      canvas.getByRole('button', { name: 'Previous' }),
    ).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeDisabled();
  },
};

/** `isDateUnavailable` refuses single days inside the bounds. */
export const UnavailableDaysAreRefused: Story = {
  args: {
    onChange: fn(),
    isDateUnavailable: (d: string) =>
      [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay()),
  },
  play: async ({ canvas, args }) => {
    const saturday = canvas.getByRole('button', { name: /October 10, 2026/ });
    await expect(saturday).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(saturday);
    await expect(args.onChange).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole('button', { name: /October 12, 2026/ }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith('2026-10-12');
  },
};

/** A value it refuses marks it invalid, and the error replaces the description. */
export const ARefusedValueIsInvalid: Story = {
  args: Invalid.args,
  play: async ({ canvas, canvasElement }) => {
    const group = canvas.getByRole('application');
    await expect(group).toHaveAccessibleDescription(
      'Pick a day from 6 October.',
    );
    await expect(canvas.queryByText('From tomorrow.')).toBeNull();
    const field = canvasElement.querySelector('.ion-calendar-field')!;
    await expect(field).toHaveAttribute('data-invalid', 'true');
    const frame = canvasElement.querySelector('.ion-calendar-field__frame')!;
    const plain = document.createElement('div');
    plain.className = 'ion-calendar-field';
    plain.innerHTML = '<div class="ion-calendar-field__frame"></div>';
    document.body.appendChild(plain);
    const normal = getComputedStyle(plain.firstElementChild!).borderTopColor;
    plain.remove();
    await expect(getComputedStyle(frame).borderTopColor).not.toBe(normal);
  },
};

/** The description is the calendar's accessible description. */
export const TheDescriptionDescribesIt: Story = {
  args: WithAValue.args,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('application')).toHaveAccessibleDescription(
      'At the start of the day, UTC.',
    );
  },
};

/** With nothing selected it opens on `defaultFocusedValue`'s month. */
export const OpensOnTheFocusedMonth: Story = {
  args: { defaultFocusedValue: '2027-02-10' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('application', { name: /^Resume on,? February 2027$/ }),
    ).toBeInTheDocument();
  },
};

/** Read-only: moved through, not changed. */
export const ReadOnlyDoesNotChange: Story = {
  args: { defaultValue: '2026-10-09', isReadOnly: true, onChange: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /October 14, 2026/ }),
    );
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(
      canvas.getByRole('button', { name: /October 9, 2026/ }),
    ).toHaveAccessibleName(/selected/i);
  },
};

/** A form posts the ISO value under `name`. */
export const AFormPostsTheValue: Story = {
  render: function Render(args) {
    const [posted, setPosted] = useState('');
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPosted(String(new FormData(e.currentTarget).get('resume')));
        }}
      >
        <Calendar {...args} name="resume" />
        <button type="submit">Save</button>
        <output>{posted}</output>
      </form>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /October 21, 2026/ }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(canvas.getByRole('status')).toHaveTextContent('2026-10-21'),
    );
  },
};

function Controlled() {
  const [day, setDay] = useState<string | null>(null);
  return (
    <>
      <Calendar
        label="Resume on"
        value={day}
        onChange={setDay}
        defaultFocusedValue="2026-10-01"
      />
      <p>{day ?? 'No day yet'}</p>
    </>
  );
}

/** Controlled, starting with no day: `null` is controlled and empty. */
export const ControlledFromNothing: Story = {
  render: () => <Controlled />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No day yet')).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: /October 8, 2026/ }),
    );
    await expect(canvas.getByText('2026-10-08')).toBeInTheDocument();
  },
};

/**
 * Controlled means held: with `value={null}` and a parent that keeps it
 * there, a press reports the day and selects nothing.
 */
export const AControlledNullIsHeld: Story = {
  args: { value: null, onChange: fn() },
  play: async ({ canvas, args }) => {
    const day = canvas.getByRole('button', { name: /October 14, 2026/ });
    await userEvent.click(day);
    await expect(args.onChange).toHaveBeenLastCalledWith('2026-10-14');
    await expect(day).not.toHaveAccessibleName(/selected/i);
    await expect(day).not.toHaveAttribute('data-selected');
  },
};

/** Only its own month is drawn: no last days of September, no first of November. */
export const OnlyItsOwnMonthIsDrawn: Story = {
  play: async ({ canvasElement }) => {
    const shown = [...canvasElement.querySelectorAll('.ion-calendar__day')]
      .filter((d) => (d as HTMLElement).offsetParent !== null)
      .map((d) => Number(d.textContent));
    await expect(shown).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  },
};

/**
 * Disabled with a day: the day stays marked, in the disabled surface — not
 * disabled text on the selected fill, grey on blue.
 */
export const ADisabledCalendarKeepsItsDayDimmed: Story = {
  args: { defaultValue: '2026-10-09', isDisabled: true },
  play: async ({ canvas, canvasElement }) => {
    const day = canvas.getByRole('button', { name: /October 9, 2026/ });
    const other = canvas.getByRole('button', { name: /October 10, 2026/ });
    const bg = (el: Element) => getComputedStyle(el).backgroundColor;
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--surface-primary)';
    canvasElement.appendChild(probe);
    const primary = bg(probe);
    probe.remove();
    await expect(bg(day)).not.toBe(primary);
    await expect(bg(day)).not.toBe(bg(other));
    await expect(day).toHaveAttribute('aria-disabled', 'true');
  },
};
