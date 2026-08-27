'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';

export type AgentActivityStatus =
  'pending' | 'active' | 'done' | 'failed' | 'skipped';

export interface AgentActivityProps extends React.HTMLAttributes<HTMLOListElement> {
  children?: React.ReactNode;
  /**
   * Announce the step that just became active, once, in a polite live region.
   *
   * On by default because the whole point of an activity log is knowing what
   * the agent is doing without watching it. Turn it off when several logs are
   * on screen at once, or they narrate over each other.
   */
  announceActive?: boolean;
}

export interface AgentActivityStepProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** What the agent did, in the user's language. Not a function name. */
  children?: React.ReactNode;
  status?: AgentActivityStatus;
  /** The result, a tool name, a count — whatever makes the step checkable. */
  detail?: React.ReactNode;
}

const STATUS_TEXT: Record<AgentActivityStatus, string> = {
  pending: 'Not started',
  active: 'In progress',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
};

const Glyphs: Record<AgentActivityStatus, () => React.ReactElement> = {
  pending: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  active: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  done: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  failed: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="m9 9 6 6M15 9l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  skipped: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.5 12h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
};

/**
 * AgentActivity — what the agent is doing, in plain language.
 *
 * An ordered list, because the steps happened in an order and a screen reader
 * should say "3 of 7". Not a log viewer: this is the account a person reads to
 * decide whether to let the run continue, so the text belongs in their
 * language — "Searched the invoice archive", not `searchIndex(q, {limit:50})`.
 *
 * STATUS IS NEVER CARRIED BY THE ICON ALONE. Every step renders its status as
 * text as well as a glyph. The glyphs differ in shape rather than only in
 * colour, so the list survives greyscale, colour blindness and forced-colours
 * mode — WCAG 1.4.1, which a row of coloured dots fails outright.
 *
 * ONE POLITE ANNOUNCEMENT PER STEP, not one per render. The active step's text
 * is announced when it changes, so a user who is not watching still knows where
 * the run has got to. Watching the DOM instead would re-announce on every
 * unrelated update, which is the failure mode that makes people turn logs off.
 */
export const AgentActivity = forwardRef<HTMLOListElement, AgentActivityProps>(
  ({ children, announceActive = true, className, ...rest }, ref) => {
    /*
     * Read the active step out of the children rather than asking the caller to
     * repeat it in a prop. Two sources for one fact is how they disagree.
     */
    const activeLabel = React.Children.toArray(children).reduce<string>(
      (found, child) => {
        if (found) return found;
        if (!React.isValidElement<AgentActivityStepProps>(child)) return found;
        if (child.props.status !== 'active') return found;
        return typeof child.props.children === 'string'
          ? child.props.children
          : 'In progress';
      },
      '',
    );

    const [announcement, setAnnouncement] = useState('');
    /*
     * Seeded with '' rather than the current label, so the FIRST active step is
     * announced too. Seeding it with `activeLabel` reads as "only announce
     * changes" and silently swallows the one announcement that matters most —
     * the log usually mounts at the moment the run starts, and that first step
     * is exactly what a user who is not watching needs to hear.
     */
    const previous = useRef('');
    useEffect(() => {
      if (!announceActive) return;
      if (activeLabel && activeLabel !== previous.current)
        setAnnouncement(activeLabel);
      previous.current = activeLabel;
    }, [activeLabel, announceActive]);

    return (
      <>
        <ol
          {...rest}
          ref={ref}
          className={['ion-agent-activity', className]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </ol>
        {announceActive && (
          <span
            className="ion-visually-hidden"
            role="status"
            aria-live="polite"
          >
            {announcement}
          </span>
        )}
      </>
    );
  },
);

AgentActivity.displayName = 'AgentActivity';

export const AgentActivityStep = forwardRef<
  HTMLLIElement,
  AgentActivityStepProps
>(({ children, status = 'pending', detail, className, ...rest }, ref) => {
  const Glyph = Glyphs[status];
  return (
    <li
      {...rest}
      ref={ref}
      data-status={status}
      className={[
        'ion-agent-activity__step',
        `ion-agent-activity__step--${status}`,
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="ion-agent-activity__glyph" aria-hidden="true">
        <Glyph />
      </span>
      <span className="ion-agent-activity__body">
        <span className="ion-agent-activity__label">{children}</span>
        {detail && <span className="ion-agent-activity__detail">{detail}</span>}
      </span>
      {/* Status as text, not only as a coloured shape. */}
      <span className="ion-visually-hidden">{STATUS_TEXT[status]}</span>
    </li>
  );
});

AgentActivityStep.displayName = 'AgentActivityStep';
