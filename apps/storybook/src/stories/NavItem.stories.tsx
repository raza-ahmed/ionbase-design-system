import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
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

/**
 * Resolve a colour token to the `rgb(...)` string `getComputedStyle` returns.
 *
 * Through the browser rather than by slicing the custom property's hex text:
 * the slice breaks the moment a token resolves to anything but a 6-digit hex —
 * an `rgb(...)` value or an alpha channel both produce garbage — and it encodes
 * an assumption the token pipeline never made.
 *
 * The probe is taken out of flow and hidden so appending it cannot move the
 * story's own layout, which the assertions measure.
 */
function resolveToken(name: string): string {
  const probe = document.createElement('span');
  probe.style.cssText = `position:fixed;visibility:hidden;color:var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

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
 * Hover recolours text and icon; it never sets a background.
 *
 * Asserted as two contracts rather than one end-to-end flow, because the
 * end-to-end version is not reproducible in headless Chromium:
 *
 *   1. A real `userEvent.hover` produces `data-hovered` — React Aria's job.
 *   2. `data-hovered` produces the colour and no background — the CSS's job.
 *
 * Step 1 is driven by a real pointer, never a forced prop: `data-hovered` is
 * computed by the component from React Aria's own hover state, so a story
 * passing it in would just be overwritten.
 *
 * Step 2 sets the attribute itself rather than relying on the pointer step 1
 * established, because in headless Chromium that pointer does not hold. This
 * test was red on CI and green locally for weeks; instrumenting it on the
 * runner showed why. A few ticks after the hover, `:hover` and `data-hovered`
 * were both gone while the element was still attached, unmoved (identical
 * rect), and unobstructed (`elementFromPoint` returned the element itself).
 * Re-hovering did not bring them back: the pointer was already at those
 * coordinates, and Chromium fires no fresh `pointerenter` for a move to the
 * same point.
 *
 * Once the browser drops `:hover`, React Aria's `isHovered` goes false and
 * React re-renders and REMOVES `data-hovered` — including one set by hand
 * here. So the read has to be synchronous: transition off, set, read, with no
 * `await` between the statements. Nothing can re-render or repaint in that
 * window. An earlier attempt using `waitFor` failed for exactly this reason,
 * and it is why the assertion values are captured into consts before the
 * first `await` rather than read inside `expect(...)`.
 *
 * Splitting it keeps both real assertions: step 1 still fails if `useHover` is
 * unwired, step 2 still fails if the `[data-hovered]` rule is dropped or
 * starts painting a background.
 */
export const HoverHasNoBackground: Story = {
  render: () => <NavItem href="/products">Products</NavItem>,
  play: async ({ canvas, userEvent }) => {
    const item = canvas.getByRole('link');

    // 1. React Aria's contract: a real pointer produces the attribute.
    //
    // Read immediately and WITHOUT `waitFor`, for the reason given above: the
    // attribute is a pulse, not a level. Polling for it cannot catch a value
    // that has already been dropped, so a `waitFor` here would turn the same
    // hazard into a slower failure. Button's `Hovered` story is the same
    // contract made drop-proof with a MutationObserver; if this line ever
    // flakes, take that approach rather than adding a wait.
    await userEvent.hover(item);
    await expect(item).toHaveAttribute('data-hovered', 'true');

    // 2. The stylesheet's contract: the attribute produces the colour.
    //
    // Transition off, then set, then read — all synchronously, with no `await`
    // in between. `color` is a 200ms transition, so a read on the next tick
    // catches an intermediate frame; and React owns this attribute, so the
    // moment the hover state it derives from goes false it re-renders and
    // strips whatever was set here. Neither can happen between two statements.
    item.style.transition = 'none';
    item.setAttribute('data-hovered', 'true');

    const hoveredColor = getComputedStyle(item).color;
    const hoveredBackground = getComputedStyle(item).backgroundColor;

    await expect(hoveredColor).toBe(resolveToken('--text-interactive-hover'));
    await expect(hoveredBackground).toBe('rgba(0, 0, 0, 0)');
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

    await expect(getComputedStyle(item).color).toBe(
      resolveToken('--text-disabled'),
    );
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
