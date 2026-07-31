import React, { forwardRef } from 'react';

export type BadgeIntent =
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'information';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Matches the Figma `Intent` variant. */
  intent?: BadgeIntent;
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
  ({ intent = 'neutral', dot, icon, className, children, ...rest }, ref) => (
    <span
      {...rest}
      ref={ref}
      className={['ion-badge', `ion-badge--${intent}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && <span className="ion-badge__dot" aria-hidden="true" />}
      {!dot && icon}
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';
