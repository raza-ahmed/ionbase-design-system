'use client';

import React, { forwardRef, useId, useRef, useState } from 'react';
import { Button } from './Button.js';
import { EmptyState, type EmptyStateHeadingLevel } from './EmptyState.js';
import { Skeleton } from './Skeleton.js';
import { Tooltip } from './Tooltip.js';

export interface NotificationItem {
  /** Stable id; what `onReadChange` and `onOpen` are called with. */
  id: string;
  /** What happened, in a line: "Invoice agent needs approval". */
  title: string;
  /** The detail, in a sentence or two. */
  description?: React.ReactNode;
  /** When it happened. A Date, or an ISO 8601 string. */
  timestamp: Date | string;
  isRead?: boolean;
  /** Where opening it goes. Without `href` or `onOpen` the title is text. */
  href?: string;
  /** A decorative mark before the text — an Avatar, an Icon. Hidden from AT. */
  icon?: React.ReactNode;
}

export interface NotificationsPanelLabels {
  today: string;
  yesterday: string;
  earlier: string;
  /** The count in the bar. */
  unread: (count: number) => string;
  markAllRead: string;
  markRead: string;
  markUnread: string;
  /** Read before the title of an unread notification. */
  unreadPrefix: string;
  /** Announced after each change. */
  markedRead: string;
  markedUnread: string;
  markedAllRead: string;
  emptyTitle: string;
  emptyDescription: string;
  loading: string;
}

const DEFAULT_LABELS: NotificationsPanelLabels = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
  unread: (n) => (n === 0 ? 'No unread' : `${n} unread`),
  markAllRead: 'Mark all as read',
  markRead: 'Mark as read',
  markUnread: 'Mark as unread',
  unreadPrefix: 'Unread:',
  markedRead: 'Marked as read',
  markedUnread: 'Marked as unread',
  markedAllRead: 'All notifications marked as read',
  emptyTitle: 'You’re all caught up',
  emptyDescription: 'New notifications will show up here.',
  loading: 'Loading notifications',
};

export interface NotificationsPanelProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  notifications: NotificationItem[];
  /**
   * A notification's read state changed — its toggle was pressed, or it was
   * opened while unread. The caller owns the data and updates it.
   */
  onReadChange?: (id: string, isRead: boolean) => void;
  /** Shows "Mark all as read" while anything is unread. */
  onMarkAllRead?: () => void;
  /**
   * A notification was opened — its title pressed. With `href` it is also a
   * link. An unread one is marked read as well.
   */
  onOpen?: (id: string) => void;
  /** Rows of Skeleton in place of the list, while the first fetch runs. */
  isLoading?: boolean;
  /** "Today" and "Yesterday" are counted from here. Defaults to now. */
  now?: Date;
  /** For the times shown; defaults to the browser's. */
  locale?: string;
  /** The group headings' level. Defaults to 3, under the popover's title. */
  headingLevel?: EmptyStateHeadingLevel;
  /** Every string it shows or announces, for translation. */
  labels?: Partial<NotificationsPanelLabels>;
}

const toDate = (t: Date | string) => (t instanceof Date ? t : new Date(t));

const dayStart = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const DAY = 86_400_000;

type GroupKey = 'today' | 'yesterday' | 'earlier';

function groupOf(date: Date, now: Date): GroupKey {
  const days = Math.round((dayStart(now) - dayStart(date)) / DAY);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : 'earlier';
}

const MailIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d={
        open
          ? 'M12 2C12.59 2 13.1642 2.19117 13.6362 2.5451L20.9089 7.99965L21.0376 8.10263C21.6392 8.61675 22 9.37224 22 10.1818V19.2727C22 19.9961 21.7125 20.6895 21.201 21.201C20.6895 21.7125 19.9961 22 19.2727 22H4.72727C4.00395 22 3.31047 21.7125 2.79901 21.201C2.28755 20.6895 2 19.9961 2 19.2727V10.1818C2 9.75842 2.09829 9.3407 2.28765 8.962C2.47699 8.58331 2.75237 8.25368 3.09109 7.99965L10.3638 2.5451C10.8358 2.19117 11.41 2 12 2ZM13.424 16.1308L13.4186 16.1345C12.9935 16.4007 12.5017 16.5419 12 16.5419C11.4983 16.5419 11.0065 16.4007 10.5814 16.1345L10.576 16.1308L3.81818 11.8357V19.2727C3.81818 19.5138 3.91403 19.745 4.08452 19.9155C4.25501 20.086 4.48616 20.1818 4.72727 20.1818H19.2727C19.5138 20.1818 19.745 20.086 19.9155 19.9155C20.086 19.745 20.1818 19.5138 20.1818 19.2727V11.8357L13.424 16.1308ZM12 3.81818C11.8034 3.81818 11.6123 3.88223 11.4549 4.00018L4.18217 9.45473C4.07647 9.534 3.98901 9.63509 3.92649 9.75125L11.5455 14.5932C11.6815 14.6785 11.8395 14.7237 12 14.7237C12.1605 14.7237 12.3176 14.6785 12.4536 14.5932L20.0708 9.75213C20.0095 9.63893 19.9245 9.53681 19.8178 9.45473L12.5451 4.00018C12.3877 3.88223 12.1966 3.81818 12 3.81818Z'
          : 'M19.2727 3.81818C20.779 3.81818 22 5.03923 22 6.54545V17.4545C22 18.9608 20.779 20.1818 19.2727 20.1818H4.72727C3.22105 20.1818 2 18.9608 2 17.4545V6.54545C2 5.03923 3.22105 3.81818 4.72727 3.81818H19.2727ZM3.81818 17.4545C3.81818 17.9566 4.2252 18.3636 4.72727 18.3636H19.2727C19.7748 18.3636 20.1818 17.9566 20.1818 17.4545V9.11115L13.4054 13.4275C13.3951 13.4341 13.3848 13.4409 13.3743 13.4471C12.9584 13.6886 12.4855 13.8155 12.0045 13.8155C11.5234 13.8155 11.0505 13.6886 10.6345 13.4471C10.624 13.4409 10.613 13.4342 10.6026 13.4275L3.81818 9.11026V17.4545ZM4.72727 5.63636C4.2252 5.63636 3.81818 6.04338 3.81818 6.54545V6.95473L11.5525 11.8775C11.69 11.9562 11.846 11.9974 12.0045 11.9974C12.1625 11.9973 12.3174 11.9558 12.4545 11.8775L20.1818 6.95473V6.54545C20.1818 6.04338 19.7748 5.63636 19.2727 5.63636H4.72727Z'
      }
    />
  </svg>
);

/**
 * NotificationsPanel — what the bell opens: notifications grouped by day,
 * unread ones marked, each one openable and markable, and a way to clear
 * them all.
 *
 * CONTENT, NOT A CONTAINER. It is the panel's contents; put it in a Popover
 * under the bell on a desktop — whose `title` names it — or a Drawer on a
 * phone. It owns no data: the caller passes `notifications` and updates them
 * from `onReadChange` and `onMarkAllRead`.
 *
 * UNREAD IS SAID, NOT ONLY SHOWN. An unread notification has a dot and a
 * heavier title; to a screen reader its title begins "Unread:". The bar
 * counts them in words. The bell that opens it should say the count too —
 * "Notifications, 3 unread" — for the same reason.
 *
 * NOTHING THAT HAS FOCUS DISAPPEARS. Each notification's toggle stays where
 * it is and swaps "Mark as read" for "Mark as unread", rather than vanishing
 * once pressed. "Mark all as read" does go — there is nothing left to mark —
 * so focus moves to the first notification first, not to the top of the page.
 * Each change is announced in a status region that is always mounted.
 *
 * GROUPED BY DAY, NEWEST FIRST. Today, Yesterday, Earlier — each a heading,
 * so a screen reader can jump between them — counted from the local calendar
 * day, not from 24-hour windows.
 */
export const NotificationsPanel = forwardRef<
  HTMLDivElement,
  NotificationsPanelProps
