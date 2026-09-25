import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Menu, MenuItem, MenuSection, Icon } from 'ionbase-ui';
import {
  Archive,
  Bell,
  Copy,
  Palette,
  Pencil,
  Shield,
  Trash2,
  User,
} from 'lucide-react';

/** What `onSelectionChange` hands back: every key, or the set of them. */
type Selection = 'all' | Set<string | number>;

const meta: Meta<typeof Menu> = {
  title: 'Components/Menu',
  component: Menu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Menu`, `Menu Item` and `Menu Section Title`. A real ARIA menu: one tab stop, arrow keys, Home and End, typeahead, and disabled rows listed but skipped.\n\nFigma's `Type` is `selectionMode` — Single draws one check, Multi several — and with a selection mode the rows are `menuitemradio` or `menuitemcheckbox` and announce their checked state.\n\nMenu is still the **surface**: what opens it and where it sits is the caller's until MenuTrigger exists. Every `MenuItem` needs a `key`; `onAction` and `selectedKeys` speak in keys.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Menu>;

export const Default: Story = {
  render: () => (
    <Menu
      aria-label="Account"
      style={{ width: 240 }}
      onAction={(key) => console.log(key)}
    >
      <MenuItem key="account" icon={<Icon as={User} />}>
        Account settings
      </MenuItem>
      <MenuItem key="notifications" icon={<Icon as={Bell} />}>
        Notifications
      </MenuItem>
      <MenuItem key="appearance" icon={<Icon as={Palette} />}>
        Appearance
      </MenuItem>
      <MenuItem key="privacy" icon={<Icon as={Shield} />}>
        Privacy
      </MenuItem>
    </Menu>
  ),
};

/** Figma Type=Single. One current choice; the rows are `menuitemradio`. */
export const SingleSelection: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<Selection>(
      new Set(['appearance']),
    );
    return (
      <Menu
        aria-label="Settings page"
        style={{ width: 240 }}
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={setSelected}
      >
        <MenuItem key="account">Account settings</MenuItem>
        <MenuItem key="notifications">Notifications</MenuItem>
        <MenuItem key="appearance">Appearance</MenuItem>
        <MenuItem key="privacy">Privacy</MenuItem>
      </Menu>
    );
  },
};

/** Figma Type=Multi. Independent toggles; the rows are `menuitemcheckbox`. */
export const MultipleSelection: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<Selection>(
      new Set(['account', 'appearance']),
    );
    return (
      <Menu
        aria-label="Visible columns"
        style={{ width: 240 }}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={setSelected}
      >
        <MenuItem key="account">Account settings</MenuItem>
        <MenuItem key="notifications">Notifications</MenuItem>
        <MenuItem key="appearance">Appearance</MenuItem>
        <MenuItem key="privacy" isDisabled>
          Privacy
        </MenuItem>
      </Menu>
    );
  },
};

/**
 * Figma `Menu Section Title` is the titled heading. An untitled section takes
 * `aria-label` and is set off by a rule instead.
 */
export const Sections: Story = {
  render: () => (
    <Menu aria-label="Row actions" style={{ width: 240 }}>
      <MenuSection title="Edit">
        <MenuItem key="rename" icon={<Icon as={Pencil} />}>
          Rename
        </MenuItem>
        <MenuItem key="duplicate" icon={<Icon as={Copy} />}>
          Duplicate
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="Danger">
        <MenuItem key="archive" icon={<Icon as={Archive} />}>
          Archive
        </MenuItem>
        <MenuItem key="delete" icon={<Icon as={Trash2} />}>
          Delete
        </MenuItem>
      </MenuSection>
    </Menu>
  ),
};

// ------------------------------------------------------------------ tests

/** The role is claimed because its promises are now kept. */
export const IsARealMenu: Story = {
  render: () => (
    <Menu aria-label="Account" style={{ width: 240 }}>
      <MenuItem key="one">One</MenuItem>
      <MenuItem key="two">Two</MenuItem>
    </Menu>
  ),
  play: async ({ canvas }) => {
    const menu = canvas.getByRole('menu', { name: 'Account' });
    await expect(canvas.getAllByRole('menuitem')).toHaveLength(2);

    // One tab stop: Tab lands on the first row, and Tab again leaves the menu.
    await userEvent.tab();
    await expect(canvas.getByRole('menuitem', { name: 'One' })).toHaveFocus();
    await userEvent.tab();
    await expect(menu.contains(document.activeElement)).toBe(false);
  },
};

export const ArrowKeysSkipDisabledRows: Story = {
  render: () => (
    <Menu aria-label="Account" style={{ width: 240 }}>
      <MenuItem key="one">One</MenuItem>
      <MenuItem key="two" isDisabled>
        Two
      </MenuItem>
      <MenuItem key="three">Three</MenuItem>
    </Menu>
  ),
  play: async ({ canvas }) => {
    const two = canvas.getByRole('menuitem', { name: 'Two' });
    // Listed and announced as unavailable, not removed.
    await expect(two).toHaveAttribute('aria-disabled', 'true');

    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Three' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByRole('menuitem', { name: 'One' })).toHaveFocus();
  },
};

export const HomeEndAndTypeahead: Story = {
  render: () => (
    <Menu aria-label="Account" style={{ width: 240 }}>
      <MenuItem key="account">Account settings</MenuItem>
      <MenuItem key="notifications">Notifications</MenuItem>
      <MenuItem key="appearance">Appearance</MenuItem>
      <MenuItem key="privacy">Privacy</MenuItem>
    </Menu>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab();
    await userEvent.keyboard('{End}');
    await expect(
      canvas.getByRole('menuitem', { name: 'Privacy' }),
    ).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(
      canvas.getByRole('menuitem', { name: 'Account settings' }),
    ).toHaveFocus();
    await userEvent.keyboard('n');
    await expect(
      canvas.getByRole('menuitem', { name: 'Notifications' }),
    ).toHaveFocus();
  },
};

/** Keyboard and pointer reach the same handler, with the item's key. */
export const OnActionReceivesTheKey: Story = {
  args: { onAction: fn() },
  render: (args) => (
    <Menu
      aria-label="Row actions"
      style={{ width: 240 }}
      onAction={args.onAction}
    >
      <MenuItem key="rename">Rename</MenuItem>
      <MenuItem key="duplicate">Duplicate</MenuItem>
    </Menu>
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Duplicate' }));
    await expect(
      (args.onAction as ReturnType<typeof fn>).mock.lastCall?.[0],
    ).toBe('duplicate');

    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{Enter}');
    await expect(
      (args.onAction as ReturnType<typeof fn>).mock.lastCall?.[0],
    ).toBe('rename');
  },
};

/** The check is never the only signal: the checked state is announced. */
export const SelectionIsAnnounced: Story = {
  ...SingleSelection,
  play: async ({ canvas }) => {
    const radios = canvas.getAllByRole('menuitemradio');
    await expect(radios).toHaveLength(4);
    await expect(
      canvas.getByRole('menuitemradio', { name: 'Appearance' }),
    ).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(
      canvas.getByRole('menuitemradio', { name: 'Privacy' }),
    );
    await expect(
      canvas.getByRole('menuitemradio', { name: 'Privacy' }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      canvas.getByRole('menuitemradio', { name: 'Appearance' }),
    ).toHaveAttribute('aria-checked', 'false');
  },
};

export const MultipleSelectionToggles: Story = {
  ...MultipleSelection,
  play: async ({ canvas }) => {
    const notifications = canvas.getByRole('menuitemcheckbox', {
      name: 'Notifications',
    });
    await expect(notifications).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(notifications);
    await expect(notifications).toHaveAttribute('aria-checked', 'true');
    // The others keep theirs — independent toggles, not one choice.
    await expect(
      canvas.getByRole('menuitemcheckbox', { name: 'Account settings' }),
    ).toHaveAttribute('aria-checked', 'true');
  },
};

export const SectionsAreNamedGroups: Story = {
  ...Sections,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('group', { name: 'Edit' })).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Danger' })).toBeVisible();
    // The untitled section is set off by a rule; the titled first one is not.
    await expect(
      canvasElement.querySelectorAll('[role="separator"]'),
    ).toHaveLength(1);

    // Arrow keys cross from one section into the next.
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(
      canvas.getByRole('menuitem', { name: 'Archive' }),
    ).toHaveFocus();
  },
};

/** Figma: menu padding 6, gap 2, radius/xl; item 40 tall with 8/12 padding. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <Menu aria-label="Geometry" style={{ width: 240 }}>
      <MenuItem key="one">One</MenuItem>
      <MenuItem key="two">Two</MenuItem>
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
 * With a selection mode, the check occupies its slot whether or not it shows,
 * so selecting a row cannot reflow the list. Visibility, not display.
 */
export const CheckHoldsItsSlot: Story = {
  render: () => (
    <Menu
      aria-label="Slot"
      style={{ width: 240 }}
      selectionMode="single"
      defaultSelectedKeys={['on']}
    >
      <MenuItem key="off">Unselected</MenuItem>
      <MenuItem key="on">Selected</MenuItem>
    </Menu>
  ),
  play: async ({ canvas, canvasElement }) => {
    const items = canvasElement.querySelectorAll('.ion-menu__item');
    const a = items[0].getBoundingClientRect();
    const b = items[1].getBoundingClientRect();
    await expect(Math.round(a.width)).toBe(Math.round(b.width));
    await expect(Math.round(a.height)).toBe(Math.round(b.height));

    const unchecked = canvas
      .getByText('Unselected')
      .closest('.ion-menu__item')!
      .querySelector('.ion-menu__check') as HTMLElement;
    await expect(getComputedStyle(unchecked).visibility).toBe('hidden');
  },
};

/** An action menu has nothing to check, so it reserves no slot for one. */
export const NoCheckSlotWithoutSelection: Story = {
  render: () => (
    <Menu aria-label="Actions" style={{ width: 240 }}>
      <MenuItem key="one">One</MenuItem>
    </Menu>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.ion-menu__check')).toBeNull();
  },
};

/**
 * The 0.81 API, for one minor: `isSelected` on the items still selects when
 * Menu is given no `selectedKeys`, and now announces it as a checked
 * `menuitemradio` rather than a pressed button.
 */
export const DeprecatedIsSelectedStillSelects: Story = {
  render: () => (
    <Menu aria-label="Legacy" style={{ width: 240 }}>
      {/* eslint-disable-next-line ionbase-ui/no-deprecated-props */}
      <MenuItem key="off" isSelected={false}>
        Off
      </MenuItem>
      {/* eslint-disable-next-line ionbase-ui/no-deprecated-props */}
      <MenuItem key="on" isSelected>
        On
      </MenuItem>
    </Menu>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('menuitemradio', { name: 'On' }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      canvas.getByRole('menuitemradio', { name: 'Off' }),
    ).toHaveAttribute('aria-checked', 'false');
  },
};

/**
 * The deprecated `disabled` alias, for one minor. react-stately knows an
 * item's `isDisabled` on its own; `disabled` it has never heard of, so Menu
 * has to pass it on as a key — or the row looks disabled and still takes focus.
 */
export const DeprecatedDisabledIsSkipped: Story = {
  render: () => (
    <Menu aria-label="Legacy" style={{ width: 240 }}>
      <MenuItem key="one">One</MenuItem>
      {/* eslint-disable-next-line ionbase-ui/no-deprecated-props */}
      <MenuItem key="two" disabled>
        Two
      </MenuItem>
      <MenuItem key="three">Three</MenuItem>
    </Menu>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('menuitem', { name: 'Two' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Three' })).toHaveFocus();
  },
};
