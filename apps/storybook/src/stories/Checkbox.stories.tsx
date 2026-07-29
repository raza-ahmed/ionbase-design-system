import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Checkbox } from '@ionbase/react';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    intent: {
      control: 'inline-radio',
      options: ['brand', 'neutral', 'danger'],
    },
  },
  args: { children: 'Checkbox label' },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Checkbox` — 3 colours x 3 sizes x 6 states. Wraps a hidden native `<input type="checkbox">`, so form association, label clicking and the indeterminate property come from the platform rather than being reimplemented.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Checkbox {...args} size="sm" defaultChecked>
        Small
      </Checkbox>
      <Checkbox {...args} size="md" defaultChecked>
        Medium
      </Checkbox>
      <Checkbox {...args} size="lg" defaultChecked>
        Large
      </Checkbox>
    </div>
  ),
};

export const Intents: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Checkbox {...args} intent="brand" defaultChecked>
        Brand
      </Checkbox>
      <Checkbox {...args} intent="neutral" defaultChecked>
        Neutral
      </Checkbox>
      <Checkbox {...args} intent="danger" defaultChecked>
        Danger
      </Checkbox>
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Checkbox {...args}>Unchecked</Checkbox>
      <Checkbox {...args} defaultChecked>
        Checked
      </Checkbox>
      <Checkbox {...args} isIndeterminate>
        Indeterminate
      </Checkbox>
      <Checkbox {...args} disabled>
        Disabled
      </Checkbox>
      <Checkbox {...args} disabled defaultChecked>
        Checked disabled
      </Checkbox>
    </div>
  ),
};

/**
 * Rendered pixels, not tokens read back to themselves. Figma's Medium indicator
 * is 20px with an 8px gap; Large moves to 24 with a 12px gap and a larger
 * corner, and it is the only size that does either.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: (args) => (
    <div>
      <Checkbox {...args} aria-label="md" />
      <Checkbox {...args} size="lg" aria-label="lg" />
    </div>
  ),
  play: async ({ canvas }) => {
    const md = canvas
      .getByLabelText('md')
      .closest('.ion-checkbox') as HTMLElement;
    const lg = canvas
      .getByLabelText('lg')
      .closest('.ion-checkbox') as HTMLElement;

    const mdBox = md.querySelector('.ion-checkbox__indicator') as HTMLElement;
    const lgBox = lg.querySelector('.ion-checkbox__indicator') as HTMLElement;

    await expect(Math.round(mdBox.getBoundingClientRect().width)).toBe(20);
    await expect(getComputedStyle(md).columnGap).toBe('8px');
    await expect(getComputedStyle(mdBox).borderRadius).toBe('4px');

    await expect(Math.round(lgBox.getBoundingClientRect().width)).toBe(24);
    await expect(getComputedStyle(lg).columnGap).toBe('12px');
    await expect(getComputedStyle(lgBox).borderRadius).toBe('6px');
  },
};

/**
 * Disabled has to beat checked.
 *
 * `.ion-checkbox--disabled .ion-checkbox__indicator` is (0,2,0) while
 * `.ion-checkbox__input:checked + .ion-checkbox__indicator` is (0,3,0), so the
 * first attempt left a disabled checked box looking fully enabled regardless of
 * rule order. This pins the fix.
 */
export const DisabledBeatsChecked: Story = {
  render: (args) => (
    <Checkbox {...args} disabled defaultChecked aria-label="field" />
  ),
  play: async ({ canvas }) => {
    const box = canvas
      .getByLabelText('field')
      .closest('.ion-checkbox')!
      .querySelector('.ion-checkbox__indicator') as HTMLElement;

    const disabledSurface = getComputedStyle(document.documentElement)
      .getPropertyValue('--surface-disabled')
      .trim();
    const rgb = `rgb(${[1, 3, 5]
      .map((i) => parseInt(disabledSurface.slice(i, i + 2), 16))
      .join(', ')})`;

    await expect(getComputedStyle(box).backgroundColor).toBe(rgb);
  },
};

/** `indeterminate` is a DOM property with no HTML attribute, so it can only be
 *  set after render. This proves the effect ran. */
export const IndeterminateIsSetOnTheDom: Story = {
  render: (args) => <Checkbox {...args} isIndeterminate aria-label="field" />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('field') as HTMLInputElement;
    await expect(input.indeterminate).toBe(true);
    await expect(input.checked).toBe(false);
  },
};

/** Clicking the label toggles the box — the native input earns this for free,
 *  and losing it is the usual cost of rebuilding a checkbox from divs. */
export const LabelClickToggles: Story = {
  render: (args) => <Checkbox {...args}>Toggle me</Checkbox>,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText('Toggle me') as HTMLInputElement;
    await expect(input.checked).toBe(false);
    await userEvent.click(canvas.getByText('Toggle me'));
    await expect(input.checked).toBe(true);
  },
};
