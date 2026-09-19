import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import {
  Alert,
  Avatar,
  Button,
  Divider,
  Icon,
  Sidebar,
  SidebarItem,
  SidebarSection,
} from 'ionbase-ui';
import { Bell } from 'ionbase-icons/icons/bell';
import { BookOpen } from 'ionbase-icons/icons/book-open';
import { ChevronsUpDown } from 'ionbase-icons/icons/chevrons-up-down';
import { CircleQuestionMark } from 'ionbase-icons/icons/circle-question-mark';
import { Clock } from 'ionbase-icons/icons/clock';
import { Ellipsis } from 'ionbase-icons/icons/ellipsis';
import { FileText } from 'ionbase-icons/icons/file-text';
import { Folder } from 'ionbase-icons/icons/folder';
import { GitPullRequest } from 'ionbase-icons/icons/git-pull-request';
import { Globe } from 'ionbase-icons/icons/globe';
import { House } from 'ionbase-icons/icons/house';
import { Inbox } from 'ionbase-icons/icons/inbox';
import { Languages } from 'ionbase-icons/icons/languages';
import { LayoutDashboard } from 'ionbase-icons/icons/layout-dashboard';
import { LifeBuoy } from 'ionbase-icons/icons/life-buoy';
import { List } from 'ionbase-icons/icons/list';
import { Plus } from 'ionbase-icons/icons/plus';
import { Puzzle } from 'ionbase-icons/icons/puzzle';
import { Search } from 'ionbase-icons/icons/search';
import { Star } from 'ionbase-icons/icons/star';
import { Terminal } from 'ionbase-icons/icons/terminal';
import { Timer } from 'ionbase-icons/icons/timer';
import { Trash2 } from 'ionbase-icons/icons/trash-2';
import { UserPlus } from 'ionbase-icons/icons/user-plus';
import { Users } from 'ionbase-icons/icons/users';
import { Video } from 'ionbase-icons/icons/video';

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          width: '280px',
          height: '720px',
          padding: '0 16px 0 0',
          background: 'var(--surface-page)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'An application\'s navigation as a column: a pinned `header` and `footer` that take any component, a scrolling body of titled, collapsible sections, and nested items that expand.\n\n**Disclosure navigation, not `role="tree"`.** A treeview takes the arrow keys and forbids interactive content inside items, which would rule out row actions. Here everything is reachable with Tab and rows can hold buttons.\n\n**A link that also expands gets two controls** — the link, and an expand button beside it — because a button cannot sit inside a link. A row with children and no `href` is one button.\n\n**The current page is never folded away.** A row whose subtree contains the current page starts open.\n\n**Row actions appear on hover or focus**, stay in the tab order, and are always visible on touch screens.\n\nOn narrow screens, put the Sidebar inside a `Drawer`.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Sidebar>;

const ic = (as: typeof House) => <Icon as={as} size="sm" />;

const RowActions = ({ name }: { name: string }) => (
  <>
    <Button
      variant="tertiary"
      size="sm"
      aria-label={`${name} options`}
      startIcon={ic(Ellipsis)}
    />
    <Button
      variant="tertiary"
      size="sm"
      aria-label={`Add to ${name}`}
      startIcon={ic(Plus)}
    />
  </>
);

