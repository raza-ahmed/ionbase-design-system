import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { DatePicker } from 'ionbase-ui';

const meta: Meta<typeof DatePicker> = {
  title: 'Components/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  /*
   * Room below the field for the calendar to open into, and a width the field
   * actually has in a form. Not decoration: `usePopover` flips the overlay
   * above the trigger when there is no room under it, and a story canvas with
   * the field flush to the bottom edge tests the flipped case by accident.
   */
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '20rem', paddingBottom: '24rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "A segmented date field with a calendar attached.\n\n**The value is a `YYYY-MM-DD` string, never a `Date`.** A calendar date has no time and no timezone, so it cannot shift across midnight the way `new Date('2026-04-12')` does for every reader west of Greenwich. `@internationalized/date` stays inside this package — a consumer never installs or imports it. A malformed value throws with the prop name rather than rendering an empty field.\n\n**The display is not the value.** Field order, separators and the calendar system come from `Intl`, so a German reader edits DD.MM.YYYY and a US reader MM/DD/YYYY from the same component and the same value.\n\n**Each editable segment is its own tab stop**, as in Chrome's native `<input type=date>`; the locale's separators are not, and arrow keys move between segments as well. The `role=\"spinbutton\"` is what makes each one announce its own name, value and bounds — “month, 4, minimum 1, maximum 12” — where three text inputs would announce three unrelated numbers.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DatePicker>;

/*
 * The calendar is portalled to document.body by react-aria's `Overlay`, so it
 * is not inside `canvasElement` and `canvas.*` cannot see it. Same as Popover,
 * Modal and Combobox. Querying the body is not a workaround — it is what a
 * screen reader does, and what any consumer's own test will have to do.
 */
const overlay = () => within(document.body);

const open = async (canvas: ReturnType<typeof within>) =>
  userEvent.click(canvas.getByRole('button', { name: 'Open calendar' }));

export const Default: Story = {
  args: {
    label: 'Event starts',
    defaultValue: '2026-04-12',
    description: 'Type the date, or pick it from the calendar.',
  },
};

export const Empty: Story = {
  args: { label: 'Event starts', description: 'Nothing selected yet.' },
};

export const Small: Story = { args: { ...Default.args, size: 'sm' } };
export const Large: Story = { args: { ...Default.args, size: 'lg' } };

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    errorMessage: 'Pick a date at least a week out.',
  },
};

export const Disabled: Story = { args: { ...Default.args, isDisabled: true } };
export const ReadOnly: Story = { args: { ...Default.args, isReadOnly: true } };

/** Bounded to a quarter. The arrows stop at the edges of it. */
export const Bounded: Story = {
  args: {
    label: 'Delivery date',
    defaultValue: '2026-05-15',
    minValue: '2026-05-01',
    maxValue: '2026-05-31',
    description: 'May only.',
  },
};

/** Weekends refused individually — a hole inside the bounds, not a bound. */
export const WeekendsUnavailable: Story = {
  args: {
    label: 'Site visit',
    defaultValue: '2026-04-13',
    description: 'Weekdays only.',
    isDateUnavailable: (date) => {
      const day = new Date(`${date}T00:00:00`).getDay();
      return day === 0 || day === 6;
    },
  },
};

/* --------------------------------------------------------------- the tests */

/**
 * The ARIA contract: one labelled group of spinbuttons, not three inputs.
 *
 * Asserted through the group and the segments rather than through a `textbox`
 * role, because there is deliberately no textbox here — see the component's
 * doc comment on why a single free-text input cannot disambiguate 04/12.
 */
export const ItIsAGroupOfSpinbuttons: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group');
    await expect(group).toHaveAccessibleName('Event starts');

    const segments = canvas.getAllByRole('spinbutton');
    // month, day, year — the literals are aria-hidden and are not counted.
    await expect(segments).toHaveLength(3);
    for (const s of segments) {
      await expect(s).toHaveAttribute('aria-valuenow');
    }
  },
};

/**
 * EACH EDITABLE SEGMENT IS ITS OWN TAB STOP, and the separators are not.
 *
 * This story was originally written to assert the opposite — that the group was
 * one stop — and it failed on the first run, which is why it is worth keeping
 * in this shape. `useDateSegment` sets `tabIndex: 0` on every enabled segment,
 * so Tab walks month, day, year. That matches Chrome's own `<input type=date>`,
 * so it is the convention a user already has, and it is what lets someone Tab
 * straight to the year rather than arrowing past two segments to reach it.
 */
export const EachSegmentIsATabStop: Story = {
  render: function Render(args) {
    return (
      <>
        <button type="button">before</button>
        <DatePicker {...args} />
        <button type="button">after</button>
      </>
    );
  },
  args: Default.args,
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: 'before' }).focus();

    const segments = canvas.getAllByRole('spinbutton');
    for (const segment of segments) {
      await userEvent.tab();
      await expect(document.activeElement).toBe(segment);
    }

    // Past the last segment: the calendar button, then out of the field.
    await userEvent.tab();
    await expect(document.activeElement).toBe(
      canvas.getByRole('button', { name: 'Open calendar' }),
    );
    await userEvent.tab();
    await expect(document.activeElement).toBe(
      canvas.getByRole('button', { name: 'after' }),
    );
  },
};

