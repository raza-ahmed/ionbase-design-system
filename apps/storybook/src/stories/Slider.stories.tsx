import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { I18nProvider } from 'react-aria';
import { Slider } from 'ionbase-ui';

const meta: Meta<typeof Slider> = {
  title: 'Components/Slider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A value, or a `[low, high]` range, picked along a track — for a rough value in a known range, where where-it-sits matters more than the exact number. When the exact number matters, NumberInput.\n\nEach thumb is a visually hidden `<input type="range">`: arrows step, Page Up/Down jump a tenth, Home/End go to the bounds, and the formatted value is what is read out. A range\'s thumbs cannot cross.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Slider>;

const Confidence = (props: Partial<React.ComponentProps<typeof Slider>>) => (
  <Slider
    label="Confidence needed to act alone"
    defaultValue={0.7}
    minValue={0}
    maxValue={1}
    step={0.01}
    formatOptions={{ style: 'percent' }}
    description="Below this, the agent asks for approval."
    {...props}
  />
);

const Duration = (
  props: Partial<React.ComponentProps<typeof Slider<[number, number]>>>,
) => (
  <Slider<[number, number]>
    label="Duration"
    defaultValue={[30, 120]}
    minValue={0}
    maxValue={300}
    step={5}
    formatOptions={{ style: 'unit', unit: 'second', unitDisplay: 'short' }}
    {...props}
  />
);

export const Default: Story = { render: () => <Confidence /> };

export const Range: Story = { render: () => <Duration /> };

export const Disabled: Story = { render: () => <Confidence isDisabled /> };

// ------------------------------------------------------------------ tests

const slider = (c: ReturnType<typeof within>, name: string | RegExp) =>
  c.getByRole('slider', { name });

/** A real range input, named by the label, read as "70%", not "0.7". */
export const ThumbIsANamedRangeInput: Story = {
  render: () => <Confidence />,
  play: async ({ canvas }) => {
    const s = slider(canvas, 'Confidence needed to act alone');
    await expect(s).toHaveAttribute('type', 'range');
    await expect(s).toHaveAttribute('aria-valuetext', '70%');
    await expect(canvas.getByRole('group')).toHaveAccessibleName(
      'Confidence needed to act alone',
    );
    await expect(s).toHaveAccessibleDescription(
      'Below this, the agent asks for approval.',
    );
    // The value beside the label is not a second live announcement.
    await expect(canvasOutput(canvas)).toHaveAttribute('aria-live', 'off');
    await expect(canvasOutput(canvas)).toHaveTextContent('70%');
  },
};

const canvasOutput = (c: ReturnType<typeof within>) =>
  c.getByText(/%|sec/, { selector: 'output' });

export const KeysStepJumpAndReachTheBounds: Story = {
  render: () => <Confidence />,
  play: async ({ canvas }) => {
    const s = slider(canvas, 'Confidence needed to act alone');
    s.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(s).toHaveAttribute('aria-valuetext', '71%');
    await userEvent.keyboard('{PageUp}');
    await expect(s).toHaveAttribute('aria-valuetext', '81%');
    await userEvent.keyboard('{End}');
    await expect(s).toHaveAttribute('aria-valuetext', '100%');
    await userEvent.keyboard('{Home}');
    await expect(s).toHaveAttribute('aria-valuetext', '0%');
    await expect(canvasOutput(canvas)).toHaveTextContent('0%');
  },
};

/** The thumbs cannot pass each other: each stops at the other's value. */
export const RangeThumbsAreNamedAndCannotCross: Story = {
  render: () => <Duration />,
  play: async ({ canvas }) => {
    const low = slider(canvas, 'Minimum Duration');
    const high = slider(canvas, 'Maximum Duration');
    await expect(canvasOutput(canvas)).toHaveTextContent('30 sec – 120 sec');
    low.focus();
    await userEvent.keyboard('{End}');
    await expect(low).toHaveValue('120');
    await expect(high).toHaveValue('120');
    high.focus();
    await userEvent.keyboard('{Home}');
    await expect(high).toHaveValue('120');
  },
};

/** Thumb names are props, so a range can be translated. */
export const ThumbLabelsAreTranslatable: Story = {
  render: () => (
    <Duration label="Dauer" thumbLabels={['Mindestens', 'Höchstens']} />
  ),
  play: async ({ canvas }) => {
    await expect(slider(canvas, 'Mindestens Dauer')).toBeInTheDocument();
    await expect(slider(canvas, 'Höchstens Dauer')).toBeInTheDocument();
  },
};

const onChange = fn();
const onChangeEnd = fn();

/** A drag reports every step to onChange, and ends once in onChangeEnd. */
export const ADragEndsOnce: Story = {
  render: () => <Confidence onChange={onChange} onChangeEnd={onChangeEnd} />,
  play: async ({ canvasElement, canvas }) => {
    onChange.mockClear();
    onChangeEnd.mockClear();
    const thumb =
      canvasElement.querySelector<HTMLElement>('.ion-slider__thumb')!;
    const track = canvasElement
      .querySelector('.ion-slider__track')!
      .getBoundingClientRect();
    const t = thumb.getBoundingClientRect();
    const y = t.top + t.height / 2;
    const opts = { bubbles: true, pointerId: 1, pointerType: 'mouse' };
    thumb.dispatchEvent(
      new PointerEvent('pointerdown', {
        ...opts,
        button: 0,
        clientX: t.left + t.width / 2,
        clientY: y,
      }),
    );
    for (const f of [0.6, 0.5, 0.4]) {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          ...opts,
          clientX: track.left + track.width * f,
          clientY: y,
        }),
      );
    }
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        ...opts,
        button: 0,
        clientX: track.left + track.width * 0.4,
        clientY: y,
      }),
    );
    await expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(3);
    await expect(onChangeEnd).toHaveBeenCalledTimes(1);
    await expect(onChangeEnd.mock.calls[0][0]).toBeCloseTo(0.4, 1);
    await expect(
      slider(canvas, 'Confidence needed to act alone'),
    ).toHaveAttribute('aria-valuetext', '40%');
  },
};

