import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Button,
  Card,
  Input,
  Modal,
  Popover,
  ThemeZone,
  Tooltip,
  type Theme,
} from 'ionbase-ui';

const meta: Meta<typeof ThemeZone> = {
  title: 'Components/ThemeZone',
  component: ThemeZone,
  tags: ['autodocs'],
  argTypes: {
    theme: { control: 'inline-radio', options: ['light', 'dark'] },
  },
  args: { theme: 'dark' },
  parameters: {
    docs: {
      description: {
        component:
          'A part of the page in the other theme — a dark header on a light page, a light document preview in a dark app. Every component inside takes the zone’s theme with nothing of its own; so does plain text, native controls, and the menus, popovers, tooltips and dialogs opened from inside it. `contents` draws no box, for wrapping a component that paints its own surface.',
      },
    },
  },
  render: (args) => (
    <ThemeZone {...args} style={{ padding: 24 }}>
      <Card title="Refund triage">
        <p style={{ margin: 0 }}>Paused by Ada Reyes on 27 Sept.</p>
      </Card>
    </ThemeZone>
  ),
};

export default meta;
type Story = StoryObj<typeof ThemeZone>;

export const Dark: Story = {};
export const Light: Story = {
  args: { theme: 'light' },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};

/** A token's colour as a given theme resolves it, read off a probe. */
const colour = (token: string, theme: Theme) => {
  const el = document.createElement('div');
  el.setAttribute('data-theme', theme);
  el.style.color = `var(${token})`;
  document.body.append(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c;
};
const zone = (el: HTMLElement, sel = '.ion-theme-zone') =>
  el.querySelector(sel) as HTMLElement;

/**
 * A dark zone on a light page: its surface, its text and the components in
 * it are the dark theme's; the page around it stays light.
 */
export const ADarkZoneOnALightPage: Story = {
  render: () => (
    <div data-theme="light">
      <p data-outside>Outside</p>
      <ThemeZone theme="dark">
        <p data-plain style={{ margin: 0 }}>
          Plain text
        </p>
        <Card title="Inside" />
      </ThemeZone>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const z = zone(canvasElement);
    await expect(z).toHaveAttribute('data-theme', 'dark');
    await expect(getComputedStyle(z).backgroundColor).toBe(
      colour('--surface-page', 'dark'),
    );
    // Plain text inherits `color` as a resolved value — the zone sets it
    // again, or this would be the page's dark-on-light ink.
    const plain = canvasElement.querySelector('[data-plain]')!;
    await expect(getComputedStyle(plain).color).toBe(
      colour('--text-default', 'dark'),
    );
    const card = canvasElement.querySelector('.ion-card') as HTMLElement;
    await expect(getComputedStyle(card).backgroundColor).toBe(
      colour('--surface-default', 'dark'),
    );
    const outside = canvasElement.querySelector('[data-outside]')!;
    await expect(getComputedStyle(outside).color).not.toBe(
      colour('--text-default', 'dark'),
    );
  },
};

/**
 * A light zone inside a dark page is light again. `:root` alone carries the
 * light values, so without the light theme's own selector everything in it
 * would inherit dark from the page.
 */
export const ALightZoneInsideADarkPage: Story = {
  render: () => (
    <div data-theme="dark">
      <ThemeZone theme="light">
        <p data-plain style={{ margin: 0 }}>
          A document preview
        </p>
        <Input label="Title" defaultValue="Q3 refunds" />
      </ThemeZone>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const z = zone(canvasElement);
    await expect(getComputedStyle(z).backgroundColor).toBe(
      colour('--surface-page', 'light'),
    );
    await expect(
      getComputedStyle(canvasElement.querySelector('[data-plain]')!).color,
    ).toBe(colour('--text-default', 'light'));
    const input = within(canvasElement).getByRole('textbox', {
      name: 'Title',
    });
    // The field's value is `text/secondary`: the light one, not the dark.
    await expect(getComputedStyle(input).color).toBe(
      colour('--text-secondary', 'light'),
    );
  },
};

/** Zones nest: dark in light in dark, each its own. */
export const ZonesNest: Story = {
  render: () => (
    <ThemeZone theme="dark" data-z="1">
      <ThemeZone theme="light" data-z="2">
        <ThemeZone theme="dark" data-z="3">
          Deepest
        </ThemeZone>
      </ThemeZone>
    </ThemeZone>
  ),
  play: async ({ canvasElement }) => {
    for (const [z, t] of [
      ['1', 'dark'],
      ['2', 'light'],
      ['3', 'dark'],
    ] as const)
      await expect(
        getComputedStyle(zone(canvasElement, `[data-z="${z}"]`)).color,
      ).toBe(colour('--text-default', t));
  },
};

/** Native controls and scrollbars follow the zone: `color-scheme` is set. */
export const NativeControlsFollowTheZone: Story = {
  render: () => (
    <div>
      <ThemeZone theme="dark" data-z="dark">
        <input type="checkbox" aria-label="Native" />
      </ThemeZone>
      <div data-theme="dark">
        <ThemeZone theme="light" data-z="light" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      getComputedStyle(zone(canvasElement, '[data-z="dark"]')).colorScheme,
    ).toBe('dark');
    await expect(
      getComputedStyle(zone(canvasElement, '[data-z="light"]')).colorScheme,
    ).toBe('light');
  },
};

