import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Input } from '@ionbase-ui/react';
import { Icon } from '@ionbase-ui/icons';
import { Search, X } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    isInvalid: { control: 'boolean' },
    isDisabled: { control: 'boolean' },
    isReadOnly: { control: 'boolean' },
  },
  args: { placeholder: 'Placeholder' },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Input` (80:275) and `Form Field` (80:330). Three sizes, seven states. Passing a `label` or `description` renders the Form Field wrapper; without either, the bare field is returned.\n\nInput deliberately does **not** read the control scale for padding: Figma pins padding-x to 12/12/16 where `control` says 12/16/20, and the Large icon to 20 where `control/lg/icon-size` is 24.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { 'aria-label': 'Field' } };

export const Sizes: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: 280,
      }}
    >
      <Input {...args} size="sm" placeholder="Small" aria-label="Small" />
      <Input {...args} size="md" placeholder="Medium" aria-label="Medium" />
      <Input {...args} size="lg" placeholder="Large" aria-label="Large" />
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div style={{ width: 280 }}>
      <Input
        {...args}
        leadingIcon={<Icon as={Search} />}
        trailingIcon={<Icon as={X} />}
        placeholder="Search"
        aria-label="Search"
      />
    </div>
  ),
};

/**
 * The seven Figma states. Hover and Focus are interaction rather than props, so
 * they are exercised in the browser rather than pinned here.
 */
export const States: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: 280,
      }}
    >
      <Input {...args} placeholder="Default" aria-label="Default" />
      <Input {...args} defaultValue="Filled" aria-label="Filled" />
      <Input {...args} isInvalid defaultValue="Invalid" aria-label="Invalid" />
      <Input
        {...args}
        isReadOnly
        defaultValue="Read-only"
        aria-label="Read-only"
      />
      <Input
        {...args}
        isDisabled
        placeholder="Disabled"
        aria-label="Disabled"
      />
    </div>
  ),
};

export const FormField: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: 280,
      }}
    >
      <Input {...args} label="Label" description="Helper text" />
      <Input
        {...args}
        label="Label"
        description="Helper text"
        errorMessage="Something is wrong"
        isInvalid
      />
      <Input {...args} label="Label" description="Helper text" isDisabled />
    </div>
  ),
};

/**
 * Geometry is asserted in rendered pixels, not by reading tokens back to
 * themselves — a token can resolve perfectly and still not match the design.
 *
 * The load-bearing assertion is the inset. Figma's stroke is drawn INSIDE the
 * frame, so its 12px padding is measured from the outer edge; a CSS border sits
 * outside the padding box, so padding must render 1px short for the text to
 * land where Figma puts it. Checking `padding-left` alone would pass while the
 * text sat a pixel too far in.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: (args) => <Input {...args} aria-label="Field" />,
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Field');
    const box = field.closest('.ion-input') as HTMLElement;
    const cs = getComputedStyle(box);

    // Figma: Medium is 40px tall with a 12px inset and an 8px gap.
    await expect(Math.round(box.getBoundingClientRect().height)).toBe(40);
    await expect(
      parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth),
    ).toBe(12);
    await expect(cs.columnGap).toBe('8px');
    await expect(cs.borderRadius).toBe('8px');
    await expect(cs.borderLeftWidth).toBe('1px');
    await expect(cs.fontSize).toBe('16px');
  },
};

/**
 * Small shares Medium's 12px padding — it was 10px and unbound in Figma, the
 * one measurement in either component that no token check could see. Height,
 * gap, radius and the type ramp still separate the two sizes, and those are
 * what this pins.
 */
export const SmallAndLargeGeometry: Story = {
  render: (args) => (
    <div>
      <Input {...args} size="sm" aria-label="Small" />
      <Input {...args} size="lg" aria-label="Large" />
    </div>
  ),
  play: async ({ canvas }) => {
    const small = canvas
      .getByLabelText('Small')
      .closest('.ion-input') as HTMLElement;
    const large = canvas
      .getByLabelText('Large')
      .closest('.ion-input') as HTMLElement;

    const sm = getComputedStyle(small);
    await expect(Math.round(small.getBoundingClientRect().height)).toBe(32);
    await expect(
      parseFloat(sm.paddingLeft) + parseFloat(sm.borderLeftWidth),
    ).toBe(12);
    await expect(sm.columnGap).toBe('6px');
    await expect(sm.borderRadius).toBe('6px');
    await expect(sm.fontSize).toBe('14px');

    const lg = getComputedStyle(large);
    await expect(Math.round(large.getBoundingClientRect().height)).toBe(48);
    await expect(
      parseFloat(lg.paddingLeft) + parseFloat(lg.borderLeftWidth),
    ).toBe(16);
    // Large keeps Medium's radius and type ramp — only height and padding grow.
    await expect(lg.borderRadius).toBe('8px');
    await expect(lg.fontSize).toBe('16px');
  },
};

/**
 * Focus thickens the border from 1px to 2px. Because the padding subtracts the
 * live border width, the text must not move — that is the whole reason for the
 * calc, and it would regress silently without this check.
 */
export const FocusDoesNotShiftText: Story = {
  render: (args) => <Input {...args} aria-label="Field" />,
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Field') as HTMLInputElement;
    const box = field.closest('.ion-input') as HTMLElement;

    const before = field.getBoundingClientRect().left;
    field.focus();
    const after = field.getBoundingClientRect().left;

    await expect(getComputedStyle(box).borderLeftWidth).toBe('2px');
    await expect(Math.round(after - before)).toBe(0);
  },
};

/**
 * Invalid is 2px, matching Focus and matching Select.
 *
 * This was 1px until the stroke weights were bound in Figma. At 1px the invalid
 * state differed from default only in hue, which fails WCAG 1.4.1 — error has
 * to be perceivable without relying on colour. Neither component bound its
 * stroke weight, which is why the two were allowed to disagree at all.
 */
export const InvalidBorderIsTwoPixels: Story = {
  render: (args) => <Input {...args} isInvalid aria-label="Field" />,
  play: async ({ canvas }) => {
    const box = canvas
      .getByLabelText('Field')
      .closest('.ion-input') as HTMLElement;
    const cs = getComputedStyle(box);

    await expect(cs.borderLeftWidth).toBe('2px');
    // The inset still resolves to 12px, so the value does not move.
    await expect(
      parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth),
    ).toBe(12);
  },
};

/**
 * The label must actually label the input and the helper must actually
 * describe it. `useTextField` wires both; this proves the wiring survived.
 */
export const LabelAndHelperAreWired: Story = {
  render: (args) => (
    <Input {...args} label="Email" description="We never share it" />
  ),
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Email');
    const describedBy = field.getAttribute('aria-describedby');
    await expect(describedBy).toBeTruthy();
    await expect(
      document.getElementById(describedBy!.split(' ')[0])?.textContent,
    ).toBe('We never share it');
  },
};

/** When invalid, the error message replaces the helper rather than stacking. */
export const ErrorMessageReplacesHelper: Story = {
  render: (args) => (
    <Input
      {...args}
      label="Email"
      description="We never share it"
      errorMessage="Enter a valid address"
      isInvalid
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    const field = canvas.getByLabelText('Email');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.queryByText('We never share it')).toBeNull();

    const helper = canvasElement.querySelector(
      '.ion-field__helper',
    ) as HTMLElement;
    await expect(helper.textContent).toBe('Enter a valid address');

    /*
     * Figma's Error variant recolours the helper and nothing else on the stack.
     * Resolved against the token rather than a literal, so the assertion still
     * holds when the error ramp is retuned in Figma — as the warning ramp just
     * was.
     */
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-error')
      .trim();
    const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
    await expect(getComputedStyle(helper).color).toBe(rgb);
  },
};