/**
 * Arrow keys move between segments too, so nobody has to learn which of the two
 * conventions this field follows — it follows both.
 */
export const ArrowKeysMoveBetweenSegments: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const segments = canvas.getAllByRole('spinbutton');
    segments[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(document.activeElement).toBe(segments[1]);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(document.activeElement).toBe(segments[0]);
  },
};

/** ArrowUp increments the focused segment and nothing else. */
export const ArrowUpIncrementsOneSegment: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const segments = canvas.getAllByRole('spinbutton');
    const before = segments.map((s) => s.getAttribute('aria-valuenow'));

    segments[1].focus();
    await userEvent.keyboard('{ArrowUp}');

    const after = canvas
      .getAllByRole('spinbutton')
      .map((s) => s.getAttribute('aria-valuenow'));
    await expect(after[1]).not.toBe(before[1]);
    await expect(after[0]).toBe(before[0]);
    await expect(after[2]).toBe(before[2]);
  },
};

/** The calendar opens as a dialog and closes on Escape, returning focus. */
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
    // Focus comes back to where it was, rather than being dropped on <body>.
    // It is restored just after the dialog unmounts, so wait for it.
    await waitFor(() => expect(document.activeElement).toBe(button));
  },
};

/**
 * `onChange` reports the ISO string, not a Date.
 *
 * The assertion is on the SHAPE as much as the value: a component that handed
 * back a Date would still satisfy a test that only checked the day number.
 */
export const OnChangeReportsIso: Story = {
  render: function Render(args) {
    const [seen, setSeen] = useState<string | null>(null);
    return (
      <>
        <DatePicker {...args} onChange={setSeen} />
        <p data-testid="seen">{seen ?? 'nothing'}</p>
      </>
    );
  },
  args: { label: 'Event starts', defaultValue: '2026-04-12' },
  play: async ({ canvas }) => {
    await open(canvas);
    // The 20th of the same month — the grid is showing April 2026.
    await userEvent.click(
      await overlay().findByRole('button', { name: /20 April 2026|April 20/ }),
    );
    await waitFor(async () => {
      await expect(canvas.getByTestId('seen')).toHaveTextContent('2026-04-20');
    });
  },
};

/** A form posts the ISO value, which the spinbuttons cannot carry themselves. */
export const FormPostsTheIsoValue: Story = {
  render: function Render(args) {
    const [posted, setPosted] = useState('');
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPosted(String(new FormData(e.currentTarget).get('starts') ?? ''));
        }}
      >
        <DatePicker {...args} name="starts" />
        <button type="submit">Submit</button>
        <p data-testid="posted">{posted}</p>
      </form>
    );
  },
  args: { label: 'Event starts', defaultValue: '2026-04-12' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await waitFor(async () => {
      await expect(canvas.getByTestId('posted')).toHaveTextContent(
        '2026-04-12',
      );
    });
  },
};

/**
 * A malformed value throws rather than rendering an empty field.
 *
 * The render is wrapped so the thrown error is caught here instead of failing
 * the story. What is being asserted is that it throws AT ALL: the tempting
 * alternative — returning null for an unparseable value — produces a picker
 * that renders perfectly with nothing in it and no indication anywhere that the
 * value it was handed was dropped.
 */
export const AMalformedValueThrows: Story = {
  render: function Render() {
    let message = 'no error';
    try {
      // @ts-expect-error — deliberately wrong, which is the point of the story.
      DatePicker({ label: 'Broken', value: new Date('2026-04-12') });
    } catch (e) {
      message = (e as Error).message;
    }
    return <p data-testid="thrown">{message}</p>;
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('thrown')).toHaveTextContent(
      /expected a YYYY-MM-DD string/,
    );
  },
};

/** Out-of-bounds days are disabled, and the nav arrow stops at the bound. */
export const BoundsDisableTheArrows: Story = {
  args: Bounded.args,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    const prev = within(dialog).getByRole('button', { name: /previous/i });
    // April is entirely before minValue, so there is nowhere to step back to.
    await expect(prev).toBeDisabled();
  },
};

/**
 * A typed date past a bound is shown, not clamped: the box turns invalid and
 * React Aria's localized message names the bound. Before 0.81.1 only the
 * segments knew — aria-invalid, with a box that still looked valid.
 */
export const OutOfBoundsIsShownNotClamped: Story = {
  args: Bounded.args,
  play: async ({ canvas, canvasElement }) => {
    const [month] = canvas.getAllByRole('spinbutton');
    month.focus();
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(month).toHaveAttribute('aria-invalid', 'true'));
    await expect(canvasElement.querySelector('.ion-input')).toHaveClass(
      'ion-input--invalid',
    );
    await expect(
      canvas.getByText(/5\/31\/2026 or earlier/),
    ).toBeInTheDocument();
  },
};