/**
 * A popover opened from inside a dark zone is dark. It is portalled out of
 * the zone — no `overflow` on the zone can clip it — into a container that
 * carries the zone's theme.
 */
export const AnOverlayTakesTheZonesTheme: Story = {
  render: () => (
    <div data-theme="light">
      <ThemeZone theme="dark" style={{ overflow: 'hidden', height: 64 }}>
        <Popover title="Filters" content={<p>Only paused agents.</p>}>
          <Button>Inside</Button>
        </Popover>
      </ThemeZone>
      <Popover title="Page" content={<p>On the page.</p>}>
        <Button>Outside</Button>
      </Popover>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const surface = (theme: Theme) => colour('--surface-raised', theme);
    await userEvent.click(canvas.getByRole('button', { name: 'Inside' }));
    const inside = await within(document.body).findByRole('dialog', {
      name: 'Filters',
    });
    const pop = inside.closest('.ion-popover') ?? inside;
    await expect(getComputedStyle(pop).backgroundColor).toBe(surface('dark'));
    await expect(zone(canvasElement).contains(inside)).toBe(false);
    await expect(
      inside.closest('[data-theme]')?.getAttribute('data-theme'),
    ).toBe('dark');
    // The container's own ink, for anything rendered into it that does not
    // set a colour of its own: the zone's text, not the page's.
    const container = inside.closest('[data-ion-theme-portal]')!;
    await expect(getComputedStyle(container).color).toBe(
      colour('--text-default', 'dark'),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).toBeNull(),
    );

    // One outside the zone is the page's.
    await userEvent.click(canvas.getByRole('button', { name: 'Outside' }));
    const outside = await within(document.body).findByRole('dialog', {
      name: 'Page',
    });
    const pop2 = outside.closest('.ion-popover') ?? outside;
    await expect(getComputedStyle(pop2).backgroundColor).toBe(surface('light'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).toBeNull(),
    );
  },
};

/** A tooltip from inside a dark zone is the dark theme's tooltip. */
export const ATooltipTakesTheZonesTheme: Story = {
  render: () => (
    <div data-theme="light">
      <ThemeZone theme="dark">
        <Tooltip label="Pause every run" delay={0}>
          <Button>Pause</Button>
        </Tooltip>
      </ThemeZone>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Pause',
    });
    button.focus();
    const tip = await within(document.body).findByRole('tooltip');
    await expect(tip.closest('[data-theme]')?.getAttribute('data-theme')).toBe(
      'dark',
    );
    const surface =
      tip.closest('.ion-tooltip__bubble') ??
      tip.querySelector('.ion-tooltip__bubble') ??
      tip;
    await expect(getComputedStyle(surface).backgroundColor).toBe(
      colour('--surface-inverse', 'dark'),
    );
    button.blur();
  },
};