>(
  (
    {
      notifications,
      onReadChange,
      onMarkAllRead,
      onOpen,
      isLoading = false,
      now,
      locale,
      headingLevel = 3,
      labels: labelOverrides,
      className,
      ...rest
    },
    ref,
  ) => {
    const labels = { ...DEFAULT_LABELS, ...labelOverrides };
    const [announcement, setAnnouncement] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const id = useId();
    const Heading = `h${headingLevel}` as 'h3';

    const today = now ?? new Date();
    const unread = notifications.filter((n) => !n.isRead).length;
    const time = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const date = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    });

    const groups = (['today', 'yesterday', 'earlier'] as GroupKey[])
      .map((key) => ({
        key,
        items: notifications
          .map((n) => ({ ...n, date: toDate(n.timestamp) }))
          .filter((n) => groupOf(n.date, today) === key)
          .sort((a, b) => b.date.getTime() - a.date.getTime()),
      }))
      .filter((g) => g.items.length > 0);

    const setRead = (n: NotificationItem, isRead: boolean) => {
      onReadChange?.(n.id, isRead);
      setAnnouncement(isRead ? labels.markedRead : labels.markedUnread);
    };

    const markAll = () => {
      // The button is about to go; hand focus to the first notification.
      listRef.current
        ?.querySelector<HTMLElement>('.ion-notification__open, button')
        ?.focus();
      onMarkAllRead?.();
      setAnnouncement(labels.markedAllRead);
    };

    const open = (n: NotificationItem) => {
      if (!n.isRead) onReadChange?.(n.id, true);
      onOpen?.(n.id);
    };

    return (
      <div
        {...rest}
        ref={ref}
        className={['ion-notifications', className || '']
          .filter(Boolean)
          .join(' ')}
      >
        <span className="ion-visually-hidden" role="status">
          {isLoading ? labels.loading : announcement}
        </span>

        {isLoading ? (
          <div className="ion-notifications__loading" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} lines={2} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            reason="first-run"
            size="inline"
            headingLevel={headingLevel}
            title={labels.emptyTitle}
            description={labels.emptyDescription}
          />
        ) : (
          <>
            <div className="ion-notifications__bar">
              <p className="ion-notifications__count">
                {labels.unread(unread)}
              </p>
              {onMarkAllRead && unread > 0 && (
                <Button variant="tertiary" size="sm" onPress={markAll}>
                  {labels.markAllRead}
                </Button>
              )}
            </div>
            <div className="ion-notifications__list" ref={listRef}>
              {groups.map((g) => (
                <section
                  key={g.key}
                  className="ion-notifications__group"
                  aria-labelledby={`${id}-${g.key}`}
                >
                  <Heading
                    id={`${id}-${g.key}`}
                    className="ion-notifications__heading"
                  >
                    {labels[g.key]}
                  </Heading>
                  <ul className="ion-notifications__items">
                    {g.items.map((n) => {
                      const title = (
                        <>
                          {!n.isRead && (
                            <span className="ion-visually-hidden">
                              {labels.unreadPrefix}{' '}
                            </span>
                          )}
                          {n.title}
                        </>
                      );
                      return (
                        <li
                          key={n.id}
                          className="ion-notification"
                          data-unread={n.isRead ? undefined : ''}
                        >
                          <span
                            className="ion-notification__dot"
                            aria-hidden="true"
                          />
                          {n.icon && (
                            <span
                              className="ion-notification__icon"
                              aria-hidden="true"
                            >
                              {n.icon}
                            </span>
                          )}
                          <div className="ion-notification__body">
                            <p className="ion-notification__title">
                              {n.href ? (
                                <a
                                  className="ion-notification__open"
                                  href={n.href}
                                  onClick={() => open(n)}
                                >
                                  {title}
                                </a>
                              ) : onOpen ? (
                                <button
                                  type="button"
                                  className="ion-notification__open"
                                  onClick={() => open(n)}
                                >
                                  {title}
                                </button>
                              ) : (
                                title
                              )}
                            </p>
                            {n.description && (
                              <p className="ion-notification__description">
                                {n.description}
                              </p>
                            )}
                            <time
                              className="ion-notification__time"
                              dateTime={n.date.toISOString()}
                            >
                              {g.key === 'earlier'
                                ? date.format(n.date)
                                : time.format(n.date)}
                            </time>
                          </div>
                          {onReadChange && (
                            <Tooltip
                              label={
                                n.isRead ? labels.markUnread : labels.markRead
                              }
                            >
                              <Button
                                variant="tertiary"
                                size="sm"
                                className="ion-notification__toggle"
                                aria-label={
                                  n.isRead ? labels.markUnread : labels.markRead
                                }
                                startIcon={<MailIcon open={!!n.isRead} />}
                                onPress={() => setRead(n, !n.isRead)}
                              />
                            </Tooltip>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);

NotificationsPanel.displayName = 'NotificationsPanel';
