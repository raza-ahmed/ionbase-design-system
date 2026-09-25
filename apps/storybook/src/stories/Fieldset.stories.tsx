import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Fieldset, NumberInput } from 'ionbase-ui';

const meta: Meta<typeof Fieldset> = {
  title: 'Components/Fieldset',
  component: Fieldset,
  tags: ['autodocs'],
  args: {
    label: 'Run limits',
    description: 'Runs stop at whichever comes first.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Groups related fields under one `<legend>`, one description and one error. Each field keeps its own label — the legend names the group.\n\nFor checkboxes use CheckboxGroup, for radios RadioGroup; both render this shell. There is no `isDisabled`: disable the fields themselves, which draw their disabled state from their own prop.',
      },
    },
  },
  render: (args) => (
    <Fieldset {...args}>
      <NumberInput label="Max steps" defaultValue={40} />
      <NumberInput label="Max minutes" defaultValue={15} />
    </Fieldset>
  ),
};

export default meta;
type Story = StoryObj<typeof Fieldset>;

export const Default: Story = {};

export const Horizontal: Story = { args: { orientation: 'horizontal' } };

export const Invalid: Story = {
  args: {
    isInvalid: true,
    errorMessage: 'Allow at least one step per minute.',
  },
};

// ------------------------------------------------------------------ tests

export const NamesTheGroupAndDescribesIt: Story = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Run limits' });
    await expect(group).toHaveAccessibleDescription(/whichever comes first/);
    // The fields keep their own names; the legend does not replace them.
    await expect(
      canvas.getByRole('textbox', { name: 'Max steps' }),
    ).toBeVisible();
  },
};

export const ErrorTakesTheDescriptionsPlace: Story = {
  ...Invalid,
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole('group', { name: 'Run limits' }),
    ).toHaveAccessibleDescription(/at least one step/);
    await expect(canvas.queryByText(/whichever comes first/)).toBeNull();
    await expect(canvasElement.querySelector('fieldset')).toHaveAttribute(
      'data-invalid',
    );
  },
};

export const HorizontalSitsInARow: Story = {
  ...Horizontal,
  play: async ({ canvasElement }) => {
    const [a, b] = [...canvasElement.querySelectorAll('.ion-field')].map((el) =>
      el.getBoundingClientRect(),
    );
    await expect(Math.round(a.top)).toBe(Math.round(b.top));
    // A form's spacing, 16 — not the choice groups' 8.
    await expect(Math.round(b.left - a.right)).toBe(16);
  },
};

/** No legend chrome from the browser: no border, no padding, no inset. */
export const HasNoNativeChrome: Story = {
  play: async ({ canvasElement }) => {
    const fs = getComputedStyle(canvasElement.querySelector('fieldset')!);
    await expect(fs.borderTopStyle).toBe('none');
    await expect(fs.paddingTop).toBe('0px');
    await expect(fs.marginLeft).toBe('0px');
    const legend = getComputedStyle(canvasElement.querySelector('legend')!);
    await expect(legend.paddingLeft).toBe('0px');
  },
};
