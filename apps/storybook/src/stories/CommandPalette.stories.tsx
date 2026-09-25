import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import {
  Button,
  CommandPalette,
  Icon,
  Kbd,
  type CommandPaletteItem,
} from 'ionbase-ui';
import { Bot } from 'ionbase-icons/icons/bot';
import { House } from 'ionbase-icons/icons/house';
import { List } from 'ionbase-icons/icons/list';
import { Moon } from 'ionbase-icons/icons/moon';
import { Play } from 'ionbase-icons/icons/play';
import { Plus } from 'ionbase-icons/icons/plus';
import { Settings } from 'ionbase-icons/icons/settings';

const COMMANDS: CommandPaletteItem[] = [
  {
    id: 'new-agent',
    label: 'Create agent',
    icon: <Icon as={Plus} size="sm" />,
    shortcut: 'mod+shift+n',
    section: 'Actions',
    keywords: ['new', 'add'],
  },
  {
    id: 'run-all',
    label: 'Run all failing agents',
    description: 'Retries the 3 agents whose last run failed',
    icon: <Icon as={Play} size="sm" />,
    section: 'Actions',
  },
  {
    id: 'export',
    label: 'Export runs as CSV',
    description: 'Available on the Team plan',
    section: 'Actions',
    isDisabled: true,
  },
  {
    id: 'theme',
    label: 'Switch to dark theme',
    icon: <Icon as={Moon} size="sm" />,
    section: 'Actions',
    keywords: ['appearance', 'mode'],
  },
  {
    id: 'go-overview',
    label: 'Go to Overview',
    icon: <Icon as={House} size="sm" />,
    section: 'Navigation',
  },
  {
    id: 'go-agents',
    label: 'Go to Agents',
    icon: <Icon as={Bot} size="sm" />,
    section: 'Navigation',
  },
  {
    id: 'go-runs',
    label: 'Go to Runs',
    icon: <Icon as={List} size="sm" />,
    section: 'Navigation',
  },
  {
    id: 'go-settings',
    label: 'Go to Settings',
    icon: <Icon as={Settings} size="sm" />,
    shortcut: 'mod+,',
    section: 'Navigation',
    keywords: ['preferences'],
  },
];

const isMac = () => /mac|iphone|ipad/i.test(navigator.platform);
/** The palette's own shortcut, pressed the way this browser's platform does. */
const OPEN_KEYS = () => (isMac() ? '{Meta>}k{/Meta}' : '{Control>}k{/Control}');

