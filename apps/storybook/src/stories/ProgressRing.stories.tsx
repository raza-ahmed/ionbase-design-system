import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ProgressRing } from 'ionbase-ui';

const meta: Meta<typeof ProgressRing> = {
  title: 'Components/ProgressRing',
  component: ProgressRing,
  tags: ['autodocs'],
  args: { label: 'Knowledge indexed', value: 60 },
  parameters: {
    docs: {
      description: {
        component:
          "How far a piece of work has got, as a ring that fills clockwise from the top. ProgressBar's contract in a square: a `value` out of `max`, a required `label`, an `intent` for the thing measured.\n\n**Determinate only.** A ring with no value is a Spinner; work that starts unmeasurable is ProgressBar's.\n\n**Small** sits in a line of text and puts its value beside it; **Medium** and **Large** hold the percentage inside.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressRing>;

const ring = (canvas: ReturnType<typeof within>, name?: string) =>
  canvas.getByRole('progressbar', name ? { name } : undefined);
const css = (el: Element, prop: string) =>
  getComputedStyle(el).getPropertyValue(prop);
/** A token as the page resolves it, for comparing with a computed colour. */
const token = (name: string) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.append(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
};

export const Default: Story = {};

export const WithValue: Story = { args: { isValueVisible: true } };

export const WithLabel: Story = {
  args: { size: 'lg', isLabelVisible: true, isValueVisible: true },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <ProgressRing size="sm" label="Small" value={60} isValueVisible />
      <ProgressRing size="md" label="Medium" value={60} isValueVisible />
      <ProgressRing size="lg" label="Large" value={60} isValueVisible />
    </div>
  ),
};

export const Intents: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      <ProgressRing label="Primary" value={40} isValueVisible />
      <ProgressRing
        label="Success"
        value={100}
        intent="success"
        isValueVisible
      />
      <ProgressRing
        label="Warning"
        value={85}
        intent="warning"
        isValueVisible
      />
      <ProgressRing label="Error" value={100} intent="error" isValueVisible />
    </div>
  ),
};

/**
 * One progressbar, named by its label whether or not the label shows, with
 * its value, its bounds, and no valuetext of its own.
 */
export const IsAProgressbarNamedByItsLabel: Story = {
  play: async ({ canvas }) => {
    const bar = ring(canvas, 'Knowledge indexed');
    await expect(bar).toHaveAttribute('aria-valuenow', '60');
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
    await expect(bar).not.toHaveAttribute('aria-valuetext');
    // The drawing is not read out.
    await expect(bar.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  },
};

/**
 * `valueText` is spoken instead of the percentage, and shown beside the ring
 * in place of it; the label stays the name even while it is hidden.
 */
export const ValueTextIsSpokenAndShown: Story = {
  args: {
    size: 'sm',
    label: 'Run progress',
    value: 3,
    max: 5,
    valueText: '3 of 5 steps done',
    isValueVisible: true,
  },
  play: async ({ canvas, canvasElement }) => {
    const bar = ring(canvas, 'Run progress');
    await expect(bar).toHaveAttribute('aria-valuetext', '3 of 5 steps done');
    await expect(canvas.getByText('3 of 5 steps done')).toBeVisible();
    await expect(canvas.getByText('Run progress')).toHaveClass(
      'ion-visually-hidden',
    );
    // Small has no centre.
    await expect(
      canvasElement.querySelector('.ion-progress-ring__percent'),
    ).toBeNull();
  },
};

/** The fill is the percentage of `max`, and the centre says it. */
export const TheFillIsThePercentage: Story = {
  args: { value: 25, max: 50, isValueVisible: true },
  play: async ({ canvas, canvasElement }) => {
    const fill = canvasElement.querySelector('.ion-progress-ring__fill')!;
    await expect(css(fill, 'stroke-dasharray')).toBe('50px, 100px');
    await expect(
      canvasElement.querySelector('.ion-progress-ring__percent'),
    ).toHaveTextContent('50%');
    // The centre is the value already announced, so it is not read twice.
    await expect(
      canvasElement.querySelector('.ion-progress-ring__percent'),
    ).toHaveAttribute('aria-hidden', 'true');
    await expect(ring(canvas)).toHaveAttribute('aria-valuenow', '25');
  },
};

/** A value past either end is held at the end; `max={0}` is empty, not NaN. */
export const TheValueIsClamped: Story = {
  render: () => (
    <>
      <ProgressRing label="Over" value={150} isValueVisible />
      <ProgressRing label="Under" value={-5} isValueVisible />
      <ProgressRing label="No total" value={3} max={0} isValueVisible />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(ring(canvas, 'Over')).toHaveAttribute('aria-valuenow', '100');
    await expect(ring(canvas, 'Under')).toHaveAttribute('aria-valuenow', '0');
    const [over, under, none] = [
      ...canvasElement.querySelectorAll('.ion-progress-ring__fill'),
    ];
    await expect(css(over, 'stroke-dasharray')).toBe('100px, 100px');
    await expect(css(under, 'stroke-dasharray')).toBe('0px, 100px');
    await expect(css(none, 'stroke-dasharray')).toBe('0px, 100px');
    const [, , noneText] = [
      ...canvasElement.querySelectorAll('.ion-progress-ring__percent'),
    ];
    await expect(noneText).toHaveTextContent('0%');
  },
};

/**
 * 20, 56 and 80px, with the stroke a tenth of each — 2, 5.6 and 8px — and
 * starting at twelve o'clock.
 */
export const SizesAndStroke: Story = {
  render: Sizes.render,
  play: async ({ canvas }) => {
    const sizes = ['Small', 'Medium', 'Large'].map(
      (n) => ring(canvas, n).getBoundingClientRect().width,
    );
    await expect(sizes).toEqual([20, 56, 80]);
    const svg = ring(canvas, 'Large').querySelector('svg')!;
    // Rendered stroke: 10 units of a 100-unit box at 80px.
    const fill = svg.querySelector('.ion-progress-ring__fill')!;
    await expect(css(fill, 'stroke-width')).toBe('10px');
    await expect(svg.getBoundingClientRect().width).toBe(80);
    await expect(css(svg, 'transform')).toBe('matrix(0, -1, 1, 0, 0, 0)');
  },
};

/** Each intent fills with its own surface, ProgressBar's. */
export const IntentsFillWithTheirSurface: Story = {
  render: Intents.render,
  play: async ({ canvas }) => {
    const stroke = (name: string) =>
      css(
        ring(canvas, name).querySelector('.ion-progress-ring__fill')!,
        'stroke',
      );
    await expect(stroke('Primary')).toBe(token('--surface-primary'));
    await expect(stroke('Success')).toBe(token('--surface-success'));
    await expect(stroke('Warning')).toBe(token('--surface-warning'));
    await expect(stroke('Error')).toBe(token('--surface-error'));
    const track = ring(canvas, 'Primary').querySelector(
      '.ion-progress-ring__track',
    )!;
    await expect(css(track, 'stroke')).toBe(token('--surface-muted'));
  },
};

/**
 * Right to left: the text moves to the other side, and the ring still fills
 * clockwise from the top — a clock is not mirrored.
 */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <ProgressRing
        label="تقدم التشغيل"
        value={3}
        max={5}
        size="sm"
        valueText="3 من 5"
        isValueVisible
      />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const bar = ring(canvas);
    const text = canvasElement.querySelector('.ion-progress-ring__text')!;
    await expect(text.getBoundingClientRect().right).toBeLessThanOrEqual(
      bar.getBoundingClientRect().left,
    );
    await expect(css(bar.querySelector('svg')!, 'transform')).toBe(
      'matrix(0, -1, 1, 0, 0, 0)',
    );
  },
};

/**
 * "100%" fits inside the stroke on Medium and Large, with room. It is 34.7px
 * wide at 12px, the smallest type token: Medium at 40px, then 48px, left it
 * touching the ring.
 */
export const OneHundredFitsInside: Story = {
  render: () => (
    <>
      <ProgressRing label="Medium" value={100} isValueVisible />
      <ProgressRing label="Large" value={100} size="lg" isValueVisible />
    </>
  ),
  play: async ({ canvas }) => {
    for (const name of ['Medium', 'Large']) {
      const bar = ring(canvas, name);
      const inner = bar.getBoundingClientRect().width * 0.8;
      const text = bar
        .querySelector('.ion-progress-ring__percent')!
        .getBoundingClientRect().width;
      // A clear 2px either side, inside the stroke.
      await expect(text).toBeLessThanOrEqual(inner - 4);
    }
  },
};
