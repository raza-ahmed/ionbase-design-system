import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { I18nProvider } from 'react-aria';
// A real, trusted Tab from Playwright. storybook/test's `tab()` is simulated:
// it picks the next element itself, before React Aria has moved focus to the
// toolbar's edge, so it cannot see the one-press exit this component exists for.
import { userEvent as browserKeys } from 'vitest/browser';
import {
  Button,
  Divider,
  Icon,
  Input,
  Menu,
  MenuItem,
  MenuTrigger,
  Select,
  Toolbar,
} from 'ionbase-ui';
import { Ellipsis } from 'ionbase-icons/icons/ellipsis';
import { Pause, Play, Trash2 } from 'lucide-react';

const meta: Meta<typeof Toolbar> = {
  title: 'Components/Toolbar',
  component: Toolbar,
  tags: ['autodocs'],
  args: { 'aria-label': 'Bulk actions' },
  parameters: {
    docs: {
      description: {
        component:
          "A row of controls that act on one thing, reached as one stop. `role=\"toolbar\"`: ← → move between controls, Tab leaves the whole toolbar, and coming back lands on the control used last. React Aria's `useToolbar`.\n\nFor the batch bar, a record's actions, an editor's formatting — not a filter bar: Tab leaves in one press, so a search field inside strands the filters after it.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

const Actions = () => (
  <>
    <Button size="sm" variant="secondary" startIcon={<Icon as={Play} />}>
      Resume
    </Button>
    <Button size="sm" variant="secondary" startIcon={<Icon as={Pause} />}>
      Pause
    </Button>
    <Divider orientation="vertical" />
    <Button size="sm" variant="destructive" startIcon={<Icon as={Trash2} />}>
      Delete
    </Button>
  </>
);

export const Default: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <Actions />
    </Toolbar>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical', 'aria-label': 'Run controls' },
  render: (args) => (
    <div style={{ width: 160 }}>
      <Toolbar {...args}>
        <Button size="sm" variant="secondary">
          Resume
        </Button>
        <Button size="sm" variant="secondary">
          Pause
        </Button>
        <Divider />
        <Button size="sm" variant="destructive">
          Stop
        </Button>
      </Toolbar>
    </div>
  ),
};

/** Buttons and a MenuTrigger for the overflow — the usual record actions. */
export const WithOverflowMenu: Story = {
  args: { 'aria-label': 'Agent actions' },
  render: (args) => (
    <Toolbar {...args}>
      <Button size="sm" variant="secondary">
        Pause
      </Button>
      <Button size="sm" variant="secondary">
        Duplicate
      </Button>
      <MenuTrigger placement="bottom end">
        <Button
          size="sm"
          variant="tertiary"
          aria-label="More actions"
          startIcon={<Icon as={Ellipsis} />}
        />
        <Menu>
          <MenuItem key="export">Export runs</MenuItem>
          <MenuItem key="delete">Delete…</MenuItem>
        </Menu>
      </MenuTrigger>
    </Toolbar>
  ),
};

// ------------------------------------------------------------------ tests

const Framed = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <Button size="sm" variant="tertiary">
      Before
    </Button>
    {children}
    <Button size="sm" variant="tertiary">
      After
    </Button>
  </div>
);

export const IsANamedToolbar: Story = {
  ...Default,
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('toolbar', { name: 'Bulk actions' });
    await expect(bar).toHaveAttribute('aria-orientation', 'horizontal');
    // The Divider is a separator a screen reader announces between groups.
    await expect(within(bar).getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
  },
};

/** ← → between controls, skipping the separator and disabled buttons. */
export const ArrowsMoveBetweenControls: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <Button size="sm">Resume</Button>
      <Button size="sm" isDisabled>
        Pause
      </Button>
      <Divider orientation="vertical" />
      <Button size="sm">Delete</Button>
    </Toolbar>
  ),
  play: async ({ canvas }) => {
    const resume = canvas.getByRole('button', { name: 'Resume' });
    const del = canvas.getByRole('button', { name: 'Delete' });
    await userEvent.click(resume);
    await userEvent.keyboard('{ArrowRight}');
    await expect(del).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(resume).toHaveFocus();
  },
};

/** One Tab in, one Tab out — not one per button. */
export const TabLeavesInOnePress: Story = {
  render: (args) => (
    <Framed>
      <Toolbar {...args}>
        <Actions />
      </Toolbar>
    </Framed>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Before' }));
    await browserKeys.keyboard('{Tab}');
    await expect(canvas.getByRole('button', { name: 'Resume' })).toHaveFocus();
    await browserKeys.keyboard('{Tab}');
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
  },
};

