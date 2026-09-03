import React, { forwardRef } from 'react';

export type BadgeIntent =
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'information';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeShape = 'pill' | 'rounded';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Matches the Figma `Intent` variant. */
  intent?: BadgeIntent;
  /**
   * Figma's `Size` variant. Heights are 20 / 24 / 32, pinned rather than
   * derived from padding. `sm` is the default and is the size this component
   * shipped with before the ramp existed.
   */
  size?: BadgeSize;
  /**
   * Figma's `Shape` variant. `rounded` steps its corner with the size so the
   * radius stays proportional; `pill` is fully round at every size.
   */
  shape?: BadgeShape;
  /**
   * Show the leading dot marker. Figma's `Show Dot` boolean.
   * The dot inherits the intent's foreground colour, so it needs no prop.
   */
  dot?: boolean;
  /** Leading icon. Figma's `Show Icon` + `Icon` swap. Mutually exclusive with `dot`. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Badge is presentational — no role, no interaction. React Aria has nothing to
 * offer here, so this is a plain span rather than a hook wrapper for its own
 * sake.
 *
 * It carries no `status` or `alert` role on purpose: a badge is a label on
 * something else, and announcing it as a live region would interrupt screen
 * reader users on every render. Wrap it yourself if the value genuinely changes
 * and matters.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      intent = 'neutral',
      size = 'sm',
      shape = 'pill',
      dot,
      icon,
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <span
      {...rest}
      ref={ref}
      className={[
        'ion-badge',
        `ion-badge--${intent}`,
        size !== 'sm' ? `ion-badge--${size}` : '',
        shape !== 'pill' ? `ion-badge--${shape}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && <span className="ion-badge__dot" aria-hidden="true" />}
      {!dot && icon}
      {/*
       * The label is wrapped because Figma gives it its own `Label Slot` frame
       * with padding the dot and icon do not get. Putting that padding on the
       * badge instead would move the dot away from the edge with it.
       */}
      {children != null && children !== false && (
        <span className="ion-badge__label">{children}</span>
      )}
    </span>
  ),
);

Badge.displayName = 'Badge';
