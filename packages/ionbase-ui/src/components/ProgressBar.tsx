import React, { forwardRef, useId } from 'react';

export type ProgressBarIntent = 'primary' | 'success' | 'warning' | 'error';
export type ProgressBarSize = 'sm' | 'md';

export interface ProgressBarProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** What is progressing. Required — a bare bar announces a number and no noun. */
  label: string;
  /** 0 to `max`. Omit for an indeterminate bar. */
  value?: number;
  /** Defaults to 100. */
  max?: number;
  intent?: ProgressBarIntent;
  size?: ProgressBarSize;
  /** Show the label as text above the track. */
  isLabelVisible?: boolean;
  /** Show the percentage beside the label. Determinate bars only. */
  isValueVisible?: boolean;
  /**
   * Spoken instead of the percentage — "3 of 12 files". A percentage is rarely
   * the thing a person wants read aloud.
   */
  valueText?: string;
}

const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max);

/**
 * ProgressBar — a determinate or indeterminate measure of work.
 *
 * DETERMINATE AND INDETERMINATE ARE THE SAME COMPONENT ON PURPOSE
 *
 * Work that starts unmeasurable and becomes measurable is the common case — a
 * upload that does not know its size until the first chunk lands. Splitting
 * them into two components would make that transition a swap, which remounts
 * the node and loses the live region with it.
 *
 * Omitting `value` is what makes it indeterminate. `aria-valuenow` is then
 * omitted too, which is exactly what the ARIA spec asks for and is the detail
 * hand-rolled progress bars get wrong most often — a bar reporting
 * `aria-valuenow="0"` forever tells a screen reader the work is stuck at zero,
 * not that it is unmeasured.
 *
 * WHY `label` IS REQUIRED
 *
 * `role="progressbar"` announces a number. Without a name the user hears "42
 * percent" with no indication of what is at 42 percent, which is worse than
 * silence because it sounds like information.
 */
export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
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
    const isIndeterminate = value === undefined;
    const resolved = isIndeterminate ? 0 : clamp(value, max);
    const pct = max > 0 ? (resolved / max) * 100 : 0;

    const classNames = [
      'ion-progress-bar',
      intent !== 'primary' ? `ion-progress-bar--${intent}` : '',
      size !== 'md' ? `ion-progress-bar--${size}` : '',
      isIndeterminate ? 'ion-progress-bar--indeterminate' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div {...rest} ref={ref} className={classNames}>
        <div
          className={
            isLabelVisible ? 'ion-progress-bar__header' : 'ion-visually-hidden'
          }
        >
          <span id={labelId} className="ion-progress-bar__label">
            {label}
          </span>
          {isLabelVisible && isValueVisible && !isIndeterminate && (
            <span className="ion-progress-bar__value">
              {valueText ?? `${Math.round(pct)}%`}
            </span>
          )}
        </div>

        <div
          className="ion-progress-bar__track"
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={max}
          // Omitted entirely when indeterminate — a bar stuck at
          // aria-valuenow="0" reads as no progress rather than no measurement.
          {...(isIndeterminate
            ? {}
            : {
                'aria-valuenow': resolved,
                ...(valueText ? { 'aria-valuetext': valueText } : {}),
              })}
        >
          <div
            className="ion-progress-bar__fill"
            style={
              isIndeterminate
                ? undefined
                : ({
                    '--ion-progress-bar-pct': `${pct}%`,
                  } as React.CSSProperties)
            }
          />
        </div>
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';