/**
 * A zone inside a dialog, its overlay container made before the dialog
 * opened: the dialog hides everything outside itself, and the zone's
 * popover must still be reachable — not rendered into a hidden node.
 */
function ZoneInADialog() {
  const [open, setOpen] = useState(false);
  return (
    <div data-theme="light">
      <ThemeZone theme="dark">
        <Popover title="Before" content={<p>Made the container.</p>}>
          <Button>Before</Button>
        </Popover>
      </ThemeZone>
      <Button onPress={() => setOpen(true)}>Open dialog</Button>
      <Modal isOpen={open} onOpenChange={setOpen} title="Preview">
        <ThemeZone theme="dark">
          <Popover title="In the dialog" content={<p>Reachable.</p>}>
            <Button>Details</Button>
          </Popover>
        </ThemeZone>
      </Modal>
    </div>
  );
}

export const AnOverlayInADialogStaysReachable: Story = {
  render: () => <ZoneInADialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Before' }));
    await body.findByRole('dialog', { name: 'Before' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());

    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
    const dialog = await body.findByRole('dialog', { name: 'Preview' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Details' }),
    );
    const pop = await body.findByRole('dialog', { name: 'In the dialog' });
    await expect(pop.closest('[inert], [aria-hidden="true"]')).toBeNull();
    await expect(pop.closest('[data-theme]')?.getAttribute('data-theme')).toBe(
      'dark',
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(body.queryByRole('dialog', { name: 'In the dialog' })).toBeNull(),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};

/**
 * `contents` draws no box: the zone's child is the grid's cell, as if the
 * zone were not there, and still takes the zone's theme.
 */
export const ContentsDrawsNoBox: Story = {
  render: () => (
    <div
      data-grid
      style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}
    >
      <div data-first>Sidebar</div>
      <ThemeZone theme="dark" contents>
        <div data-cell style={{ background: 'var(--surface-default)' }}>
          Header
        </div>
      </ThemeZone>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const z = zone(canvasElement);
    await expect(getComputedStyle(z).display).toBe('contents');
    const first = canvasElement
      .querySelector('[data-first]')!
      .getBoundingClientRect();
    const cell = canvasElement.querySelector('[data-cell]') as HTMLElement;
    // The second column, on the first row: a grid cell of its own.
    await expect(cell.getBoundingClientRect().left).toBe(first.right + 16);
    await expect(cell.getBoundingClientRect().top).toBe(first.top);
    await expect(getComputedStyle(cell).color).toBe(
      colour('--text-default', 'dark'),
    );
  },
};

/** `as` picks the element when the zone is a box. */
export const AsAnElement: Story = {
  render: () => (
    <ThemeZone theme="dark" as="aside" aria-label="Preview">
      Preview
    </ThemeZone>
  ),
  play: async ({ canvasElement }) => {
    const aside = within(canvasElement).getByRole('complementary', {
      name: 'Preview',
    });
    await expect(aside).toHaveAttribute('data-theme', 'dark');
  },
};

/** It renders on a server, with its theme in the markup. */
export const ItRendersOnAServer: Story = {
  play: async () => {
    const html = renderToStaticMarkup(
      <ThemeZone theme="dark" as="header">
        <Tooltip label="Hi">
          <Button>Hi</Button>
        </Tooltip>
      </ThemeZone>,
    );
    await expect(html).toContain('<header');
    await expect(html).toContain('data-theme="dark"');
  },
};

/** A zone without a theme does not compile. */
export const ThemeIsRequired: Story = {
  render: () => (
    // @ts-expect-error — `theme` is required.
    <ThemeZone>Nothing</ThemeZone>
  ),
};
