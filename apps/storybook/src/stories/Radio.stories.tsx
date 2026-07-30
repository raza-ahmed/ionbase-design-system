import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Radio, RadioGroup } from '@ionbase/react';

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/Radio',
  component: RadioGroup,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    intent: {
      control: 'inline-radio',
      options: ['brand', 'neutral', 'danger'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Radio` — 3 colours x 3 sizes x 2 states. A radio is meaningless alone, so `RadioGroup` owns the shared `name` and the selected value; individual `Radio`s inherit size and intent from it.\n\nRenders a `<fieldset>`/`<legend>` rather than `role="radiogroup"`: both announce correctly, but only the fieldset also groups the inputs for form submission.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

const OPTIONS = ['Weekly', 'Monthly', 'Never'];

export const Default: Story = {
  render: (args) => (
    <RadioGroup {...args} label="Email digest" defaultValue="Weekly">
      {OPTIONS.map((o) => (
        <Radio key={o} value={o}>
          {o}
        </Radio>
      ))}
    </RadioGroup>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '2rem' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <RadioGroup
          key={size}
          {...args}
          size={size}
          label={size}
          defaultValue="a"
        >
          <Radio value="a">Selected</Radio>
          <Radio value="b">Not selected</Radio>
        </RadioGroup>
      ))}
    </div>
  ),
};

export const Intents: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '2rem' }}>
      {(['brand', 'neutral', 'danger'] as const).map((intent) => (
        <RadioGroup
          key={intent}
          {...args}
          intent={intent}
          label={intent}
          defaultValue="a"
        >
          <Radio value="a">Selected</Radio>
          <Radio value="b">Not selected</Radio>
        </RadioGroup>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <RadioGroup {...args} label="Disabled group" defaultValue="a" isDisabled>
      <Radio value="a">Selected</Radio>
      <Radio value="b">Not selected</Radio>
    </RadioGroup>
  ),
};

/** Figma: Medium indicator 20, gap 8; Large 24 with a 12px gap. The indicator
 *  is a circle at every size, unlike Checkbox's stepped corners. */
export const RenderedGeometryMatchesFigma: Story = {
  render: (args) => (
    <RadioGroup {...args} defaultValue="a">
      <Radio value="a" aria-label="md" />
      <Radio value="b" size="lg" aria-label="lg" />
    </RadioGroup>
  ),
  play: async ({ canvas }) => {
    const md = canvas.getByLabelText('md').closest('.ion-radio') as HTMLElement;
    const lg = canvas.getByLabelText('lg').closest('.ion-radio') as HTMLElement;
    const mdBox = md.querySelector('.ion-radio__indicator') as HTMLElement;
    const lgBox = lg.querySelector('.ion-radio__indicator') as HTMLElement;

    await expect(Math.round(mdBox.getBoundingClientRect().width)).toBe(20);
    await expect(getComputedStyle(md).columnGap).toBe('8px');
    await expect(Math.round(lgBox.getBoundingClientRect().width)).toBe(24);
    await expect(getComputedStyle(lg).columnGap).toBe('12px');
    // radius/full resolves to 9999px, which the browser clamps to a circle.
    await expect(getComputedStyle(mdBox).borderRadius).toBe('9999px');
  },
};

/**
 * The dot is `box / 2 - 2` rather than three stated numbers, because 10 is on no
 * ladder. Checked against Figma's 6 / 8 / 10.
 */
export const DerivedDotMatchesFigma: Story = {
  render: (args) => (
    <RadioGroup {...args} defaultValue="a">
      <Radio value="a" size="sm" aria-label="sm" />
      <Radio value="b" aria-label="md" defaultChecked />
      <Radio value="c" size="lg" aria-label="lg" />
    </RadioGroup>
  ),
  play: async ({ canvas }) => {
    for (const [label, px] of [
      ['sm', 6],
      ['md', 8],
      ['lg', 10],
    ] as const) {
      const dot = canvas
        .getByLabelText(label)
        .closest('.ion-radio')!
        .querySelector('.ion-radio__dot') as HTMLElement;
      await expect(Math.round(dot.getBoundingClientRect().width)).toBe(px);
    }
  },
};

/** One name per group, and exactly one selected — the whole reason the group
 *  exists rather than each Radio standing alone. */
export const GroupSharesNameAndSelection: Story = {
  render: (args) => (
    <RadioGroup {...args} label="Plan" defaultValue="b">
      <Radio value="a">A</Radio>
      <Radio value="b">B</Radio>
      <Radio value="c">C</Radio>
    </RadioGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    const a = canvas.getByLabelText('A') as HTMLInputElement;
    const b = canvas.getByLabelText('B') as HTMLInputElement;
    const c = canvas.getByLabelText('C') as HTMLInputElement;

    await expect(a.name).toBe(b.name);
    await expect(b.name).toBe(c.name);
    await expect(b.checked).toBe(true);

    await userEvent.click(canvas.getByText('C'));
    await expect(c.checked).toBe(true);
    await expect(b.checked).toBe(false);
  },
};

/**
 * The empty circle is a 2px `border/stronger` outline; the selected one drops
 * to 1px of its intent colour — the same pair Checkbox uses, kept in step
 * deliberately. Pinned for the same reason: `tokens:verify` only sees
 * variables, so nothing else in the pipeline can catch a border width
 * regressing.
 *
 * The circle must stay 20px in both states — `box-sizing: border-box` is what
 * reproduces Figma's INSIDE stroke, and without it the 2px border would grow
 * the unselected circle against the selected one.
 */
export const UnselectedBorderIsHeavier: Story = {
  render: () => (
    <RadioGroup label="Plan" defaultValue="b">
      <Radio value="a">empty</Radio>
      <Radio value="b">filled</Radio>
    </RadioGroup>
  ),
  play: async ({ canvas }) => {
    const indicator = (label: string) =>
      canvas
        .getByLabelText(label)
        .closest('.ion-radio')!
        .querySelector('.ion-radio__indicator') as HTMLElement;

    const empty = getComputedStyle(indicator('empty'));
    const filled = getComputedStyle(indicator('filled'));

    await expect(empty.borderTopWidth).toBe('2px');
    await expect(filled.borderTopWidth).toBe('1px');

    const stronger = getComputedStyle(document.documentElement)
      .getPropertyValue('--border-stronger')
      .trim();
    const rgb = `rgb(${[1, 3, 5]
      .map((i) => parseInt(stronger.slice(i, i + 2), 16))
      .join(', ')})`;
    await expect(empty.borderTopColor).toBe(rgb);

    // Border grows inward, so the outer circle is identical in both states.
    await expect(indicator('empty').getBoundingClientRect().width).toBe(
      indicator('filled').getBoundingClientRect().width,
    );
  },
};

/**
 * Disabled keeps the 2px border whether or not it is selected.
 *
 * Figma has no disabled variants for Radio, so this mirrors Checkbox rather
 * than reproducing a measurement. Without it, a disabled+selected radio would
 * inherit 1px from `:checked` by accident of specificity — which is a cascade
 * outcome, not a decision, and worth pinning either way.
 */
export const DisabledKeepsTheHeavyBorder: Story = {
  render: () => (
    <RadioGroup label="Plan" defaultValue="b" isDisabled>
      <Radio value="a">off</Radio>
      <Radio value="b">on</Radio>
    </RadioGroup>
  ),
  play: async ({ canvas }) => {
    const indicator = (label: string) =>
      canvas
        .getByLabelText(label)
        .closest('.ion-radio')!
        .querySelector('.ion-radio__indicator') as HTMLElement;

    await expect(getComputedStyle(indicator('off')).borderTopWidth).toBe('2px');
    await expect(getComputedStyle(indicator('on')).borderTopWidth).toBe('2px');
  },
};
