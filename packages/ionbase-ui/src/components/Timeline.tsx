import React, { forwardRef } from 'react';

export interface TimelineProps extends React.OlHTMLAttributes<HTMLOListElement> {
  /** TimelineItems, in the order they are read — usually newest first. */
  children?: React.ReactNode;
}

export interface TimelineItemProps extends Omit<
  React.LiHTMLAttributes<HTMLLIElement>,
  'title'
> {
  /** What happened, as a sentence in the reader's language: "Paused the agent". */
  title: React.ReactNode;
  /** Who did it — a person's name, "System", an agent. */
  actor?: React.ReactNode;
  /**
   * When it happened. Rendered in a `<time>` whose `dateTime` is the exact
   * instant, whatever the label says.
   */
  timestamp: Date | string;
  /**
   * The text shown for the time, in place of the default date and time —
   * "2 hours ago", or a date the app formats itself.
   */
  timestampLabel?: React.ReactNode;
  /** Locale for the default label. Pass it when rendering on a server. */
  locale?: string;
  /** Time zone for the default label, e.g. "Europe/Berlin". */
  timeZone?: string;
  /** A decorative mark in the dot, for the kind of event. Hidden from assistive tech. */
  icon?: React.ReactNode;
  /** More about it — what changed from what, a reason, a link to the record. */
  children?: React.ReactNode;
}

/**
 * Timeline — what happened to a record, in order: an audit log, a record's
 * history, a ticket's activity.
 *
 * AN ORDERED LIST, because the events happened in an order and a screen
 * reader should say "3 of 12". It is named by its `aria-label`, and each
 * event reads as one sentence: what happened, who did it, when.
 *
 * NOT FOR AGENT STEPS. An agent run is AgentActivity: it has a live status
 * per step and announces the one in progress. A Timeline is history — every
 * event in it is done, so it has no status and says nothing on its own.
 *
 * THE TIME IS A REAL `<time>`. Its `dateTime` is the exact instant, so the
 * label can be relative ("2 hours ago") without losing it. The default label
 * is a medium date and a short time; pass `locale` and `timeZone` when it
 * renders on a server, or the server's and the browser's can disagree.
 *
 * THE LINE AND DOTS ARE DECORATION. The markers, and an event's icon, are
 * hidden from assistive tech; the kind of event is in its title.
 */
export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(
  ({ children, className, ...rest }, ref) => (
    <ol
      ref={ref}
      className={['ion-timeline', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </ol>
  ),
);

Timeline.displayName = 'Timeline';

const toDate = (t: Date | string) => (t instanceof Date ? t : new Date(t));

export const TimelineItem = forwardRef<HTMLLIElement, TimelineItemProps>(
  (
    {
      title,
      actor,
      timestamp,
      timestampLabel,
      locale,
      timeZone,
      icon,
      children,
      className,
      ...rest
    },
    ref,
  ) => {
    const when = toDate(timestamp);
    const valid = !Number.isNaN(when.getTime());
    const label =
      timestampLabel ??
      (valid
        ? new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone,
          }).format(when)
        : String(timestamp));

    return (
      <li
        ref={ref}
        className={['ion-timeline__item', className].filter(Boolean).join(' ')}
        {...rest}
      >
        <span
          className={[
            'ion-timeline__marker',
            icon ? 'ion-timeline__marker--icon' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="ion-timeline__body">
          <div className="ion-timeline__title">{title}</div>
          <div className="ion-timeline__meta">
            {actor != null && (
              <>
                <span className="ion-timeline__actor">{actor}</span>
                <span className="ion-timeline__separator" aria-hidden="true">
                  ·
                </span>
              </>
            )}
            <time dateTime={valid ? when.toISOString() : undefined}>
              {label}
            </time>
          </div>
          {children != null && (
            <div className="ion-timeline__detail">{children}</div>
          )}
        </div>
      </li>
    );
  },
);

TimelineItem.displayName = 'TimelineItem';
