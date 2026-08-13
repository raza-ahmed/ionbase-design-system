import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { PhoneInput } from 'ionbase-ui';

const meta: Meta<typeof PhoneInput> = {
  title: 'Components/PhoneInput',
  component: PhoneInput,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    isDisabled: { control: 'boolean' },
    isInvalid: { control: 'boolean' },
    isReadOnly: { control: 'boolean' },
  },
  args: {
    size: 'md',
    dialCode: '+1',
    placeholder: '(555) 000-0000',
    // Stories that show no visible label still need an accessible name —
    // `useTextField` warns otherwise, and the a11y addon would flag it. Stories
    // below that pass a real `label` override this.
    'aria-label': 'Phone number',
  },
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Input/Phone` (80:372). A dial-code block butted against an Input, sharing one outline.\n\nThree sizes and no State axis — every state belongs to the Input and is reached through the ordinary props, because Figma composes this from the same `Input` instance rather than redrawing it.\n\n**It does not pick countries.** The chevron implies a menu and Figma specifies no open state for it. Country data and the picker are application concerns; `countryButtonProps` is how you attach your own, including the `aria-haspopup` and `aria-expanded` only the popup's owner can set honestly.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PhoneInput>;

export const Default: Story = {};

export const AllSizes: Story = {
  render: (args) => (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      data-testid="sizes"
    >
      <PhoneInput {...args} size="sm" />
      <PhoneInput {...args} size="md" />
      <PhoneInput {...args} size="lg" />
    </div>
  ),
};

export const WithLabel: Story = {
  args: { label: 'Phone number', description: "We'll only use this to call." },
};

export const Invalid: Story = {
  args: {
    label: 'Phone number',
    isInvalid: true,
    errorMessage: 'Enter a valid phone number.',
    value: '555',
  },
};

export const Disabled: Story = {
  args: { label: 'Phone number', isDisabled: true },
};

export const LongDialCode: Story = {
  args: { dialCode: '+880', label: 'Phone number' },
};

/**
 * The label must wrap the whole control, not half of it.
 *
 * `Input` renders the addon and the box inside one `.ion-input-group`, and the
 * `.ion-field` wrapper encloses that group. Building the dial-code block
 * outside `Input` instead would put the label above only the field and leave
 * the addon dangling beside a wrapper it is not in — visually almost right,
 * and wrong in the accessibility tree.
 *
 * Asserted through `getByLabelText`, which resolves the same `aria-labelledby`
 * a screen reader follows, rather than by inspecting the DOM shape.
 */
export const LabelWiringSurvivesTheAddon: Story = {
  args: { label: 'Phone number', description: 'Mobile only.' },
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Phone number');
    await expect(field.tagName).toBe('INPUT');
    await expect(field).toHaveAttribute('type', 'tel');

    // The group is what the wrapper contains, and it holds both halves.
    const group = field.closest('.ion-input-group');
    await expect(group).not.toBeNull();
    await expect(
      group!.querySelector('.ion-phone-input__country'),
    ).not.toBeNull();
    await expect(group!.closest('.ion-field')).not.toBeNull();

    // The description is wired too — `useTextField` points aria-describedby at
    // it, and the addon must not have displaced that.
    const describedBy = field.getAttribute('aria-describedby');
    await expect(describedBy).toBeTruthy();
    await expect(document.getElementById(describedBy!)?.textContent).toBe(
      'Mobile only.',
    );
  },
};

/**
 * The seam, measured.
 *
 * Figma butts the two frames with no gap and both keep a full 1px stroke, so
 * the divider is 2px and the facing corners are square. This asserts the
 * rendered geometry rather than the stylesheet: that the block's right edge is
 * the control's left edge, and that neither rounds the edge they share.
 *
 * The outer corners are checked in the same pass, because "square everywhere"
 * would satisfy a seam-only assertion while destroying the control's shape.
 */
export const SeamIsFlushAndSquare: Story = {
  play: async ({ canvas }) => {
    const country = canvas.getByRole('button', {
      name: 'Select country calling code',
    });
    const field = canvas.getByRole('textbox');
    const box = field.closest('.ion-input')!;

    const a = country.getBoundingClientRect();
    const b = box.getBoundingClientRect();

    // Flush: no gap, no overlap.
    await expect(Math.abs(a.right - b.left)).toBeLessThan(0.5);
    // And the same height, so the shared outline is unbroken.
    await expect(Math.abs(a.height - b.height)).toBeLessThan(0.5);

    const cs = getComputedStyle(country);
    const bs = getComputedStyle(box);

    // Facing corners square.
    await expect(cs.borderTopRightRadius).toBe('0px');
    await expect(cs.borderBottomRightRadius).toBe('0px');
    await expect(bs.borderTopLeftRadius).toBe('0px');
    await expect(bs.borderBottomLeftRadius).toBe('0px');

    // Outer corners rounded — 8px at Medium, from radius/md.
    await expect(cs.borderTopLeftRadius).toBe('8px');
    await expect(cs.borderBottomLeftRadius).toBe('8px');
    await expect(bs.borderTopRightRadius).toBe('8px');
    await expect(bs.borderBottomRightRadius).toBe('8px');
  },
};

/**
 * Height and radius per size, measured from the rendered box.
 *
 * 32/40/48 comes from the Input beside it — the block has no height of its own
 * and is stretched by the row, which is what stops the two halves drifting when
 * one ladder moves. Radius is the part that is easy to get wrong: Small is
 * `radius/sm` (6) where Medium and Large are `radius/md` (8), so a block pinned
 * to 8 would meet a 6px field at Small and only there.
 */
export const GeometryPerSize: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PhoneInput size="sm" aria-label="Small" placeholder="Small" />
      <PhoneInput size="md" aria-label="Medium" placeholder="Medium" />
      <PhoneInput size="lg" aria-label="Large" placeholder="Large" />
    </div>
  ),
  play: async ({ canvas }) => {
    const expected = [
      { name: 'Small', height: 32, radius: '6px' },
      { name: 'Medium', height: 40, radius: '8px' },
      { name: 'Large', height: 48, radius: '8px' },
    ];

    const buttons = canvas.getAllByRole('button', {
      name: 'Select country calling code',
    });

    for (const [i, { name, height, radius }] of expected.entries()) {
      const country = buttons[i];
      const box = canvas.getByLabelText(name).closest('.ion-input')!;

      await expect(Math.round(box.getBoundingClientRect().height)).toBe(height);
      await expect(Math.round(country.getBoundingClientRect().height)).toBe(
        height,
      );

      // Both halves round in step.
      await expect(getComputedStyle(country).borderTopLeftRadius).toBe(radius);
      await expect(getComputedStyle(box).borderTopRightRadius).toBe(radius);
    }
  },
};

/**
 * A disabled field must not leave an operable dial-code button beside it.
 *
 * The trigger looks like it opens a picker, so leaving it live next to a field
 * you cannot edit offers an action that goes nowhere. It also covers the
 * deprecated `disabled` alias, which is resolved before the button is built —
 * the bug this guards is the alias disabling the input and not the button.
 */
export const DisabledDisablesBothHalves: Story = {
  args: { label: 'Phone number', disabled: true },
  play: async ({ canvas }) => {
    const country = canvas.getByRole('button', {
      name: 'Select country calling code',
    });
    await expect(country).toBeDisabled();
    await expect(canvas.getByLabelText('Phone number')).toBeDisabled();
  },
};

/**
 * `countryButtonProps` is the whole extension point, so it has to actually
 * reach the element — handler, ARIA and class alike — without clobbering the
 * component's own class names.
 */
export const CountryButtonPropsReachTheTrigger: Story = {
  args: {
    'aria-label': 'Phone number',
    countryButtonProps: {
      onClick: fn(),
      'aria-haspopup': 'listbox',
      'aria-expanded': false,
      className: 'app-country-trigger',
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    const country = canvas.getByRole('button', {
      name: 'Select country calling code',
    });

    await expect(country).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(country).toHaveClass('app-country-trigger');
    // ...and the component's own classes survive the merge.
    await expect(country).toHaveClass('ion-phone-input__country');

    await userEvent.click(country);
    await expect(args.countryButtonProps!.onClick).toHaveBeenCalledTimes(1);
  },
};
