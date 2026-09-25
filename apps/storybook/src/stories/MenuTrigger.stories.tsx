import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  Button,
  Icon,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
} from 'ionbase-ui';
import { Archive, Copy, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { Ellipsis } from 'ionbase-icons/icons/ellipsis';

const meta: Meta<typeof MenuTrigger> = {
  title: 'Components/MenuTrigger',
  component: MenuTrigger,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A Button that opens a Menu. The "⋯" overflow menu is this with an icon-only Button.\n\nThe trigger announces `aria-haspopup="menu"` and `aria-expanded`; Enter, Space and ArrowDown open the menu on its first row, ArrowUp on its last; choosing an action closes every level and returns focus to the trigger.\n\nA MenuItem with a `title` and MenuItem children opens a **submenu** — right arrow in, left arrow or Escape out. Submenus are non-modal, so the pointer can move back up a level.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuTrigger>;

/** Room below the trigger, so the menu opens where the placement asks. */
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: 320, padding: 16 }}>{children}</div>
);

const body = () => within(document.body);
const openMenu = () => document.body.querySelector('[role="menu"]');

export const Default: Story = {
  render: () => (
    <Frame>
      <MenuTrigger>
        <Button variant="secondary">Edit</Button>
        <Menu onAction={(key) => console.log(key)}>
          <MenuItem key="rename" icon={<Icon as={Pencil} />}>
            Rename
          </MenuItem>
          <MenuItem key="duplicate" icon={<Icon as={Copy} />}>
            Duplicate
          </MenuItem>
          <MenuItem key="archive" icon={<Icon as={Archive} />}>
            Archive
          </MenuItem>
        </Menu>
      </MenuTrigger>
    </Frame>
  ),
};

/** The overflow menu: an icon-only Button, whose aria-label names the menu too. */
export const Overflow: Story = {
  render: () => (
    <Frame>
      <MenuTrigger placement="bottom end">
        <Button
          variant="tertiary"
          aria-label="Actions for Payroll"
          startIcon={<Icon as={Ellipsis} />}
        />
        <Menu>
          <MenuSection title="Edit">
            <MenuItem key="rename">Rename</MenuItem>
            <MenuItem key="duplicate">Duplicate</MenuItem>
          </MenuSection>
          <MenuSection aria-label="Danger">
            <MenuItem key="delete" icon={<Icon as={Trash2} />}>
              Delete
            </MenuItem>
          </MenuSection>
        </Menu>
      </MenuTrigger>
    </Frame>
  ),
};

/** A row with a `title` and MenuItem children opens a submenu. */
export const Submenu: Story = {
  args: { onAction: fn() } as never,
  render: (args) => (
    <Frame>
      <MenuTrigger>
        <Button variant="secondary">File</Button>
        <Menu
          onAction={
            (args as unknown as { onAction: (k: unknown) => void }).onAction
          }
        >
          <MenuItem key="rename" icon={<Icon as={Pencil} />}>
            Rename
          </MenuItem>
          <MenuItem key="move" title="Move to" icon={<Icon as={FolderInput} />}>
            <MenuItem key="archive">Archive</MenuItem>
            <MenuItem key="trash">Trash</MenuItem>
          </MenuItem>
          <MenuItem key="duplicate" icon={<Icon as={Copy} />}>
            Duplicate
          </MenuItem>
        </Menu>
      </MenuTrigger>
    </Frame>
  ),
};

// ------------------------------------------------------------------ tests

export const TriggerAnnouncesAMenu: Story = {
  ...Default,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Edit' });
    await expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    const menu = await waitFor(() =>
      body().getByRole('menu', { name: 'Edit' }),
    );
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Named by the trigger, and focus lands on a row — not the popover.
    await expect(menu).toHaveAttribute('aria-labelledby', trigger.id);
    await waitFor(() =>
      expect(body().getByRole('menuitem', { name: 'Rename' })).toHaveFocus(),
    );
  },
};

export const ArrowKeysOpenOnFirstAndLast: Story = {
  ...Default,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Edit' });
    trigger.focus();
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() =>
      expect(body().getByRole('menuitem', { name: 'Archive' })).toHaveFocus(),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(openMenu()).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(body().getByRole('menuitem', { name: 'Rename' })).toHaveFocus(),
    );
  },
};

