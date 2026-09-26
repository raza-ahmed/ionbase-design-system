import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  Button,
  NotificationsPanel,
  Popover,
  type NotificationItem,
  type NotificationsPanelProps,
} from 'ionbase-ui';

/** 15:00 local on 26 Sep 2026: every story counts days from here. */
const NOW = new Date(2026, 8, 26, 15, 0);
const at = (daysAgo: number, h: number, m = 0) =>
  new Date(2026, 8, 26 - daysAgo, h, m);

const ITEMS: NotificationItem[] = [
  {
    id: 'a',
    title: 'Invoice agent needs approval',
    description: 'It wants to send a refund of €1,240 to Northwind.',
    timestamp: at(0, 14, 20),
  },
  {
    id: 'b',
    title: 'Nightly sync failed twice',
    description: 'The CRM returned HTTP 502.',
    timestamp: at(0, 9, 5),
  },
  {
    id: 'c',
    title: 'Ada mentioned you on Triage agent',
    timestamp: at(1, 17, 40),
    isRead: true,
  },
  {
    id: 'd',
    title: 'Weekly digest is ready',
    timestamp: at(6, 8, 0),
    isRead: true,
  },
];

/** The panel with its data kept, as a caller would. */
function Live(props: Partial<NotificationsPanelProps>) {
  const [items, setItems] = useState(props.notifications ?? ITEMS);
  return (
    <div style={{ width: 360 }}>
      <NotificationsPanel
        now={NOW}
        locale="en-GB"
        onOpen={() => {}}
        {...props}
        notifications={items}
        onReadChange={(id, isRead) =>
          setItems((all) =>
            all.map((n) => (n.id === id ? { ...n, isRead } : n)),
          )
        }
        onMarkAllRead={() =>
          setItems((all) => all.map((n) => ({ ...n, isRead: true })))
        }
      />
    </div>
  );
}

const meta: Meta<typeof NotificationsPanel> = {
  title: 'Components/NotificationsPanel',
  component: NotificationsPanel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'What the bell opens: notifications grouped by day, unread ones marked in words as well as a dot, a read toggle on each that becomes "Mark as unread" rather than vanishing, and Mark all as read. It is content — put it in a Popover titled Notifications, or a Drawer on a phone. The caller owns the data.',
      },
    },
  },
  render: () => <Live />,
};

export default meta;
type Story = StoryObj<typeof NotificationsPanel>;

export const Default: Story = {};
export const Empty: Story = {
  render: () => (
    <div style={{ width: 360 }}>
      <NotificationsPanel notifications={[]} />
    </div>
  ),
};
export const Loading: Story = {
  render: () => (
    <div style={{ width: 360 }}>
      <NotificationsPanel notifications={[]} isLoading />
    </div>
  ),
};
export const UnderTheBell: Story = {
  render: () => {
    function Bell() {
      const [items, setItems] = useState(ITEMS);
      const unread = items.filter((n) => !n.isRead).length;
      return (
        <Popover
          title="Notifications"
          size="lg"
          content={
            <NotificationsPanel
              now={NOW}
              notifications={items}
              onOpen={() => {}}
              onReadChange={(id, isRead) =>
                setItems((all) =>
                  all.map((n) => (n.id === id ? { ...n, isRead } : n)),
                )
              }
              onMarkAllRead={() =>
                setItems((all) => all.map((n) => ({ ...n, isRead: true })))
              }
            />
          }
        >
          <Button
            variant="secondary"
            aria-label={`Notifications, ${unread} unread`}
          >
            Notifications
          </Button>
        </Popover>
      );
    }
    return <Bell />;
  },
};

// ------------------------------------------------------------------ tests

const openSpy = fn();
const readSpy = fn();

const rows = (el: HTMLElement) =>
  [...el.querySelectorAll('.ion-notification')] as HTMLElement[];
const status = (el: HTMLElement) =>
  el.querySelector('.ion-notifications > [role="status"]') as HTMLElement;

/**
 * Grouped by day, newest first: Today, Yesterday, Earlier — each a section
 * named by its heading.
 */
