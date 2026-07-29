import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Menu, MenuItem } from '@ionbase/react';
import { Icon } from '@ionbase/icons';
import { Bell, Palette, Shield, User } from 'lucide-react';

const meta: Meta<typeof Menu> = {
  title: 'Components/Menu',
  component: Menu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Menu` and `Menu Item`. Menu is the list **surface**, not a popover — Figma models the list alone, with no trigger, anchor or open state, so anchoring it is the caller\'s job.\n\n`role="menu"` is deliberately not set. A real ARIA menu owes the user roving-tabindex arrow keys, typeahead and focus containment; claiming the role without them is worse for a screen-reader user than an honest list.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Menu>;

export const Default: Story = {
  render: () => (
    <Menu style={{ width: 240 }}>
      <MenuItem icon={<Icon as={User} />}>Account settings</MenuItem>
      <MenuItem icon={<Icon as={Bell} />}>Notifications</MenuItem>
      <MenuItem icon={<Icon as={Palette} />} isSelected>
        Appearance
      </MenuItem>
      <MenuItem icon={<Icon as={Shield} />}>Privacy</MenuItem>
    </Menu>
  ),
};

export const WithoutIcons: Story = {
  render: () => (
    <Menu style={{ width: 240 }}>
      <MenuItem>Account settings</MenuItem>
      <MenuItem isSelected>Notifications</MenuItem>
      <MenuItem>Privacy</MenuItem>
    </Menu>
  ),
};

export const MultiSelect: Story = {
  render: () => (
    <Menu style={{ width: 240 }}>
      <MenuItem icon={<Icon as={User} />} isSelected>
        Account settings
      </MenuItem>
      <MenuItem icon={<Icon as={Bell} />}>Notifications</MenuItem>
      <MenuItem icon={<Icon as={Palette} />} isSelected>
        Appearance
      </MenuItem>
      <MenuItem icon={<Icon as={Shield} />} disabled>
        Privacy
      </MenuItem>
    </Menu>
  ),
};

/** Figma: menu padding 6, gap 2, radius/xl; item 40 tall with 8/12 padding. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <Menu style={{ width: 240 }}>
      <MenuItem>One</MenuItem>
      <MenuItem>Two</MenuItem>
    </Menu>
  ),
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('.ion-menu') as HTMLElement;
    const item = canvasElement.querySelector('.ion-menu__item') as HTMLElement;
    const cs = getComputedStyle(menu);

    await expect(cs.padding).toBe('6px');
    await expect(cs.rowGap).toBe('2px');
    await expect(cs.borderRadius).toBe('12px');

    await expect(Math.round(item.getBoundingClientRect().height)).toBe(40);
    await expect(getComputedStyle(item).paddingLeft).toBe('12px');
    await expect(getComputedStyle(item).columnGap).toBe('8px');
    await expect(getComputedStyle(item).borderRadius).toBe('6px');
  },
};

/**
 * The check occupies its slot whether or not it shows, so selecting a row
 * cannot reflow the list. Visibility, not display.
 */
export const CheckHoldsItsSlot: Story = {
  render: () => (
    <Menu style={{ width: 240 }}>
      <MenuItem>Unselected</MenuItem>
      <MenuItem isSelected>Selected</MenuItem>
    </Menu>
  ),
  play: async ({ canvas, canvasElement }) => {
    const items = canvasElement.querySelectorAll('.ion-menu__item');
    const a = items[0].getBoundingClientRect();
    const b = items[1].getBoundingClientRect();

    // Identical geometry despite one showing a check.
    await expect(Math.round(a.width)).toBe(Math.round(b.width));
    await expect(Math.round(a.height)).toBe(Math.round(b.height));

    const unchecked = canvas
      .getByText('Unselected')
      .closest('.ion-menu__item')!
      .querySelector('.ion-menu__check') as HTMLElement;
    await expect(getComputedStyle(unchecked).visibility).toBe('hidden');
  },
};

/**
 * Selection is exposed to assistive tech, not just painted.
 *
 * `aria-pressed` appears only when `isSelected` is actually passed. An item
 * that is never selectable should not claim to be a toggle, so omitting the
 * prop omits the attribute — which is why this story passes `false` explicitly
 * rather than leaving it off.
 */
export const SelectionIsAnnounced: Story = {
  render: () => (
    <Menu style={{ width: 240 }}>
      <MenuItem isSelected={false}>Off</MenuItem>
      <MenuItem isSelected>On</MenuItem>
      <MenuItem>Not selectable</MenuItem>
    </Menu>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'On' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // No prop, no claim.
    await expect(
      canvas.getByRole('button', { name: 'Not selectable' }),
    ).not.toHaveAttribute('aria-pressed');
  },
};
