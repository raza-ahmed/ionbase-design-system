import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { page, userEvent as browserUser } from 'vitest/browser';
import {
  ContextMenu,
  Link,
  Menu,
  MenuItem,
  MenuSection,
  Table,
  TableBody,
  TableCell,
  TableRow,
  type ContextMenuProps,
} from 'ionbase-ui';

/** A card with a context menu that writes what it did, so a test can read it. */
function Harness(props: Partial<ContextMenuProps>) {
  const [did, setDid] = useState('');
  return (
    <div style={{ padding: 40 }}>
      <ContextMenu
        aria-label="Actions for Invoice reconciler"
        menu={
          <Menu onAction={(key) => setDid(`chose ${String(key)}`)}>
            <MenuSection aria-label="Run">
              <MenuItem key="pause">Pause</MenuItem>
              <MenuItem key="duplicate">Duplicate</MenuItem>
            </MenuSection>
            <MenuSection aria-label="Danger">
              <MenuItem key="delete">Delete…</MenuItem>
            </MenuSection>
          </Menu>
        }
        {...props}
      >
        <div
          data-testid="card"
          style={{
            width: 320,
            height: 120,
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 8,
          }}
        >
          <Link href="#agent">Invoice reconciler</Link>
        </div>
      </ContextMenu>
      <button type="button" data-testid="outside">
        Elsewhere
      </button>
      <output data-testid="did">{did}</output>
    </div>
  );
}

const meta: Meta<typeof ContextMenu> = {
  title: 'Components/ContextMenu',
  component: ContextMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "The menu a right-click opens on a thing — a row's actions, a file's. Shift+F10 and the Menu key open it from the keyboard, under the thing. It is a shortcut and never the only way: nothing shows that a right-click does anything and touch screens have none, so every action in it must also be reachable without it — usually the row's own actions menu, with the same items.",
      },
    },
  },
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

export const Default: Story = {};

// ------------------------------------------------------------------ tests

const body = () => within(document.body);
const card = (c: ReturnType<typeof within>) => c.getByTestId('card');
const box = (el: Element) => el.getBoundingClientRect();

/** Right-click at a point: a named menu opens there, focus on its first item. */
export const RightClickOpensAtThePointer: Story = {
  play: async ({ canvas }) => {
    const r = box(card(canvas));
    await page.elementLocator(card(canvas)).click({
      button: 'right',
      position: { x: 200, y: 80 },
    });
    const menu = await body().findByRole('menu', {
      name: 'Actions for Invoice reconciler',
    });
    await waitFor(() =>
      expect(
        within(menu).getByRole('menuitem', { name: 'Pause' }),
      ).toHaveFocus(),
    );
    const m = box(menu.closest('.ion-menu-popover')!);
    await expect(Math.abs(m.left - (r.left + 200))).toBeLessThan(6);
    await expect(Math.abs(m.top - (r.top + 80))).toBeLessThan(8);
  },
};

/** Choosing an item reports its key, closes the menu. */
export const ChoosingAnItemActs: Story = {
  play: async ({ canvas }) => {
    await page.elementLocator(card(canvas)).click({ button: 'right' });
    const menu = await body().findByRole('menu');
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Duplicate' }),
    );
    await expect(canvas.getByTestId('did')).toHaveTextContent(
      'chose duplicate',
    );
    await waitFor(() => expect(body().queryByRole('menu')).toBeNull());
  },
};

/**
 * Shift+F10 with focus inside the thing opens it under the thing, at its start
 * edge; Escape closes it and puts focus back.
 */
export const ShiftF10OpensUnderTheThing: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Invoice reconciler' });
    link.focus();
    await browserUser.keyboard('{Shift>}{F10}{/Shift}');
    const menu = await body().findByRole('menu');
    await waitFor(() =>
      expect(
        within(menu).getByRole('menuitem', { name: 'Pause' }),
      ).toHaveFocus(),
    );
    const r = box(card(canvas));
    const m = box(menu.closest('.ion-menu-popover')!);
    await expect(m.top).toBeGreaterThanOrEqual(r.bottom - 1);
    await expect(Math.abs(m.left - r.left)).toBeLessThan(6);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body().queryByRole('menu')).toBeNull());
    await waitFor(() => expect(link).toHaveFocus());
  },
};