/** Pressing the track moves the thumb nearest the press. */
export const PressingTheTrackMovesTheNearestThumb: Story = {
  render: () => <Duration />,
  play: async ({ canvasElement, canvas }) => {
    const track =
      canvasElement.querySelector<HTMLElement>('.ion-slider__track')!;
    const r = track.getBoundingClientRect();
    const x = r.left + r.width * 0.9;
    const y = r.top + r.height / 2;
    const opts = {
      bubbles: true,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: x,
      clientY: y,
    };
    track.dispatchEvent(new PointerEvent('pointerdown', opts));
    window.dispatchEvent(new PointerEvent('pointerup', opts));
    await expect(slider(canvas, 'Minimum Duration')).toHaveValue('30');
    await expect(slider(canvas, 'Maximum Duration')).toHaveValue('270');
  },
};

/** 24px thumbs on a 24px track, and nothing hangs over the component's edge. */
export const TargetsMeetTheMinimumAndStayInside: Story = {
  render: () => <Duration defaultValue={[0, 300]} />,
  play: async ({ canvasElement }) => {
    const root = canvasElement
      .querySelector('.ion-slider')!
      .getBoundingClientRect();
    const thumbs = [
      ...canvasElement.querySelectorAll<HTMLElement>('.ion-slider__thumb'),
    ].map((t) => t.getBoundingClientRect());
    for (const t of thumbs) {
      await expect(Math.round(t.width)).toBe(24);
      await expect(Math.round(t.height)).toBe(24);
      await expect(t.left).toBeGreaterThanOrEqual(root.left - 0.5);
      await expect(t.right).toBeLessThanOrEqual(root.right + 0.5);
    }
    const track = canvasElement
      .querySelector('.ion-slider__track')!
      .getBoundingClientRect();
    await expect(Math.round(track.height)).toBe(24);
  },
};

/** The fill runs between the thumbs' centres. */
export const FillSpansTheRange: Story = {
  render: () => <Duration />,
  play: async ({ canvasElement }) => {
    const [a, b] = [
      ...canvasElement.querySelectorAll<HTMLElement>('.ion-slider__thumb'),
    ].map((t) => t.getBoundingClientRect());
    const fill = canvasElement
      .querySelector('.ion-slider__fill')!
      .getBoundingClientRect();
    await expect(Math.abs(fill.left - (a.left + a.width / 2))).toBeLessThan(1);
    await expect(Math.abs(fill.right - (b.left + b.width / 2))).toBeLessThan(1);
    await expect(fill.height).toBeGreaterThan(0);
  },
};

/** Right to left: the low end is on the right, and the fill follows the thumbs. */
export const RightToLeft: Story = {
  render: () => (
    <I18nProvider locale="ar-EG">
      <div dir="rtl">
        <Duration formatOptions={undefined} thumbLabels={['أدنى', 'أقصى']} />
      </div>
    </I18nProvider>
  ),
  play: async ({ canvasElement, canvas }) => {
    const [low, high] = [
      ...canvasElement.querySelectorAll<HTMLElement>('.ion-slider__thumb'),
    ].map((t) => t.getBoundingClientRect());
    await expect(low.left).toBeGreaterThan(high.left);
    const fill = canvasElement
      .querySelector('.ion-slider__fill')!
      .getBoundingClientRect();
    await expect(
      Math.abs(fill.left - (high.left + high.width / 2)),
    ).toBeLessThan(1);
    await expect(
      Math.abs(fill.right - (low.left + low.width / 2)),
    ).toBeLessThan(1);
    // ArrowLeft moves toward the high end, as it points.
    const s = slider(canvas, /أدنى/);
    s.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(s).toHaveValue('35');
  },
};

/** Disabled thumbs are out of the tab order and cannot be changed. */
export const DisabledIsSkipped: Story = {
  render: () => (
    <>
      <button type="button">Before</button>
      <Confidence isDisabled />
      <button type="button">After</button>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(
      slider(canvas, 'Confidence needed to act alone'),
    ).toBeDisabled();
    canvas.getByRole('button', { name: 'Before' }).focus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
  },
};

/** A range submits two fields, one per thumb. */
export const RangeSubmitsTwoFields: Story = {
  render: () => (
    <form aria-label="Filters">
      <Duration name={['minDuration', 'maxDuration']} />
    </form>
  ),
  play: async ({ canvas }) => {
    const data = new FormData(canvas.getByRole('form') as HTMLFormElement);
    await expect(data.get('minDuration')).toBe('30');
    await expect(data.get('maxDuration')).toBe('120');
  },
};

/** The ring goes round the 24px target when the thumb has keyboard focus. */
export const FocusRingOnKeyboardFocus: Story = {
  render: () => <Confidence />,
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    const thumb =
      canvasElement.querySelector<HTMLElement>('.ion-slider__thumb')!;
    await expect(thumb).toHaveAttribute('data-focus-visible', 'true');
    await expect(getComputedStyle(thumb).outlineStyle).toBe('solid');
  },
};
