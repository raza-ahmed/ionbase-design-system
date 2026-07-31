import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Header, Button, Avatar, Logo } from 'ionbase-ui';

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Measured from Figma `Header` — Desktop 56 tall with 8/64 padding, Tablet 64 with 12/32, Mobile 64 with 12/16.\n\n**Device is a media query, not a prop.** It is the one variant axis the browser already knows the answer to: a header is Mobile because the viewport is narrow. Every other component takes its variant from the caller because the caller is the only one who knows. Breakpoints match the Breakpoint collection — Tablet below 1216, Mobile below 896.\n\nNote the header is *taller* on Tablet and Mobile (64) than Desktop (56); touch targets need the height more than a pointer does.\n\nThe brand slot is `<Logo size="sm" wordmark="vector" />` — Figma\'s Header instance binds the exact same variant, outlined artwork rather than live text, so the header never depends on the brand font having loaded.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      end={
        <>
          <Button variant="tertiary" size="sm">
            Docs
          </Button>
          <Avatar size="sm" initials="AB" alt="Ada Byron" />
        </>
      }
    />
  ),
};

export const WithCenterSlot: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      center={
        <>
          <Button variant="tertiary" size="sm">
            Products
          </Button>
          <Button variant="tertiary" size="sm">
            Pricing
          </Button>
          <Button variant="tertiary" size="sm">
            Docs
          </Button>
        </>
      }
      end={<Avatar size="sm" initials="AB" alt="Ada Byron" />}
    />
  ),
};

export const BrandOnly: Story = {
  render: () => <Header brand={<Logo size="sm" wordmark="vector" />} />,
};

/**
 * Geometry is asserted against whichever variant the test viewport lands in.
 *
 * The runner is well below 1216px, so this pins the Mobile/Tablet shape — 64
 * tall with 12px vertical padding — rather than the Desktop one. Asserting
 * Desktop here would pass or fail on the runner's window size, which is not a
 * property of the component.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => <Header brand={<Logo size="sm" wordmark="vector" />} />,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector('.ion-header') as HTMLElement;
    const cs = getComputedStyle(header);

    await expect(Math.round(header.getBoundingClientRect().height)).toBe(64);
    await expect(cs.paddingTop).toBe('12px');
    await expect(cs.borderBottomWidth).toBe('1px');
    await expect(cs.justifyContent).toBe('space-between');
  },
};

/** The centre slot is collapsed below the desktop breakpoint, matching Figma's
 *  Tablet and Mobile variants which both ship it at zero width. */
export const CenterSlotIsHiddenBelowDesktop: Story = {
  render: () => (
    <Header
      brand={<Logo size="sm" wordmark="vector" />}
      center={<Logo size="sm" wordmark="vector" />}
    />
  ),
  play: async ({ canvasElement }) => {
    const center = canvasElement.querySelector(
      '.ion-header__center',
    ) as HTMLElement;
    await expect(getComputedStyle(center).display).toBe('none');
  },
};
