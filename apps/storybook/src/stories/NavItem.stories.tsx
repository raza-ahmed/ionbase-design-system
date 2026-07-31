import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { NavItem, Icon } from 'ionbase-ui';
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

/**
 * A disabled link must not fire `onClick` from rest props — `aria-disabled`
 * alone does not stop handlers spread onto the `<a>`.
 */
export const DisabledLinkDoesNotFireOnClick: Story = {
  render: function Render() {
    const [clicked, setClicked] = React.useState(false);
    return (
      <>
        <NavItem
          href="/nowhere"
          isDisabled
          onClick={() => setClicked(true)}
          data-testid="disabled-nav-link"
        >
          Disabled link
        </NavItem>
        <span data-testid="click-flag">{clicked ? 'yes' : 'no'}</span>
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const link = canvas.getByTestId('disabled-nav-link');
    await expect(link).toHaveAttribute('aria-disabled', 'true');
    await expect(link.getAttribute('href')).toBeNull();
    await expect(link.tabIndex).toBe(-1);

    await userEvent.click(link);
    await expect(canvas.getByTestId('click-flag').textContent).toBe('no');
  },
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

    await expect(getComputedStyle(item).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    );

    // Resolve the token the same way the browser does — hex-slicing the
    // custom property breaks when the value is already `rgb(...)` or has
    // alpha, and a CSSStyleDeclaration captured once can freeze mid-
    // transition (CI runs with prefers-reduced-motion, which still paints
    // an intermediate frame).
    const probe = document.createElement('span');
    probe.style.color = 'var(--text-interactive-hover)';
    document.documentElement.appendChild(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();

    await waitFor(async () => {
      await expect(getComputedStyle(item).color).toBe(expected);
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

    const probe = document.createElement('span');
    probe.style.color = 'var(--text-disabled)';
    document.documentElement.appendChild(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();

    await expect(getComputedStyle(item).color).toBe(expected);
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