/**
 * The Menu key: the browser fires a keyboard contextmenu, with no pointer
 * position, and the menu opens under the thing rather than at 0,0.
 */
export const TheMenuKeyOpensUnderTheThing: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('link', { name: 'Invoice reconciler' }).focus();
    await browserUser.keyboard('{ContextMenu}');
    const menu = await body().findByRole('menu');
    const r = box(card(canvas));
    await waitFor(async () => {
      const m = box(menu.closest('.ion-menu-popover')!);
      await expect(m.top).toBeGreaterThanOrEqual(r.bottom - 1);
      await expect(Math.abs(m.left - r.left)).toBeLessThan(6);
    });
  },
};

/**
 * A menu moved by a second right-click, then closed with Escape, still gives
 * focus back to where it was before the first opened.
 */
export const FocusReturnsAfterTheMenuMoved: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Invoice reconciler' });
    link.focus();
    await browserUser.keyboard('{Shift>}{F10}{/Shift}');
    await body().findByRole('menu');
    await page
      .elementLocator(card(canvas))
      .click({ button: 'right', position: { x: 260, y: 90 }, force: true });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('role')).toBe('menuitem'),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body().queryByRole('menu')).toBeNull());
    await waitFor(() => expect(link).toHaveFocus());
  },
};

/** On a scrolled page the menu is still at the pointer. */
export const AtThePointerOnAScrolledPage: Story = {
  render: () => (
    <>
      <div style={{ height: 1200 }} />
      <Harness />
      <div style={{ height: 1200 }} />
    </>
  ),
  play: async ({ canvas }) => {
    card(canvas).scrollIntoView({ block: 'center' });
    await expect(window.scrollY).toBeGreaterThan(500);
    const r = box(card(canvas));
    await page
      .elementLocator(card(canvas))
      .click({ button: 'right', position: { x: 100, y: 50 } });
    const menu = await body().findByRole('menu');
    await waitFor(async () => {
      const m = box(menu.closest('.ion-menu-popover')!);
      await expect(Math.abs(m.top - (r.top + 50))).toBeLessThan(8);
      await expect(Math.abs(m.left - (r.left + 100))).toBeLessThan(6);
    });
  },
};

/** Only on its element: a right-click elsewhere opens nothing of ours. */
export const OnlyOnItsElement: Story = {
  play: async ({ canvas }) => {
    await page
      .elementLocator(canvas.getByTestId('outside'))
      .click({ button: 'right' });
    await expect(body().queryByRole('menu')).toBeNull();
  },
};

/** The browser's own menu is prevented on the element, and only there. */
export const PreventsTheBrowserMenuOnlyThere: Story = {
  play: async ({ canvas }) => {
    const fire = (el: Element) =>
      el.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 10,
        }),
      );
    await expect(fire(card(canvas))).toBe(false);
    await expect(fire(canvas.getByTestId('outside'))).toBe(true);
  },
};

/**
 * A second right-click on the thing moves the open menu there, and the
 * browser's menu stays shut. One elsewhere closes ours.
 */
export const ASecondRightClickMovesOrCloses: Story = {
  play: async ({ canvas }) => {
    const c = page.elementLocator(card(canvas));
    await c.click({ button: 'right', position: { x: 20, y: 20 } });
    const menu = await body().findByRole('menu');
    const first = box(menu.closest('.ion-menu-popover')!).left;
    // Forced: the open menu's underlay covers the card, and that is the
    // click being tested — the one that lands on the underlay.
    await c.click({
      button: 'right',
      position: { x: 260, y: 20 },
      force: true,
    });
    await waitFor(async () => {
      const again = await body().findByRole('menu');
      await expect(
        box(again.closest('.ion-menu-popover')!).left - first,
      ).toBeGreaterThan(150);
    });
    await page
      .elementLocator(canvas.getByTestId('outside'))
      .click({ button: 'right', force: true });
    await waitFor(() => expect(body().queryByRole('menu')).toBeNull());
  },
};

