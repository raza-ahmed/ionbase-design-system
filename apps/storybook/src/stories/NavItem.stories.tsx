import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { NavItem } from '@ionbase-ui/react';
import { Icon } from '@ionbase-ui/icons';
import { Settings } from 'lucide-react';

const meta: Meta<typeof NavItem> = {
  title: 'Components/NavItem',
  component: NavItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Nav Item` (70:22078). Two states: Default, Hover.\n\nUnlike Button, Menu Item or Table Row, hover recolours text and icon only — no background fill. Reproduced as measured: a primary nav bar sitting directly on the header's own surface has nothing to contrast a hover fill against without inventing a colour Figma never specified.\n\nRenders `<a>` when given `href`, `<button>` otherwise — the same judgment call Menu and Select make about which element the caller is actually building.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof NavItem>;

export const AsLink: Story = {
  render: () => <NavItem href="/products">Products</NavItem>,
};

export const AsButtonWithChevron: Story = {
  render: () => (
    <NavItem showChevron onClick={() => {}}>
      Products
    </NavItem>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <NavItem href="/settings" icon={<Icon as={Settings} />}>
      Settings
    </NavItem>
  ),
};

export const Disabled: Story = {
  render: () => (
    <NavItem isDisabled showChevron>
      Unavailable
    </NavItem>
  ),
};

/** Figma: 8px padding all round, 4px gap, radius/sm. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => <NavItem href="/products">Products</NavItem>,
  play: async ({ canvas }) => {
    const item = canvas.getByRole('link');
    const cs = getComputedStyle(item);

    await expect(cs.padding).toBe('8px');
    await expect(cs.columnGap).toBe('4px');
    await expect(cs.borderRadius).toBe('6px');
  },
};

/**
 * Hover recolours text and icon; it never sets a background. Driven by a real
 * `userEvent.hover`, not a forced prop — `data-hovered` is computed by the
 * component from React Aria's own hover state, so anything passed in from a
 * story would just be overwritten by it.
 */
export const HoverHasNoBackground: Story = {
  render: () => <NavItem href="/products">Products</NavItem>,
  play: async ({ canvas, userEvent }) => {
    const item = canvas.getByRole('link');
    await userEvent.hover(item);
    await expect(item).toHaveAttribute('data-hovered', 'true');

    const cs = getComputedStyle(item);
    await expect(cs.backgroundColor).toBe('rgba(0, 0, 0, 0)');

    const hoverColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-interactive-hover')
      .trim();
    const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(hoverColor.slice(i, i + 2), 16)).join(', ')})`;
    // `color` is a 150ms transition, not an instant flip — give it time to
    // finish before reading the computed value.
    await waitFor(async () => {
      await expect(cs.color).toBe(rgb);
    });
  },
};

/**
 * Disabled recolours text to `text/disabled`. There is no dedicated
 * "disabled while hovered" test the way Checkbox needed one: `useHover` is
 * given `isDisabled` and deliberately never reports a disabled element as
 * hovered, so that combination cannot occur through real interaction — the
 * CSS `:not()` guard is defence in depth, not covering a reachable state.
 */
export const DisabledIsRecoloured: Story = {
  render: () => <NavItem isDisabled>Unavailable</NavItem>,
  play: async ({ canvas }) => {
    const item = canvas.getByRole('button');
    const cs = getComputedStyle(item);

    const disabledColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-disabled')
      .trim();
    const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(disabledColor.slice(i, i + 2), 16)).join(', ')})`;
    await expect(cs.color).toBe(rgb);
  },
};

/** `href` renders a link; its absence renders a button — chosen by what the
 *  caller actually passes, not a separate `as` prop. */
export const ElementMatchesIntent: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <NavItem href="/products">Link</NavItem>
      <NavItem onClick={() => {}}>Button</NavItem>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Link' })).toBeTruthy();
    await expect(canvas.getByRole('button', { name: 'Button' })).toBeTruthy();
  },
};
