import React, { forwardRef, useId } from 'react';

export type ProgressRingIntent = 'primary' | 'success' | 'warning' | 'error';
export type ProgressRingSize = 'sm' | 'md' | 'lg';

export interface ProgressRingProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** What is progressing. Required — a bare ring announces a number and no noun. */
  label: string;
  /** 0 to `max`. Required: a ring with no value is a Spinner. */
  value: number;
  /** Defaults to 100. */
  max?: number;
  intent?: ProgressRingIntent;
  /** Small sits in a line of text; Medium and Large hold the percentage inside. */
  size?: ProgressRingSize;
  /** Show the label as text beside the ring. */
  isLabelVisible?: boolean;
  /**
   * Show the value. Medium and Large put the percentage inside the ring;
   * Small has no room, so the value follows the ring as text.
   */
  isValueVisible?: boolean;
  /**
   * Spoken instead of the percentage — "3 of 5 steps done" — and shown beside
   * the ring in place of it. The centre keeps the percentage, which fits.
   */
  valueText?: string;
}

const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max);

/**
 * ProgressRing — how far a piece of work has got, as a ring that fills
 * clockwise from the top. ProgressBar's contract in a square: a value out of
 * `max`, a required label, an intent for the thing measured.
 *
 * DETERMINATE ONLY
 *
 * A ring with no value is a Spinner, and a second component that also spins
 * would make an agent choose between two for the same wait. Work that starts
 * unmeasurable is ProgressBar's, which keeps its node when the value arrives.
 *
 * CLOCKWISE IN EVERY DIRECTION
 *
 * A ring fills the way a clock's hand moves, and clocks do not mirror in a
 * right-to-left locale. Only the text beside it moves to the other side.
 *
 * THE STROKE IS A TENTH OF THE DIAMETER
 *
 * The circle is drawn in a 100-unit box and scales with the ring, so the
 * track is 2px on Small, 5.6px on Medium and 8px on Large without a stroke
 * size per step. The fill is `pathLength="100"` dashed to the percentage, so
 * the CSS needs the percentage and nothing else.
 */
export const ProgressRing = forwardRef<HTMLDivElement, ProgressRingProps>(
  (
    {
      label,
      value,
      max = 100,
      intent = 'primary',
      size = 'md',
      isLabelVisible = false,
      isValueVisible = false,
      valueText,
      className,
      ...rest
    },
    ref,
  ) => {
    const labelId = useId();
    const resolved = clamp(value, max);
    const pct = max > 0 ? (resolved / max) * 100 : 0;
    const percent = `${Math.round(pct)}%`;
    const inside = isValueVisible && size !== 'sm';
    const beside = isValueVisible && (size === 'sm' || valueText);

    const classNames = [
      'ion-progress-ring',
      intent !== 'primary' ? `ion-progress-ring--${intent}` : '',
      size !== 'md' ? `ion-progress-ring--${size}` : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div {...rest} ref={ref} className={classNames}>
        <div
          className="ion-progress-ring__ring"
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={resolved}
          {...(valueText ? { 'aria-valuetext': valueText } : {})}
          style={{ '--ion-progress-ring-pct': pct } as React.CSSProperties}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle
              className="ion-progress-ring__track"
              cx="50"
              cy="50"
              r="45"
            />
            <circle
              className="ion-progress-ring__fill"
              cx="50"
              cy="50"
              r="45"
              pathLength={100}
            />
          </svg>
          {inside && (
            <span className="ion-progress-ring__percent" aria-hidden="true">
              {percent}
            </span>
          )}
        </div>
        <span
          className={
            isLabelVisible || beside
              ? 'ion-progress-ring__text'
              : 'ion-visually-hidden'
          }
        >
          <span
            id={labelId}
            className={
              isLabelVisible
                ? 'ion-progress-ring__label'
                : 'ion-visually-hidden'
            }
          >
            {label}
          </span>
          {beside && (
            <span className="ion-progress-ring__value">
              {valueText ?? percent}
            </span>
          )}
        </span>
      </div>
    );
  },
);

ProgressRing.displayName = 'ProgressRing';
