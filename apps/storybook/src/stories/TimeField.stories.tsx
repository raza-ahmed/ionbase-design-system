import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { DatePicker, TimeField } from 'ionbase-ui';

const meta: Meta<typeof TimeField> = {
  title: 'Components/TimeField',
  component: TimeField,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '16rem' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Runs at',
    description: 'In the workspace timezone, Europe/London.',
    defaultValue: '14:30',
  },
  parameters: {
    docs: {
      description: {
        component:
          'A time of day typed into segments. Drawn in Figma as `Time Field` (1453:805) on the Date Picker page — the same box as DatePicker, with a decorative clock.\n\n**The value is `HH:MM`, 24-hour, never a `Date`.** It is a wall-clock time with no date and no timezone; the reader sees their own format — 2:30 PM or 14:30 — and the value is `14:30` either way. A malformed value throws with the prop name.\n\nNo dropdown of times: two digits are faster than 96 quarter-hours, and a list makes 09:07 impossible. For a few allowed slots, use Select.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TimeField>;

export const Default: Story = {};
export const Empty: Story = { args: { defaultValue: undefined } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const Seconds: Story = {
  args: { granularity: 'second', defaultValue: '14:30:15' },
};
export const Invalid: Story = {
  args: {
    isInvalid: true,
    errorMessage: 'Pick a time inside business hours.',
    defaultValue: '22:00',
  },
};
export const Disabled: Story = { args: { isDisabled: true } };
export const ReadOnly: Story = { args: { isReadOnly: true } };

/** Beside a DatePicker, the pair a schedule needs. Same box, same heights. */
export const WithADatePicker: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '32rem' }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
        alignItems: 'end',
      }}
    >
      <DatePicker label="Starts on" defaultValue="2026-10-01" />
      <TimeField label="At" defaultValue="09:00" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [date, time] = [
      ...canvasElement.querySelectorAll('.ion-input'),
    ] as HTMLElement[];
    await expect(time.getBoundingClientRect().height).toBe(
      date.getBoundingClientRect().height,
    );
  },
};

export const ItIsALabelledGroupOfSpinbuttons: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group')).toHaveAccessibleName('Runs at');
    // hour, minute and AM/PM in an en-US browser; the colon is not a segment.
    const segments = canvas.getAllByRole('spinbutton');
    await expect(segments).toHaveLength(3);
    await expect(segments[0]).toHaveAttribute('aria-valuenow', '2');
    await expect(segments[1]).toHaveAttribute('aria-valuenow', '30');
  },
};

/** The same value in a 24-hour reading: 14, no AM/PM segment. */
export const TwentyFourHourIsTheSameValue: Story = {
  args: { hourCycle: 24 },
  play: async ({ canvas }) => {
    const segments = canvas.getAllByRole('spinbutton');
    await expect(segments).toHaveLength(2);
    await expect(segments[0]).toHaveAttribute('aria-valuenow', '14');
  },
};

export const TypingReportsTwentyFourHourIso: Story = {
  render: function Render(args) {
    const [seen, setSeen] = useState<string | null>(null);
    return (
      <>
        <TimeField {...args} onChange={setSeen} />
        <p data-testid="seen">{seen ?? 'nothing'}</p>
      </>
    );
  },
  args: { defaultValue: undefined, hourCycle: 12 },
  play: async ({ canvas, userEvent }) => {
    const [hour] = canvas.getAllByRole('spinbutton');
    await userEvent.click(hour);
    // 9, then 05, then PM — the field moves on by itself after each segment.
    await userEvent.keyboard('905p');
    await waitFor(() =>
      expect(canvas.getByTestId('seen')).toHaveTextContent('21:05'),
    );
  },
};

/**
 * Controlled, with the value in state — the way a form holds it. A fresh
 * `Time` per render once looped forever here (React error 301); the story
 * renders, edits and re-renders to hold that line.
 */
export const ControlledDoesNotLoop: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<string | null>('09:00');
    return (
      <>
        <TimeField {...args} value={value} onChange={setValue} />
        <p data-testid="value">{value ?? 'empty'}</p>
      </>
    );
  },
  args: { defaultValue: undefined, hourCycle: 24 },
  play: async ({ canvas, userEvent }) => {
    const [hour] = canvas.getAllByRole('spinbutton');
    await expect(hour).toHaveAttribute('aria-valuenow', '9');
    await userEvent.click(hour);
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() =>
      expect(canvas.getByTestId('value')).toHaveTextContent('10:00'),
    );
    await expect(hour).toHaveAttribute('aria-valuenow', '10');
  },
};

export const SecondsAreInTheValueToo: Story = {
  render: function Render(args) {
    const [seen, setSeen] = useState<string | null>(null);
    return (
      <>
        <TimeField {...args} onChange={setSeen} />
        <p data-testid="seen">{seen ?? 'nothing'}</p>
      </>
    );
  },
  args: { granularity: 'second', defaultValue: '14:30:15', hourCycle: 24 },
  play: async ({ canvas, userEvent }) => {
    const segments = canvas.getAllByRole('spinbutton');
    await expect(segments).toHaveLength(3);
    await userEvent.click(segments[2]);
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() =>
      expect(canvas.getByTestId('seen')).toHaveTextContent('14:30:16'),
    );
  },
};

export const FormPostsTheIsoValue: Story = {
  render: function Render(args) {
    const [posted, setPosted] = useState('');
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPosted(String(new FormData(e.currentTarget).get('at') ?? ''));
        }}
      >
        <TimeField {...args} name="at" />
        <button type="submit">Submit</button>
        <p data-testid="posted">{posted}</p>
      </form>
    );
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(canvas.getByTestId('posted')).toHaveTextContent('14:30'),
    );
  },
};

/** "2:30 PM" is what the reader sees, never what the prop takes. */
export const AMalformedValueThrows: Story = {
  render: function Render() {
    let message = 'no error';
    try {
      TimeField({ label: 'Broken', value: '2:30 PM' });
    } catch (e) {
      message = (e as Error).message;
    }
    return <p data-testid="thrown">{message}</p>;
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('thrown')).toHaveTextContent(
      /`value` must be "HH:MM"/,
    );
  },
};

export const OutOfBoundsIsShownNotClamped: Story = {
  args: {
    minValue: '09:00',
    maxValue: '17:00',
    hourCycle: 24,
    defaultValue: '17:00',
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const [hour] = canvas.getAllByRole('spinbutton');
    await userEvent.click(hour);
    await userEvent.keyboard('{ArrowUp}');
    // Shown, not silently clamped: the box turns invalid and says the bound.
    await waitFor(() => expect(hour).toHaveAttribute('aria-invalid', 'true'));
    await expect(canvasElement.querySelector('.ion-input')).toHaveClass(
      'ion-input--invalid',
    );
    await expect(canvas.getByText(/17:00 or earlier/)).toBeInTheDocument();
  },
};
