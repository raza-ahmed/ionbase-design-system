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