/** A project-management workspace: the first reference layout. */
const Workspace = ({
  onInvite,
  ...props
}: Partial<React.ComponentProps<typeof Sidebar>> & {
  onInvite?: () => void;
}) => (
  <Sidebar
    label="Workspace"
    header={
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Avatar size="sm" initials="S" alt="" />
        <div style={{ flex: 1, display: 'grid' }}>
          <Button variant="tertiary" size="sm" endIcon={ic(ChevronsUpDown)}>
            Sam Lee&apos;s Workspace
          </Button>
        </div>
      </div>
    }
    footer={
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, display: 'grid' }}>
          <Button size="sm" startIcon={ic(UserPlus)} onPress={onInvite}>
            Invite
          </Button>
        </div>
        <Button variant="tertiary" size="sm" startIcon={ic(CircleQuestionMark)}>
          Help
        </Button>
      </div>
    }
    {...props}
  >
    <SidebarSection>
      <SidebarItem label="Home" href="#home" icon={ic(House)} />
      <SidebarItem label="Inbox" href="#inbox" icon={ic(Inbox)} badge="4" />
      <SidebarItem label="Docs" href="#docs" icon={ic(FileText)} />
      <SidebarItem
        label="Dashboards"
        href="#dashboards"
        icon={ic(LayoutDashboard)}
      />
      <SidebarItem label="Clips" href="#clips" icon={ic(Video)} />
      <SidebarItem
        label="Timesheets"
        href="#timesheets"
        icon={ic(Timer)}
        isDisabled
      />
    </SidebarSection>

    <Divider />

    <SidebarSection title="Favorites" isCollapsible defaultExpanded={false}>
      <SidebarItem label="Roadmap" href="#roadmap" icon={ic(Star)} />
    </SidebarSection>

    <SidebarSection
      title="Spaces"
      isCollapsible
      actions={
        <Button
          variant="tertiary"
          size="sm"
          aria-label="Create a space"
          startIcon={ic(Plus)}
        />
      }
    >
      <SidebarItem
        label="Team Space"
        href="#team"
        icon={ic(Users)}
        actions={<RowActions name="Team Space" />}
      >
        <SidebarItem label="Projects" href="#projects" icon={ic(Folder)} />
        <SidebarItem label="List 1" href="#list-1" icon={ic(List)} badge="1" />
      </SidebarItem>
      <SidebarItem
        label="Design Team"
        href="#design"
        icon={ic(Users)}
        actions={<RowActions name="Design Team" />}
      >
        <SidebarItem label="Notion Tasks" icon={ic(Folder)}>
          <SidebarItem
            label="Personality"
            href="#personality"
            icon={ic(List)}
            badge="14"
            isCurrent
          />
        </SidebarItem>
        <SidebarItem
          label="Team Directory"
          href="#directory"
          icon={ic(Folder)}
        />
      </SidebarItem>
      <SidebarItem label="Sprint W30" icon={ic(Clock)}>
        <SidebarItem label="Sprint 1 (7/8 – 7/21)" href="#sprint-1" />
        <SidebarItem label="Create Sprint" onPress={() => {}} icon={ic(Plus)} />
      </SidebarItem>
    </SidebarSection>
  </Sidebar>
);

export const WorkspaceLayout: Story = { render: () => <Workspace /> };

/** A documentation product: the second reference layout, with a trial card. */
export const DocsLayout: Story = {
  render: () => (
    <Sidebar
      label="Documentation workspace"
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ flex: 1, display: 'grid' }}>
            <Button variant="tertiary" size="sm" endIcon={ic(ChevronsUpDown)}>
              SLMobbin
            </Button>
          </div>
          <Button
            variant="tertiary"
            size="sm"
            aria-label="Search"
            startIcon={ic(Search)}
          />
          <Button
            variant="tertiary"
            size="sm"
            aria-label="Notifications"
            startIcon={ic(Bell)}
          />
        </div>
      }
      footer={
        <Alert
          intent="neutral"
          title="Your trial ends in 12 days"
          actions={<Button size="sm">Upgrade</Button>}
        >
          Upgrade at any time to keep paid features.
        </Alert>
      }
    >
      <SidebarSection>
        <SidebarItem
          label="Home"
          href="#home"
          icon={ic(LayoutDashboard)}
          isCurrent
        />
        <SidebarItem label="Docs sites" href="#sites" icon={ic(Globe)} />
        <SidebarItem
          label="Change Requests"
          href="#changes"
          icon={ic(GitPullRequest)}
        />
        <SidebarItem label="Translations" href="#i18n" icon={ic(Languages)} />
        <SidebarItem label="Integrations" href="#apps" icon={ic(Puzzle)} />
      </SidebarSection>

      <SidebarSection title="Docs sites" isCollapsible>
        <SidebarItem label="SLMobbin" href="#site" icon={ic(Globe)}>
          <SidebarItem label="Home" href="#site-home" icon={ic(House)} />
          <SidebarItem
            label="Documentation"
            href="#site-docs"
            icon={ic(BookOpen)}
          />
          <SidebarItem
            label="API Reference"
            href="#site-api"
            icon={ic(Terminal)}
          />
          <SidebarItem
            label="Help Center"
            href="#site-help"
            icon={ic(LifeBuoy)}
          />
        </SidebarItem>
      </SidebarSection>

      <SidebarSection title="Spaces" isCollapsible>
        <SidebarItem label="SLMobbin" href="#space" icon={ic(Folder)} />
        <SidebarItem
          label="SLMobbin Docs"
          href="#space-docs"
          icon={ic(Folder)}
        />
      </SidebarSection>

      <SidebarSection>
        <SidebarItem label="Trash" href="#trash" icon={ic(Trash2)} />
      </SidebarSection>
    </Sidebar>
  ),
};

/** Expansion held by the caller, e.g. to remember it across visits. */
export const ControlledExpansion: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <Sidebar label="Controlled">
        <SidebarSection>
          <SidebarItem
            label="Reports"
            icon={ic(Folder)}
            isExpanded={open}
            onExpandedChange={setOpen}
          >
            <SidebarItem label="Weekly" href="#weekly" />
            <SidebarItem label="Monthly" href="#monthly" />
          </SidebarItem>
        </SidebarSection>
      </Sidebar>
    );
  },
};

