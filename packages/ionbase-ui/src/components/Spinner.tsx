import React, { forwardRef } from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  /** Matches the icon size ramp: sm, md, lg. */
  size?: SpinnerSize;
  /** What is loading. Announced politely; visible only with `isLabelVisible`. */
  label?: string;
  /** Render the label as text beside the ring as well as announcing it. */
  isLabelVisible?: boolean;
  /**
   * The spinner conveys nothing on its own — something else already says the
   * region is busy. Renders inert: no role, no live region, hidden from AT.
   */
  isDecorative?: boolean;
}

/**
 * Spinner — an indeterminate wait, announced once.
 *
 * WHY THIS IS NOT A DIV WITH A CSS ANIMATION
 *
 * The obvious implementation is inaccessible in a specific and common way: a
 * spinning graphic with no text is silence to a screen reader, so the user is
 * told nothing happened. Generated code in this repo's own eval corpus reached
 * for a bare `role="status"` in 48 files, which is the right instinct and only
 * half the job — the role creates a live region, but an empty one announces
 * nothing at all.
 *
 * So the default carries a label. It is visually hidden, it lives inside the
 * live region, and it is what makes "Loading" reach the user who cannot see the
 * ring.
 *
 * `isDecorative` exists because the opposite mistake is just as easy. A spinner
 * inside a button whose label already changed to "Saving…" would announce
 * twice, and two live regions racing is worse than one. Decorative renders no
 * role at all rather than `aria-hidden` on a live region, which browsers treat
 * inconsistently.
 *
 * MOTION
 *
 * `prefers-reduced-motion` slows the rotation rather than stopping it. A
 * stationary spinner is not a calmer spinner — it is a broken one, and it
 * removes the only signal a sighted user has that the wait is still live.
 */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  (
    {
      size = 'md',
      label = 'Loading',
      isLabelVisible = false,
      isDecorative = false,
      className,
      ...rest
    },
    ref,
  ) => {
    const classNames = [
      'ion-spinner',
      size !== 'md' ? `ion-spinner--${size}` : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span
        {...rest}
        ref={ref}
        className={classNames}
        {...(isDecorative
          ? { 'aria-hidden': true }
          : { role: 'status', 'aria-live': 'polite' })}
      >
        <span className="ion-spinner__ring" aria-hidden="true" />
        {!isDecorative && (
          <span
            className={
              isLabelVisible ? 'ion-spinner__label' : 'ion-visually-hidden'
            }
          >
            {label}
          </span>
        )}
      </span>
    );
  },
);

Spinner.displayName = 'Spinner';