export const GroupedByDayNewestFirst: Story = {
  play: async ({ canvas }) => {
    const sections = canvas.getAllByRole('region');
    await expect(
      sections.map((s) => s.getAttribute('aria-labelledby')),
    ).toHaveLength(3);
    await expect(
      canvas.getAllByRole('heading', { level: 3 }).map((h) => h.textContent),
    ).toEqual(['Today', 'Yesterday', 'Earlier']);
    await expect(sections[0]).toHaveAccessibleName('Today');
    const today = within(sections[0])
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.ion-notification__open')!.textContent);
    await expect(today).toEqual([
      'Unread: Invoice agent needs approval',
      'Unread: Nightly sync failed twice',
    ]);
  },
};

/** Newest first whatever order the data comes in. */
export const NewestFirstWhateverTheOrder: Story = {
  render: () => (
    <NotificationsPanel
      now={NOW}
      notifications={[ITEMS[1], ITEMS[3], ITEMS[0], ITEMS[2]]}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(
      rows(canvasElement).map(
        (r) => r.querySelector('.ion-notification__title')!.textContent,
      ),
    ).toEqual([
      'Unread: Invoice agent needs approval',
      'Unread: Nightly sync failed twice',
      'Ada mentioned you on Triage agent',
      'Weekly digest is ready',
    ]);
  },
};

/** Days are calendar days: 23:50 last night is Yesterday at 00:30 today. */
export const CalendarDaysNotWindows: Story = {
  render: () => (
    <NotificationsPanel
      now={new Date(2026, 8, 26, 0, 30)}
      notifications={[
        {
          id: 'x',
          title: 'Late run',
          timestamp: new Date(2026, 8, 25, 23, 50),
        },
        { id: 'y', title: 'Two days', timestamp: new Date(2026, 8, 24, 12, 0) },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole('heading').map((h) => h.textContent),
    ).toEqual(['Yesterday', 'Earlier']);
  },
};

/**
 * Unread is said, not only shown: its title begins "Unread:", its dot is
 * filled, and the bar counts them in words.
 */
export const UnreadIsSaid: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('2 unread')).toBeVisible();
    await expect(
      canvas.getByRole('button', {
        name: 'Unread: Invoice agent needs approval',
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Ada mentioned you on Triage agent' }),
    ).toBeVisible();
    const [unread, , read] = rows(canvasElement);
    const dot = (r: HTMLElement) =>
      getComputedStyle(r.querySelector('.ion-notification__dot')!)
        .backgroundColor;
    await expect(dot(unread)).not.toBe(dot(read));
    await expect(dot(read)).toBe('rgba(0, 0, 0, 0)');
    const weight = (r: HTMLElement) =>
      getComputedStyle(r.querySelector('.ion-notification__title')!).fontWeight;
    await expect(Number(weight(unread))).toBeGreaterThan(Number(weight(read)));
  },
};

/**
 * The toggle stays: pressed from the keyboard it becomes "Mark as unread",
 * keeps focus, and the change is announced in the same status region.
 */
export const TheToggleStaysAndSaysSo: Story = {
  play: async ({ canvas, canvasElement }) => {
    const region = status(canvasElement);
    await expect(region).toHaveTextContent(/^$/);
    const toggle = within(rows(canvasElement)[0]).getByRole('button', {
      name: 'Mark as read',
    });
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(toggle).toHaveAccessibleName('Mark as unread');
    await expect(toggle).toHaveFocus();
    await expect(status(canvasElement)).toBe(region);
    await expect(region).toHaveTextContent('Marked as read');
    await expect(canvas.getByText('1 unread')).toBeVisible();

    await userEvent.keyboard('{Enter}');
    await expect(toggle).toHaveAccessibleName('Mark as read');
    await expect(region).toHaveTextContent('Marked as unread');
  },
};

/**
 * Mark all as read goes once there is nothing left — so focus moves to the
 * first notification first, not to the top of the page.
 */
export const MarkAllMovesFocusFirst: Story = {
  play: async ({ canvas, canvasElement }) => {
    const all = canvas.getByRole('button', { name: 'Mark all as read' });
    all.focus();
    await userEvent.keyboard('{Enter}');
    await expect(
      canvas.queryByRole('button', { name: 'Mark all as read' }),
    ).toBeNull();
    await expect(
      canvas.getByRole('button', { name: 'Invoice agent needs approval' }),
    ).toHaveFocus();
    await expect(status(canvasElement)).toHaveTextContent(
      'All notifications marked as read',
    );
    await expect(canvas.getByText('No unread')).toBeVisible();
  },
};