/* ------------------------------------------------------------------ tests */

/** A named navigation landmark, with the current page marked. */
export const LandmarkAndCurrentPage: Story = {
  render: () => <Workspace />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('navigation', { name: 'Workspace' }),
    ).toBeInTheDocument();
    const current = canvas.getByRole('link', { name: /Personality/ });
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(
      canvas.getAllByRole('link').filter((l) => l.hasAttribute('aria-current')),
    ).toHaveLength(1);
  },
};

/** The current page is two levels deep, and both levels start open. */
export const AncestorsOfCurrentStartOpen: Story = {
  render: () => <Workspace />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: /Personality/ }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Design Team' }),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(
      canvas.getByRole('button', { name: /Notion Tasks/ }),
    ).toHaveAttribute('aria-expanded', 'true');
    // A branch without the current page stays closed.
    await expect(
      canvas.getByRole('button', { name: /Sprint W30/ }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};

/** A link with children: the link and a separate expand button, never nested. */
export const LinkParentHasSeparateToggle: Story = {
  render: () => <Workspace />,
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: /Team Space/ });
    const toggle = canvas.getByRole('button', { name: 'Team Space' });
    await expect(link.querySelector('button')).toBeNull();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('link', { name: /Projects/ })).toBeNull();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('link', { name: /Projects/ })).toBeVisible();
    await expect(
      document.getElementById(toggle.getAttribute('aria-controls')!),
    ).not.toBeNull();
  },
};

/** A group with no destination is one button. */
export const GroupWithoutHrefIsOneButton: Story = {
  render: () => <Workspace />,
  play: async ({ canvas }) => {
    const group = canvas.getByRole('button', { name: /Sprint W30/ });
    await userEvent.click(group);
    await expect(group).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('link', { name: /Sprint 1/ })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: /Create Sprint/ }),
    ).toBeVisible();
  },
};

/** A collapsible section folds its list, and the list is named by its title. */
export const SectionsCollapse: Story = {
  render: () => <Workspace />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('list', { name: 'Spaces' })).toBeVisible();
    const title = canvas.getByRole('button', { name: 'Spaces' });
    await userEvent.click(title);
    await expect(title).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('link', { name: /Team Space/ })).toBeNull();
    // Favorites starts closed because defaultExpanded={false}.
    await expect(
      canvas.getByRole('button', { name: 'Favorites' }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Row actions are in the tab order and become visible when focus arrives. */
export const RowActionsAreKeyboardReachable: Story = {
  render: () => <Workspace />,
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: /Team Space/ });
    const options = canvas.getByRole('button', { name: 'Team Space options' });
    const actions = options.closest('.ion-sidebar__actions') as HTMLElement;
    link.focus();
    await userEvent.tab();
    await expect(options).toHaveFocus();
    await expect(getComputedStyle(actions).opacity).toBe('1');
  },
};

/** A disabled item is not a link and not a tab stop. */
export const DisabledItemIsNotFocusable: Story = {
  render: () => <Workspace />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: /Timesheets/ })).toBeNull();
    const row = canvas.getByText('Timesheets').closest('[aria-disabled]');
    await expect(row).toHaveAttribute('aria-disabled', 'true');
  },
};

/** Header and footer take any component, and stay outside the scroll. */
const invited = fn();

export const HeaderAndFooterAreInteractive: Story = {
  render: () => <Workspace onInvite={invited} />,
  play: async ({ canvas, canvasElement }) => {
    invited.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Invite' }));
    await expect(invited).toHaveBeenCalledTimes(1);
    const body = canvasElement.querySelector('.ion-sidebar__body')!;
    const footer = canvasElement.querySelector('.ion-sidebar__footer')!;
    await expect(body.contains(footer)).toBe(false);
  },
};

const changed = fn();

/** Controlled: the item asks, the caller decides. */
export const ControlledItemAsks: Story = {
  render: () => (
    <Sidebar label="Controlled">
      <SidebarSection>
        <SidebarItem
          label="Reports"
          isExpanded={false}
          onExpandedChange={changed}
        >
          <SidebarItem label="Weekly" href="#weekly" />
        </SidebarItem>
      </SidebarSection>
    </Sidebar>
  ),
  play: async ({ canvas }) => {
    changed.mockClear();
    const group = canvas.getByRole('button', { name: /Reports/ });
    await userEvent.click(group);
    await expect(changed).toHaveBeenCalledWith(true);
    await expect(group).toHaveAttribute('aria-expanded', 'false');
  },
};