/** Disabled: our menu stays shut and the browser's is left alone. */
export const DisabledLeavesTheBrowserMenu: Story = {
  render: () => <Harness isDisabled />,
  play: async ({ canvas }) => {
    const ev = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    await expect(card(canvas).dispatchEvent(ev)).toBe(true);
    await expect(body().queryByRole('menu')).toBeNull();
  },
};

/** The thing's own handlers still run. */
export const KeepsTheThingsOwnHandlers: Story = {
  render: () => {
    const [n, setN] = useState(0);
    return (
      <>
        <ContextMenu
          aria-label="Row actions"
          menu={
            <Menu>
              <MenuItem key="a">Open</MenuItem>
            </Menu>
          }
        >
          <div
            data-testid="card"
            tabIndex={0}
            style={{ width: 200, height: 60 }}
            onKeyDown={(e) => e.key === 'F10' && setN((x) => x + 1)}
          >
            Row
          </div>
        </ContextMenu>
        <output data-testid="n">{n}</output>
      </>
    );
  },
  play: async ({ canvas }) => {
    card(canvas).focus();
    await browserUser.keyboard('{Shift>}{F10}{/Shift}');
    await expect(canvas.getByTestId('n')).toHaveTextContent('1');
    await expect(await body().findByRole('menu')).toBeInTheDocument();
  },
};

/** On a table row: the row stays a `<tr>`, and Shift+F10 from its link opens. */
export const OnATableRow: Story = {
  render: () => (
    <Table aria-label="Agents">
      <TableBody>
        <ContextMenu
          aria-label="Actions for Invoice reconciler"
          menu={
            <Menu>
              <MenuItem key="pause">Pause</MenuItem>
            </Menu>
          }
        >
          <TableRow data-testid="row">
            <TableCell>
              <Link href="#agent">Invoice reconciler</Link>
            </TableCell>
            <TableCell>Running</TableCell>
          </TableRow>
        </ContextMenu>
      </TableBody>
    </Table>
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByTestId('row');
    await expect(row.tagName).toBe('TR');
    await expect(row.parentElement!.tagName).toBe('TBODY');
    canvas.getByRole('link', { name: 'Invoice reconciler' }).focus();
    await browserUser.keyboard('{Shift>}{F10}{/Shift}');
    await expect(
      await body().findByRole('menu', {
        name: 'Actions for Invoice reconciler',
      }),
    ).toBeInTheDocument();
  },
};

/**
 * While ours is open the page ignores the pointer, so a second right-click
 * lands on <body>. On the thing, the browser's menu is still prevented; off
 * it, it is not, and ours closes.
 */
export const WhileOpenTheBrowserMenuStaysShutOnTheThing: Story = {
  play: async ({ canvas }) => {
    await page.elementLocator(card(canvas)).click({ button: 'right' });
    await body().findByRole('menu');
    const r = box(card(canvas));
    const fire = (x: number, y: number) =>
      document.body.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        }),
      );
    await expect(fire(r.left + 30, r.top + 30)).toBe(false);
    await expect(body().getByRole('menu')).toBeInTheDocument();
    await expect(fire(r.right + 200, r.bottom + 200)).toBe(true);
    await waitFor(() => expect(body().queryByRole('menu')).toBeNull());
  },
};

/** It is a full Menu: ↓ moves between items, across sections; typing jumps. */
export const ArrowsAndTypeaheadWork: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('link', { name: 'Invoice reconciler' }).focus();
    await browserUser.keyboard('{Shift>}{F10}{/Shift}');
    const menu = await body().findByRole('menu');
    const item = (name: string) => within(menu).getByRole('menuitem', { name });
    await waitFor(() => expect(item('Pause')).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(item('Duplicate')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(item('Delete…')).toHaveFocus();
    await userEvent.keyboard('p');
    await waitFor(() => expect(item('Pause')).toHaveFocus());
  },
};