/** A page with a trigger button, the way a product mounts it. */
function Page({
  onAction = () => {},
  defaultOpen = false,
  commands = COMMANDS,
}: {
  onAction?: (id: string) => void;
  defaultOpen?: boolean;
  commands?: CommandPaletteItem[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [ran, setRan] = useState('nothing');
  return (
    <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'start' }}>
      <Button
        variant="secondary"
        onPress={() => setOpen(true)}
        endIcon={<Kbd shortcut="mod+k" />}
      >
        Search commands
      </Button>
      <p data-testid="ran">{ran}</p>
      <CommandPalette
        commands={commands}
        isOpen={open}
        onOpenChange={setOpen}
        onAction={(id) => {
          setRan(id);
          onAction(id);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof CommandPalette> = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Every action in the product, one search away. Drawn in Figma as `Command Palette` with `Kbd`, on the Command Palette page.\n\n**⌘K on a Mac, Ctrl+K elsewhere** opens it from anywhere on the page, and the same keys close it. Mount it once, near the root, with every command the product has; typing filters by label, description, section and `keywords`; Enter runs the highlighted row.\n\nA combobox driving an always-open listbox through `aria-activedescendant` — focus never leaves the search field — inside a modal dialog. `onAction` is called after the palette has closed, so an action that moves focus keeps it.\n\n**Not the only route.** Everything in the palette must also be reachable without it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

export const Default: Story = { render: () => <Page /> };

export const Open: Story = { render: () => <Page defaultOpen /> };

export const NothingMatches: Story = {
  render: () => <Page defaultOpen />,
  play: async ({ userEvent }) => {
    await userEvent.keyboard('zzzz');
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await expect(dialog.querySelectorAll('[role="option"]')).toHaveLength(0);
    await expect(dialog).toHaveTextContent('No matching commands');
  },
};

export const ItIsADialogWithAComboboxDrivingAListbox: Story = {
  render: () => <Page defaultOpen />,
  play: async () => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await expect(dialog).toHaveAccessibleName('Command palette');
    const input = dialog.querySelector('[role="combobox"]') as HTMLElement;
    // Focus lands in the field on open, and the list is always expanded.
    await waitFor(() => expect(document.activeElement).toBe(input));
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    const list = document.getElementById(
      input.getAttribute('aria-controls')!,
    ) as HTMLElement;
    await expect(list).toHaveAttribute('role', 'listbox');
    // The first runnable row is active before anything is typed.
    const first = list.querySelector('[role="option"]') as HTMLElement;
    await expect(input).toHaveAttribute('aria-activedescendant', first.id);
    await expect(first).toHaveAttribute('aria-selected', 'true');
    // Sections are named groups.
    await expect(
      list.querySelectorAll('[role="group"][aria-labelledby]'),
    ).toHaveLength(2);
  },
};

export const ShortcutOpensAndClosesIt: Story = {
  render: () => <Page />,
  play: async ({ userEvent }) => {
    await expect(document.querySelector('[role="dialog"]')).toBeNull();
    await userEvent.keyboard(OPEN_KEYS());
    await waitFor(() =>
      expect(document.querySelector('[role="dialog"]')).not.toBeNull(),
    );
    // The same keys close it — from inside the search field too.
    await userEvent.keyboard(OPEN_KEYS());
    await waitFor(() =>
      expect(document.querySelector('[role="dialog"]')).toBeNull(),
    );
  },
};

export const ArrowKeysSkipDisabledRowsAndWrap: Story = {
  render: () => <Page defaultOpen />,
  play: async ({ userEvent }) => {
    const input = document.querySelector('[role="combobox"]') as HTMLElement;
    const active = () =>
      document.getElementById(input.getAttribute('aria-activedescendant')!)
        ?.textContent;
    await expect(active()).toContain('Create agent');
    await userEvent.keyboard('{ArrowDown}');
    await expect(active()).toContain('Run all failing agents');
    // "Export runs as CSV" is disabled: listed, but the arrow passes it.
    await userEvent.keyboard('{ArrowDown}');
    await expect(active()).toContain('Switch to dark theme');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    // Up from the first row wraps to the last.
    await expect(active()).toContain('Go to Settings');
  },
};

export const TypingFiltersAndAnnouncesTheCount: Story = {
  render: () => <Page defaultOpen />,
  play: async ({ userEvent }) => {
    await userEvent.keyboard('go to');
    const options = document.querySelectorAll('[role="option"]');
    await expect(options).toHaveLength(4);
    await expect(document.querySelector('[role="status"]')).toHaveTextContent(
      '4 commands',
    );
    // The section the rows belong to comes along; the empty one does not.
    await expect(
      document.querySelectorAll('[role="group"][aria-labelledby]'),
    ).toHaveLength(1);
  },
};

/** "preferences" is only a keyword; "Team plan" only a description. */
export const KeywordsAndDescriptionsAreSearched: Story = {
  render: () => <Page defaultOpen />,
  play: async ({ userEvent }) => {
    await userEvent.keyboard('preferences');
    let options = document.querySelectorAll('[role="option"]');
    await expect(options).toHaveLength(1);
    await expect(options[0]).toHaveTextContent('Go to Settings');
    const input = document.querySelector('[role="combobox"]') as HTMLElement;
    await userEvent.clear(input);
    await userEvent.type(input, 'team plan');
    options = document.querySelectorAll('[role="option"]');
    await expect(options).toHaveLength(1);
    await expect(options[0]).toHaveTextContent('Export runs as CSV');
  },
};

export const EnterRunsTheActiveCommandAndCloses: Story = {
  args: { onAction: fn() },
  render: (args) => <Page defaultOpen onAction={args.onAction} />,
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.keyboard('runs{Enter}');
    await waitFor(() =>
      expect(document.querySelector('[role="dialog"]')).toBeNull(),
    );
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await expect(args.onAction).toHaveBeenCalledWith('go-runs');
    await expect(canvas.getByTestId('ran')).toHaveTextContent('go-runs');
  },
};

export const ClickingARowRunsIt: Story = {
  args: { onAction: fn() },
  render: (args) => <Page defaultOpen onAction={args.onAction} />,
  play: async ({ args, userEvent }) => {
    const row = [...document.querySelectorAll('[role="option"]')].find((o) =>
      o.textContent?.includes('Go to Agents'),
    ) as HTMLElement;
    await userEvent.click(row);
    await waitFor(() =>
      expect(args.onAction).toHaveBeenCalledWith('go-agents'),
    );
  },
};

export const ADisabledRowDoesNotRun: Story = {
  args: { onAction: fn() },
  render: (args) => <Page defaultOpen onAction={args.onAction} />,
  play: async ({ args, userEvent }) => {
    const row = [...document.querySelectorAll('[role="option"]')].find((o) =>
      o.textContent?.includes('Export runs as CSV'),
    ) as HTMLElement;
    await expect(row).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(row);
    await expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
};

export const EscapeReturnsFocusToTheTrigger: Story = {
  render: () => <Page />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: /Search commands/ });
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute('role', 'combobox'),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  },
};

/**
 * An action that moves focus keeps it. Run from inside the dialog, the
 * dialog's focus scope would pull the focus straight back to its own search
 * field; `onAction` runs after the palette is gone for this reason.
 */
export const AnActionThatMovesFocusKeepsIt: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const search = useRef<HTMLInputElement>(null);
    return (
      <>
        <input ref={search} aria-label="Search agents" />
        <CommandPalette
          isOpen={open}
          onOpenChange={setOpen}
          commands={[{ id: 'find', label: 'Search agents' }]}
          onAction={() => search.current?.focus()}
        />
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.keyboard('{Enter}');
    const field = canvas.getByRole('textbox', { name: 'Search agents' });
    await waitFor(() => expect(document.activeElement).toBe(field));
    // Still there a few frames later: nothing restored focus over it.
    await new Promise((r) => setTimeout(r, 100));
    await expect(document.activeElement).toBe(field);
  },
};

export const WithoutAnOpenShortcut: Story = {
  render: () => (
    <CommandPalette
      commands={COMMANDS}
      openShortcut={null}
      onAction={() => {}}
    />
  ),
  play: async ({ userEvent }) => {
    await userEvent.keyboard(OPEN_KEYS());
    await new Promise((r) => setTimeout(r, 50));
    await expect(document.querySelector('[role="dialog"]')).toBeNull();
  },
};
