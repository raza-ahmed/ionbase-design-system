'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';

export type AgentStopSize = 'sm' | 'md' | 'lg';

export interface AgentStopProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
> {
  /** Called when the user asks the run to stop. */
  onStop: () => void;
  /**
   * The request is in flight. The control stays visible and keeps its place;
   * it does not disappear while the thing it cancels is still running.
   */
  isStopping?: boolean;
  /** Visible label. */
  label?: string;
  /** Visible label once `isStopping` is set. */
  stoppingLabel?: string;
  size?: AgentStopSize;
  /**
   * Bind Escape, at the document, to stop the run.
   *
   * Off by default and deliberately so: Escape already means "dismiss the
   * thing in front of me" to every modal, popover and menu in this system, and
   * a document-level handler would cancel a background run when the user meant
   * to close a dialog. Turn it on only where the run IS the foreground task.
   */
  stopOnEscape?: boolean;
}

/** A square, not a glyph with meaning to learn. Universal stop. */
const StopGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect
      x="6"
      y="6"
      width="12"
      height="12"
      rx="1.5"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

/**
 * AgentStop — the always-visible way to end a run.
 *
 * NOT OPTIONAL, AND NOT BEHIND A MENU. A user who cannot stop an agent is
 * watching it, not supervising it. Human oversight of an automated process is
 * a compliance surface in regulated contexts, not a UX preference, and the
 * control that provides it has to be present and reachable at the moment it is
 * wanted — not two clicks into an overflow menu.
 *
 * WHY IT IS NOT JUST `<Button variant="destructive">`
 *
 * Three things it owns that a Button does not:
 *
 *   It keeps its place while stopping. A control that vanishes the instant it
 *   is pressed leaves the user unsure whether the press registered, and the
 *   run is usually still going. It stays, relabels, and disables — the layout
 *   does not move.
 *
 *   It announces. The label change is only announced to a screen reader if the
 *   button happens to hold focus, which it usually does not when a run was
 *   started elsewhere. A polite live region says "Stopping" once.
 *
 *   It is not destructive-red. Stopping is a normal, expected, reversible-in-
 *   spirit action — you can run it again. Colouring it like `delete` teaches
 *   hesitation about the one control that must never be hesitated over.
 *
 * WHAT IT DOES NOT DO. It does not stop anything. It reports intent; the
 * caller aborts the request, closes the stream and settles the state. A stop
 * button that resolves optimistically while tokens keep arriving is worse than
 * none, because it lies about a guarantee the user is relying on.
 */
export const AgentStop = forwardRef<HTMLButtonElement, AgentStopProps>(
  (
    {
      onStop,
      isStopping = false,
      label = 'Stop',
      stoppingLabel = 'Stopping…',
      size = 'md',
      stopOnEscape = false,
      className,
      ...rest
    },
    ref,
  ) => {
    /*
     * Announce the transition, not the state. A live region that always holds
     * "Stopping…" is re-read on unrelated updates in some screen readers;
     * writing it once on the edge, and clearing it after, says it exactly once.
     */
    const [announcement, setAnnouncement] = useState('');
    const wasStopping = useRef(isStopping);
    useEffect(() => {
      if (isStopping && !wasStopping.current) setAnnouncement(stoppingLabel);
      if (!isStopping && wasStopping.current) setAnnouncement('');
      wasStopping.current = isStopping;
    }, [isStopping, stoppingLabel]);

    const stopRef = useRef(onStop);
    stopRef.current = onStop;

    useEffect(() => {
      if (!stopOnEscape || isStopping) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        // An overlay that is open owns Escape. Do not cancel a run because the
        // user tried to close a dialog on top of it.
        if ((event.target as HTMLElement | null)?.closest?.('[role="dialog"]'))
          return;
        stopRef.current();
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [stopOnEscape, isStopping]);

    return (
      <>
        <button
          {...rest}
          ref={ref}
          type="button"
          disabled={isStopping}
          data-stopping={isStopping || undefined}
          onClick={(event) => {
            rest.onClick?.(event);
            if (!event.defaultPrevented) onStop();
          }}
          className={[
            'ion-agent-stop',
            size !== 'md' ? `ion-agent-stop--${size}` : '',
            className || '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="ion-agent-stop__glyph">
            <StopGlyph />
          </span>
          <span className="ion-agent-stop__label">
            {isStopping ? stoppingLabel : label}
          </span>
        </button>
        <span
          className="ion-agent-stop__status ion-visually-hidden"
          role="status"
          aria-live="polite"
        >
          {announcement}
        </span>
      </>
    );
  },
);

AgentStop.displayName = 'AgentStop';
