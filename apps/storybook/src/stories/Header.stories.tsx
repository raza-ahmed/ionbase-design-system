import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Header, Button, Divider, Logo, NavItem } from 'ionbase-ui';

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Measured from Figma `Header` (69:335) — Desktop 56 tall with 8/64 padding, Tablet 56 with 8/24, Mobile 64 with 12/16.\n\n**Device is a media query; open/closed is a prop.** Figma spells Device as one four-way variant, but it is two axes known by two different people. The breakpoint is the one variant axis the browser already knows the answer to — a header is Mobile because the viewport is narrow — so React never duplicates that judgement. Whether the mobile menu is open is the opposite: nothing in CSS knows it, so it is `open` / `defaultOpen` / `onOpenChange`. Breakpoints match the Breakpoint collection — Tablet below 1216, Mobile below 896.\n\n`center` and `end` are rendered **once**. Above the mobile breakpoint they sit inline in the bar; below it the same elements become the dropped Menu-Container. Duplicating them per breakpoint would put every nav link in the accessibility tree twice and reset any state a caller put in a slot on every resize.\n\nThe brand slot is `<Logo size="sm" wordmark="vector" />` — Figma\'s Header instance binds the same variant, outlined artwork rather than live text, so the header never depends on the brand font having loaded.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

/** The Center Slot exactly as the Figma usage example (669:978) fills it:
 *  three nav items separated by vertical rules. */
const navItems = (
  <>
    <NavItem href="#home">Home</NavItem>
    <Divider orientation="vertical" />
    <NavItem href="#products">Products</NavItem>
    <Divider orientation="vertical" />
    <NavItem href="#docs">Docs</NavItem>
  </>
);

/** The End Slot as the usage example fills it: a quiet action and a solid one. */
const actions = (
  <>
    <Button variant="tertiary" size="sm">
      Sign in
    </Button>
    <Button variant="primary-brand" size="sm">
      Get started
    </Button>
  </>
);

/**
 * The usage example, verbatim. Resize the preview across 1216 and 896 to move
 * through the Desktop, Tablet and Mobile variants — it is the same markup in
 * all three.
 */
export const UsageExample: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      center={navItems}
      end={actions}
    />
  ),
};

export const BrandOnly: Story = {
  render: () => <Header brand={<Logo size="sm" wordmark="vector" />} />,
};

/** `open` makes the Mobile-Open menu render regardless of the toggle, which is
 *  what a caller does when navigation state lives in their router. */
export const MobileMenuOpen: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      center={navItems}
      end={actions}
      open
    />
  ),
};

/**
 * Geometry is asserted against whichever variant the runner's window lands in,
 * derived from the same breakpoint table the stylesheet uses.
 *
 * Pinning one variant's numbers would make the test pass or fail on the
 * runner's window size, which is not a property of the component — and it did:
 * the previous version asserted 64/12 and started failing the moment Tablet
 * moved from 64 to 56, for a reason that had nothing to do with the bug.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => <Header brand={<Logo size="sm" wordmark="vector" />} />,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector('.ion-header') as HTMLElement;
    const cs = getComputedStyle(header);

    const expected =
      window.innerWidth >= 1216
        ? { height: 56, paddingTop: '8px', paddingLeft: '64px' }
        : window.innerWidth >= 896
          ? { height: 56, paddingTop: '8px', paddingLeft: '24px' }
          : { height: 64, paddingTop: '12px', paddingLeft: '16px' };

    await expect(Math.round(header.getBoundingClientRect().height)).toBe(
      expected.height,
    );
    await expect(cs.paddingTop).toBe(expected.paddingTop);
    await expect(cs.paddingLeft).toBe(expected.paddingLeft);
    await expect(cs.borderBottomWidth).toBe('1px');
    await expect(cs.justifyContent).toBe('space-between');
  },
};

/**
 * The toggle drives the Mobile-Closed → Mobile-Open transition and reports it
 * through `aria-expanded`, so the state is one fact rather than two that can
 * disagree.
 *
 * The toggle is queried by class rather than by role on purpose: above the
 * mobile breakpoint it is `display: none` and therefore correctly absent from
 * the accessibility tree, so `getByRole` would make this a test of the runner's
 * window size. What is asserted here — that a click flips the state and Escape
 * closes it — is true at every width.
 */
export const ToggleOpensTheMobileMenu: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      center={navItems}
      end={actions}
    />
  ),
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector('.ion-header') as HTMLElement;
    const toggle = canvasElement.querySelector(
      '.ion-header__toggle',
    ) as HTMLElement;
    const menu = canvasElement.querySelector(
      '.ion-header__menu',
    ) as HTMLElement;

    // aria-controls points at the panel it actually governs.
    await expect(toggle).toHaveAttribute('aria-controls', menu.id);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(header).not.toHaveAttribute('data-open');

    await userEvent.click(toggle);

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(header).toHaveAttribute('data-open');

    /*
     * Escape is the whole dismissal contract — it is a disclosure, not a modal,
     * so the handler sits on the header rather than the document and only fires
     * while focus is inside it. On a real mobile viewport that is where focus
     * already is, on the toggle the user just pressed; here the toggle is
     * `display: none` and cannot take focus, so a link in the open panel stands
     * in for it.
     */
    (canvasElement.querySelector('.ion-header a') as HTMLElement).focus();
    await userEvent.keyboard('{Escape}');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(header).not.toHaveAttribute('data-open');
  },
};

/**
 * Below the mobile breakpoint the wrapper stops being `display: contents` and
 * becomes the Menu-Container. This is the one assertion that genuinely needs a
 * mobile viewport, so it states that requirement instead of assuming it.
 */
export const MenuContainerDropsBelowTheMobileBreakpoint: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      center={navItems}
      end={actions}
    />
  ),
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector(
      '.ion-header__menu',
    ) as HTMLElement;
    const isMobile = window.innerWidth < 896;

    await expect(getComputedStyle(menu).display).toBe(
      isMobile ? 'none' : 'contents',
    );
  },
};

/**
 * The slots exist once in the DOM in both layouts. This is the property that
 * makes the single-tree approach worth its `display: contents`: a nav link that
 * were duplicated per breakpoint would be announced twice.
 */
export const SlotsAreNotDuplicatedAcrossBreakpoints: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      center={navItems}
      end={actions}
      open
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('link', { name: 'Docs' })).toHaveLength(1);
    await expect(
      canvasElement.querySelectorAll('.ion-header__center'),
    ).toHaveLength(1);
    await expect(
      canvasElement.querySelectorAll('.ion-header__end'),
    ).toHaveLength(1);
  },
};