/** Back in with Shift+Tab lands on the control used last, not the first. */
export const ReturnsToTheControlUsedLast: Story = {
  ...TabLeavesInOnePress,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Before' }));
    await browserKeys.keyboard('{Tab}');
    await userEvent.keyboard('{ArrowRight}');
    const pause = canvas.getByRole('button', { name: 'Pause' });
    await expect(pause).toHaveFocus();
    await browserKeys.keyboard('{Tab}');
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
    await browserKeys.keyboard('{Shift>}{Tab}{/Shift}');
    await expect(pause).toHaveFocus();
  },
};

/** Right-to-left mirrors the arrows: → moves toward the start. */
export const ArrowsMirrorInRtl: Story = {
  render: (args) => (
    <I18nProvider locale="ar-EG">
      <div dir="rtl">
        <Toolbar {...args}>
          <Button size="sm">Resume</Button>
          <Button size="sm">Pause</Button>
        </Toolbar>
      </div>
    </I18nProvider>
  ),
  play: async ({ canvas }) => {
    const resume = canvas.getByRole('button', { name: 'Resume' });
    await userEvent.click(resume);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(canvas.getByRole('button', { name: 'Pause' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(resume).toHaveFocus();
  },
};

export const VerticalUsesUpAndDown: Story = {
  ...Vertical,
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('toolbar');
    await expect(bar).toHaveAttribute('aria-orientation', 'vertical');
    const resume = canvas.getByRole('button', { name: 'Resume' });
    await userEvent.click(resume);
    await userEvent.keyboard('{ArrowRight}');
    await expect(resume).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('button', { name: 'Pause' })).toHaveFocus();
  },
};

/**
 * A text field and a native select keep their own arrow keys: the caret moves
 * and the value changes, where the toolbar would otherwise have taken both.
 */
export const FieldsKeepTheirArrowKeys: Story = {
  args: { 'aria-label': 'Page size' },
  render: (args) => (
    <Toolbar {...args}>
      <Input size="sm" aria-label="Go to page" defaultValue="12" />
      <Select
        size="sm"
        aria-label="Rows"
        defaultValue="25"
        options={[
          { value: '10', label: '10' },
          { value: '25', label: '25' },
          { value: '50', label: '50' },
        ]}
      />
      <Button size="sm">Apply</Button>
    </Toolbar>
  ),
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox') as HTMLInputElement;
    await userEvent.click(field);
    field.setSelectionRange(2, 2);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(field).toHaveFocus();
    await expect(field.selectionStart).toBe(1);

    const select = canvas.getByRole('combobox', { name: 'Rows' });
    select.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(select).toHaveFocus();
  },
};

/** A menu trigger inside still opens on ↓ — only ← → are the toolbar's. */
export const MenuTriggerStillOpensOnArrowDown: Story = {
  ...WithOverflowMenu,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(await within(document.body).findByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(more).toHaveFocus());
  },
};

/** A toolbar inside a toolbar is a group, and the outer one owns the keys. */
export const NestedToolbarIsAGroup: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <Toolbar aria-label="Run">
        <Button size="sm">Resume</Button>
        <Button size="sm">Pause</Button>
      </Toolbar>
      <Divider orientation="vertical" />
      <Button size="sm">Delete</Button>
    </Toolbar>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('toolbar')).toHaveLength(1);
    await expect(canvas.getByRole('group', { name: 'Run' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('button', { name: 'Delete' })).toHaveFocus();
  },
};

/** Narrow, it wraps rather than overflowing, and keeps 8 between controls. */
export const WrapsWhenNarrow: Story = {
  render: (args) => (
    <div style={{ width: 200 }} data-testid="frame">
      <Toolbar {...args}>
        <Actions />
      </Toolbar>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const frame = canvas.getByTestId('frame').getBoundingClientRect();
    const buttons = [...canvasElement.querySelectorAll('button')];
    for (const b of buttons) {
      await expect(b.getBoundingClientRect().right).toBeLessThanOrEqual(
        frame.right + 1,
      );
    }
    const tops = new Set(
      buttons.map((b) => Math.round(b.getBoundingClientRect().top)),
    );
    await expect(tops.size).toBeGreaterThan(1);
    const [a, b] = buttons.map((el) => el.getBoundingClientRect());
    await expect(Math.round(b.left - a.right)).toBe(8);
  },
};