/** Choosing closes the menu and gives focus back — the user is not stranded. */
export const ActionClosesAndReturnsFocus: Story = {
  args: { onAction: fn() } as never,
  render: (args) => (
    <Frame>
      <MenuTrigger>
        <Button variant="secondary">Edit</Button>
        <Menu
          onAction={
            (args as unknown as { onAction: (k: unknown) => void }).onAction
          }
        >
          <MenuItem key="rename">Rename</MenuItem>
          <MenuItem key="duplicate">Duplicate</MenuItem>
        </Menu>
      </MenuTrigger>
    </Frame>
  ),
  play: async ({ args, canvas, userEvent }) => {
    const onAction = (args as unknown as { onAction: ReturnType<typeof fn> })
      .onAction;
    const trigger = canvas.getByRole('button', { name: 'Edit' });
    await userEvent.click(trigger);
    await userEvent.click(
      await waitFor(() => body().getByRole('menuitem', { name: 'Duplicate' })),
    );
    await expect(onAction.mock.lastCall?.[0]).toBe('duplicate');
    await waitFor(() => expect(openMenu()).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** A caller's own aria-label beats the trigger's text as the menu's name. */
export const OwnLabelWins: Story = {
  render: () => (
    <Frame>
      <MenuTrigger>
        <Button variant="secondary">Options</Button>
        <Menu aria-label="Sort by">
          <MenuItem key="name">Name</MenuItem>
        </Menu>
      </MenuTrigger>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Options' }));
    const menu = await waitFor(() => body().getByRole('menu'));
    await expect(menu).toHaveAccessibleName('Sort by');
    await expect(menu).not.toHaveAttribute('aria-labelledby');
  },
};

export const SubmenuByKeyboard: Story = {
  ...Submenu,
  play: async ({ args, canvas, userEvent }) => {
    const onAction = (args as unknown as { onAction: ReturnType<typeof fn> })
      .onAction;
    const trigger = canvas.getByRole('button', { name: 'File' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(body().getByRole('menuitem', { name: 'Rename' })).toHaveFocus(),
    );

    await userEvent.keyboard('{ArrowDown}');
    const move = body().getByRole('menuitem', { name: 'Move to' });
    await expect(move).toHaveFocus();
    await expect(move).toHaveAttribute('aria-haspopup', 'menu');
    await expect(move).toHaveAttribute('aria-expanded', 'false');

    // In with the right arrow, focus on the submenu's first row.
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(body().getByRole('menuitem', { name: 'Archive' })).toHaveFocus(),
    );
    await expect(move).toHaveAttribute('aria-expanded', 'true');
    await expect(
      body().getByRole('menu', { name: 'Move to' }),
    ).toBeInTheDocument();

    // Out with the left arrow, back on the row that opened it.
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(move).toHaveFocus());
    await waitFor(() =>
      expect(body().queryByRole('menu', { name: 'Move to' })).toBeNull(),
    );

    // An action two levels down reaches the root's onAction and closes all.
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(body().getByRole('menuitem', { name: 'Archive' })).toHaveFocus(),
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(onAction.mock.lastCall?.[0]).toBe('trash');
    await waitFor(() => expect(openMenu()).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** The parent row keeps its highlight while its submenu is open. */
export const OpenSubmenuRowStaysHighlighted: Story = {
  ...Submenu,
  play: async ({ canvas, userEvent }) => {
    canvas.getByRole('button', { name: 'File' }).focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}');
    const move = await waitFor(() =>
      body().getByRole('menuitem', { name: 'Move to' }),
    );
    await waitFor(() => expect(move).toHaveAttribute('data-open', 'true'));
    // The row's background transitions in, so read it once it has settled.
    await waitFor(() =>
      expect(getComputedStyle(move).backgroundColor).not.toBe(
        'rgba(0, 0, 0, 0)',
      ),
    );
  },
};

/** Figma draws Menu with Shadow/lg; the floating menu carries it. */
export const FloatsWithFigmasShadow: Story = {
  ...Default,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    const menu = await waitFor(() => body().getByRole('menu'));
    await expect(getComputedStyle(menu).boxShadow).not.toBe('none');
    await expect(
      Math.round(menu.getBoundingClientRect().width),
    ).toBeGreaterThanOrEqual(240);
  },
};
