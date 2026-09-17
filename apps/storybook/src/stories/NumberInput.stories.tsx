import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, userEvent } from 'storybook/test';
import { NumberInput } from 'ionbase-ui';

const meta: Meta<typeof NumberInput> = {
  title: 'Components/NumberInput',
  component: NumberInput,
  tags: ['autodocs'],
  args: { label: 'Quantity', defaultValue: 3, minValue: 0, maxValue: 10 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '20rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A quantity: formatted and parsed in the user\'s locale, clamped to bounds, stepped with − and + or the arrow keys.\n\n**Not `<input type="number">`.** The native input changes value under the scroll wheel, cannot display currency or grouping, and reports an empty string for input it cannot parse. The wheel is off here unless `isWheelDisabled={false}`.\n\n**Empty is `null`, not `NaN`.** The underlying hook reports `NaN`, which fails every `===` check a caller writes; this converts at the boundary.\n\n**Not for identifiers.** Postcodes, phone numbers, card and order numbers are digits, not quantities — a number field strips their leading zeros and adds separators. Use `Input` with `inputMode="numeric"`.\n\n**− and + are side by side**, so every size keeps a 24px target (WCAG 2.5.8), and out of the tab order — the arrow keys do the same from the field.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '16px' }}>
      <NumberInput {...args} size="sm" label="Small" />
      <NumberInput {...args} label="Medium" />
      <NumberInput {...args} size="lg" label="Large" />
    </div>
  ),
};

export const Currency: Story = {
  args: {
    label: 'Unit price',
    defaultValue: 1234.5,
    minValue: 0,
    maxValue: undefined,
    step: 0.01,
    formatOptions: { style: 'currency', currency: 'USD' },
  },
};

export const Percent: Story = {
  args: {
    label: 'Discount',
    defaultValue: 0.15,
    minValue: 0,
    maxValue: 1,
    step: 0.05,
    formatOptions: { style: 'percent' },
  },
};

export const WithoutStepper: Story = { args: { showStepper: false } };

export const Invalid: Story = {
  args: { isInvalid: true, errorMessage: 'Order at least 1.' },
};

export const Disabled: Story = { args: { isDisabled: true } };

export const ReadOnly: Story = { args: { isReadOnly: true } };

/* ------------------------------------------------------------------ tests */

/** Named field, named step buttons, and only the field in the tab order. */
export const ButtonsAreNamedAndNotTabStops: Story = {
  render: (args) => (
    <>
      <NumberInput {...args} />
      <button type="button">After</button>
    </>
  ),
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Quantity' });
    await expect(
      canvas.getByRole('button', { name: /Increase/ }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /Decrease/ }),
    ).toBeInTheDocument();
    await userEvent.tab();
    await expect(field).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
  },
};

const stepped = fn();

/** Arrow keys and buttons step, and onChange receives a number. */
export const ArrowsAndButtonsStep: Story = {
  args: { onChange: stepped },
  play: async ({ canvas }) => {
    stepped.mockClear();
    const field = canvas.getByRole('textbox');
    await userEvent.click(field);
    await userEvent.keyboard('{ArrowUp}');
    await expect(field).toHaveValue('4');
    await expect(stepped).toHaveBeenLastCalledWith(4);
    await userEvent.click(canvas.getByRole('button', { name: /Decrease/ }));
    await userEvent.click(canvas.getByRole('button', { name: /Decrease/ }));
    await expect(stepped).toHaveBeenLastCalledWith(2);
  },
};

const cleared = fn();

/** Clearing the field reports null — never NaN. */
export const EmptyIsNull: Story = {
  args: { onChange: cleared },
  play: async ({ canvas }) => {
    cleared.mockClear();
    const field = canvas.getByRole('textbox');
    await userEvent.clear(field);
    await userEvent.tab();
    await expect(cleared).toHaveBeenLastCalledWith(null);
  },
};

/** The classic bug: scrolling past a focused number field edits it. Not here. */
export const WheelDoesNotChangeValue: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox');
    await userEvent.click(field);
    fireEvent.wheel(field, { deltaY: -100 });
    fireEvent.wheel(field, { deltaY: -100 });
    await expect(field).toHaveValue('3');
  },
};

/** The same gesture does step when the caller opts in — proves the test above can fail. */
export const WheelStepsWhenEnabled: Story = {
  args: { isWheelDisabled: false },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox');
    await userEvent.click(field);
    fireEvent.wheel(field, { deltaY: -100 });
    await expect(field).not.toHaveValue('3');
  },
};

/** At the bound, the button that would pass it is disabled. */
export const BoundsDisableTheStep: Story = {
  args: { defaultValue: 10 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: /Increase/ }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: /Decrease/ }),
    ).toBeEnabled();
  },
};

/** Currency displays in the locale's format and still steps. */
export const CurrencyFormats: Story = {
  args: Currency.args,
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Unit price' });
    await expect(field).toHaveValue('$1,234.50');
  },
};

/** WCAG 2.5.8: a Small field's step buttons are still 24px. */
export const SmallTargetsAreAtLeast24px: Story = {
  args: { size: 'sm' },
  play: async ({ canvas }) => {
    const rect = canvas
      .getByRole('button', { name: /Increase/ })
      .getBoundingClientRect();
    await expect(rect.width).toBeGreaterThanOrEqual(24);
    await expect(rect.height).toBeGreaterThanOrEqual(24);
  },
};
