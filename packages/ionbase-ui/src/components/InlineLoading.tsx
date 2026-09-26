'use client';

import React, { forwardRef, useEffect, useRef } from 'react';
import {
  StatusIndicator,
  type StatusIndicatorIntent,
  type StatusIndicatorSize,
} from './StatusIndicator.js';

export type InlineLoadingStatus = 'inactive' | 'active' | 'finished' | 'error';

export interface InlineLoadingProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children' | 'role'
> {
  /**
   * Where the action is: `inactive` shows nothing, `active` is under way,
   * `finished` succeeded, `error` failed. Keep the component mounted and
   * change this — the region has to exist before its words change, or the
   * change is not announced.
   */
  status?: InlineLoadingStatus;
  /** Shown and announced while `active`. */
  activeLabel?: string;
  /** Shown and announced when `finished`. */
  finishedLabel?: string;
  /** Shown and announced on `error`. Say what failed, briefly; the detail belongs in an Alert. */
  errorLabel?: string;
  /**
   * Called `successDelay` ms after `finished`, usually to set the status back
   * to `inactive` — the "Saved" has been seen and read by then.
   */
  onSuccess?: () => void;
  /** How long "finished" stays before `onSuccess`. */
  successDelay?: number;
  /** `sm` beside a small control or in a row; `md` beside body text. */
  size?: StatusIndicatorSize;
}

const INTENT: Record<
  Exclude<InlineLoadingStatus, 'inactive'>,
  StatusIndicatorIntent
> = {
  active: 'progress',
  finished: 'success',
  error: 'error',
};

/**
 * InlineLoading — the pending → done → failed of one action, in place: beside
 * the switch that was flipped, the button that was pressed.
 *
 * THE REGION IS ALWAYS THERE. A live region announces a change to its
 * content, not its own arrival: `{saving && <span role="status">Saving…</span>}`
 * is inserted with its words already in it, and most screen readers say
 * nothing. So this renders its `role="status"` span in every state, empty
 * while `inactive`, and only its words change. Mount it with the control.
 *
 * WORDS, NOT A SPINNER. Each state is StatusIndicator's shape and a word — a
 * spinning arc and "Saving…", a check and "Saved", an octagon and "Not
 * saved" — so the outcome reaches someone who cannot see the colour, or the
 * screen. The shape is hidden; the word is what is announced, politely: the
 * user is waiting for it, and an interruption would cut off their own
 * screen reader's echo of the press.
 *
 * "SAVED" GOES AWAY BY ITSELF. `onSuccess` fires `successDelay` after
 * `finished` so the caller can go back to `inactive`. An error stays until
 * the next attempt: a failure that vanishes was never reported.
 *
 * IT DOES NOT TOUCH THE CONTROL. Keep the control enabled while it is
 * active and ignore presses instead: disabling the switch a keyboard user just
 * pressed throws their focus to the top of the page.
 */
export const InlineLoading = forwardRef<HTMLSpanElement, InlineLoadingProps>(
  (
    {
      status = 'active',
      activeLabel = 'Saving…',
      finishedLabel = 'Saved',
      errorLabel = 'Not saved',
      onSuccess,
      successDelay = 1500,
      size = 'sm',
      className,
      ...rest
    },
    ref,
  ) => {
    // The latest callback, so a re-render does not restart the delay.
    const onSuccessRef = useRef(onSuccess);
    onSuccessRef.current = onSuccess;

    useEffect(() => {
      if (status !== 'finished') return;
      const timer = window.setTimeout(
        () => onSuccessRef.current?.(),
        successDelay,
      );
      return () => window.clearTimeout(timer);
    }, [status, successDelay]);

    const label =
      status === 'active'
        ? activeLabel
        : status === 'finished'
          ? finishedLabel
          : errorLabel;

    return (
      <span
        {...rest}
        ref={ref}
        role="status"
        data-status={status}
        className={['ion-inline-loading', className || '']
          .filter(Boolean)
          .join(' ')}
      >
        {status !== 'inactive' && (
          <StatusIndicator intent={INTENT[status]} size={size}>
            {label}
          </StatusIndicator>
        )}
      </span>
    );
  },
);

InlineLoading.displayName = 'InlineLoading';
