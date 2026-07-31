import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Select } from '@ionbase-ui/react';

const OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In review' },
  { value: 'published', label: 'Published' },
];

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    isInvalid: { control: 'boolean' },
    isDisabled: { control: 'boolean' },
  },
  args: { options: OPTIONS, placeholder: 'Select an option' },
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Select` (82:379). Three sizes, six states. Geometry is identical to Input; the differences are a chevron in place of the trailing icon, and no Read-only state. Invalid was 2px here and 1px on Input; that was drift rather than intent, and both are now 2px bound to `border-width/thick`.\n\nWraps a native `<select>`. React Aria's `useSelect` builds a listbox in a popover, which is right when the menu needs custom rows — but Figma models only the trigger here, and the dropdown list is a separate component on the Menu page.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = { args: { 'aria-label': 'Status' } };

export const Sizes: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: 240,
      }}
    >
      <Select {...args} size="sm" aria-label="Small" />
      <Select {...args} size="md" aria-label="Medium" />
      <Select {...args} size="lg" aria-label="Large" />
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: 240,
      }}
    >
      <Select {...args} aria-label="Default" />
      <Select {...args} defaultValue="review" aria-label="Filled" />
      <Select {...args} isInvalid defaultValue="review" aria-label="Invalid" />
      <Select {...args} isDisabled aria-label="Disabled" />
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
        width: 240,
      }}
    >
      <Select {...args} label="Status" description="Helper text" />
      <Select
        {...args}
        label="Status"
        description="Helper text"
        errorMessage="Pick a status"
        isInvalid
      />
    </div>
  ),
};

/**
 * Same measurement discipline as Input: rendered pixels, and the inset rather
 * than the padding, because Figma's stroke is drawn inside the frame.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: (args) => <Select {...args} aria-label="Status" />,
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Status');
    const box = field.closest('.ion-select') as HTMLElement;
    const cs = getComputedStyle(box);

    await expect(Math.round(box.getBoundingClientRect().height)).toBe(40);
    await expect(
      parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth),
    ).toBe(12);
    await expect(cs.columnGap).toBe('8px');
    await expect(cs.borderRadius).toBe('8px');
    await expect(cs.fontSize).toBe('16px');
  },
};

export const SmallAndLargeGeometry: Story = {
  render: (args) => (
    <div>
      <Select {...args} size="sm" aria-label="Small" />
      <Select {...args} size="lg" aria-label="Large" />
    </div>
  ),
  play: async ({ canvas }) => {
    const small = canvas
      .getByLabelText('Small')
      .closest('.ion-select') as HTMLElement;
    const large = canvas
      .getByLabelText('Large')
      .closest('.ion-select') as HTMLElement;

    const sm = getComputedStyle(small);
    await expect(Math.round(small.getBoundingClientRect().height)).toBe(32);
    await expect(
      parseFloat(sm.paddingLeft) + parseFloat(sm.borderLeftWidth),
    ).toBe(12);
    await expect(sm.borderRadius).toBe('6px');
    await expect(sm.fontSize).toBe('14px');

    const lg = getComputedStyle(large);
    await expect(Math.round(large.getBoundingClientRect().height)).toBe(48);
    await expect(
      parseFloat(lg.paddingLeft) + parseFloat(lg.borderLeftWidth),
    ).toBe(16);
    await expect(lg.borderRadius).toBe('8px');
  },
};

/**
 * Invalid is 2px, matching Focus and matching Input.
 *
 * At 1px the invalid state differed from default only in hue — the exact
 * failure mode WCAG 1.4.1 exists for, since error has to be perceivable without
 * relying on colour. Input was the one that was wrong; both are now bound to
 * `border-width/thick` in Figma, so neither can drift from the other again.
 */
export const InvalidBorderIsTwoPixels: Story = {
  render: (args) => <Select {...args} isInvalid aria-label="Status" />,
  play: async ({ canvas }) => {
    const box = canvas
      .getByLabelText('Status')
      .closest('.ion-select') as HTMLElement;
    await expect(getComputedStyle(box).borderLeftWidth).toBe('2px');
    // The inset still resolves to 12px, so the value does not move.
    const cs = getComputedStyle(box);
    await expect(
      parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth),
    ).toBe(12);
  },
};

/**
 * The placeholder is a real disabled option, so an empty Select cannot be
 * submitted as a valid choice, and the value sits at text/tertiary until
 * something is picked.
 */
export const PlaceholderIsNotSelectable: Story = {
  render: (args) => <Select {...args} aria-label="Status" />,
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Status') as HTMLSelectElement;
    const box = field.closest('.ion-select') as HTMLElement;

    await expect(box.classList.contains('ion-select--placeholder')).toBe(true);
    await expect(field.options[0].disabled).toBe(true);
    await expect(field.options[0].text).toBe('Select an option');

    /*
     * The load-bearing assertion, and the one this component originally failed.
     *
     * A browser will not auto-select a disabled <option>, so an uncontrolled
     * Select skipped the placeholder and displayed "Draft" — reporting a value
     * the user never chose. Every other check passed while it did: the class
     * was applied, the option existed and was disabled, the geometry was right.
     * Only the rendered value was wrong, and only a screenshot showed it.
     */
    await expect(field.value).toBe('');
    await expect(field.selectedIndex).toBe(0);
  },
};

/** A picked value drops the placeholder styling — Figma's Filled state. */
export const FilledDropsPlaceholderStyling: Story = {
  render: (args) => (
    <Select {...args} defaultValue="review" aria-label="Status" />
  ),
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Status') as HTMLSelectElement;
    const box = field.closest('.ion-select') as HTMLElement;

    await expect(field.value).toBe('review');
    await expect(box.classList.contains('ion-select--placeholder')).toBe(false);
  },
};