/** Opening an unread one marks it read; opening a read one only opens it. */
export const OpeningMarksItRead: Story = {
  render: () => (
    <NotificationsPanel
      now={NOW}
      notifications={ITEMS}
      onOpen={openSpy}
      onReadChange={readSpy}
    />
  ),
  play: async ({ canvas }) => {
    openSpy.mockClear();
    readSpy.mockClear();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unread: Nightly sync failed twice' }),
    );
    await expect(openSpy).toHaveBeenCalledWith('b');
    await expect(readSpy).toHaveBeenCalledWith('b', true);
    readSpy.mockClear();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Weekly digest is ready' }),
    );
    await expect(openSpy).toHaveBeenCalledWith('d');
    await expect(readSpy).not.toHaveBeenCalled();
  },
};

/** With `href` the title is a link to it. Without a handler, plain text. */
export const LinksAndText: Story = {
  render: () => (
    <NotificationsPanel
      now={NOW}
      notifications={[{ ...ITEMS[0], href: '#/approvals/a' }, { ...ITEMS[2] }]}
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole('link', {
        name: 'Unread: Invoice agent needs approval',
      }),
    ).toHaveAttribute('href', '#/approvals/a');
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(
      rows(canvasElement)[1].querySelector('.ion-notification__title'),
    ).toHaveTextContent('Ada mentioned you on Triage agent');
  },
};

/** Each time is a machine-readable <time>: a clock time today, a date earlier. */
export const TimesAreTimes: Story = {
  play: async ({ canvasElement }) => {
    const times = rows(canvasElement).map(
      (r) => r.querySelector('time') as HTMLTimeElement,
    );
    await expect(times[0].dateTime).toBe(at(0, 14, 20).toISOString());
    await expect(times[0]).toHaveTextContent('14:20');
    await expect(times[3]).toHaveTextContent('20 Sept');
  },
};

export const EmptyIsAllCaughtUp: Story = {
  ...Empty,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'You’re all caught up' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('list')).toBeNull();
    await expect(canvas.queryByText(/unread/)).toBeNull();
  },
};

/** Loading: busy, announced, and no list or count. */
export const LoadingIsAnnounced: Story = {
  ...Loading,
  play: async ({ canvas, canvasElement }) => {
    await expect(status(canvasElement)).toHaveTextContent(
      'Loading notifications',
    );
    await expect(
      canvasElement.querySelector('.ion-notifications__loading'),
    ).toHaveAttribute('aria-busy', 'true');
    await expect(canvas.queryByRole('heading')).toBeNull();
  },
};

/** No handlers, no controls: nothing to press that would do nothing. */
export const NoHandlersNoControls: Story = {
  render: () => <NotificationsPanel now={NOW} notifications={ITEMS} />,
  play: async ({ canvas }) => {
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
  },
};

/** A long list scrolls inside the panel, from 28rem. */
export const ALongListScrolls: Story = {
  render: () => (
    <Live
      notifications={Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        title: `Run ${i + 1} finished`,
        timestamp: at(0, 14, 59 - i),
      }))}
    />
  ),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector(
      '.ion-notifications__list',
    ) as HTMLElement;
    await expect(list.clientHeight).toBe(448);
    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
  },
};

export const LabelsAreTranslatable: Story = {
  render: () => (
    <Live
      labels={{
        today: 'Heute',
        yesterday: 'Gestern',
        earlier: 'Früher',
        unread: (n) => `${n} ungelesen`,
        markAllRead: 'Alle als gelesen markieren',
        markRead: 'Als gelesen markieren',
        markUnread: 'Als ungelesen markieren',
        unreadPrefix: 'Ungelesen:',
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('2 ungelesen')).toBeVisible();
    await expect(
      canvas.getAllByRole('heading').map((h) => h.textContent),
    ).toEqual(['Heute', 'Gestern', 'Früher']);
    await expect(
      canvas.getByRole('button', {
        name: 'Ungelesen: Invoice agent needs approval',
      }),
    ).toBeVisible();
    await expect(
      canvas.getAllByRole('button', { name: 'Als gelesen markieren' }),
    ).toHaveLength(2);
  },
};
