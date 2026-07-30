import React, { forwardRef } from 'react';

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  /** Matches Figma's `Style` variant. */
  orientation?: DividerOrientation;
}

/**
 * A single `<hr>`, matching Figma's `Border` (70:22153).
 *
 * `<hr>` rather than a styled `<div>`: it is a semantic thematic break, so a
 * screen reader announces it as one, and it needs no `role` to get there.
 * `aria-orientation` is set for the vertical case, since a vertical rule
 * inside a horizontal toolbar is the one shape a screen reader cannot infer
 * from the element alone.
 */
export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  ({ orientation = 'horizontal', className, ...rest }, ref) => (
    <hr
      {...rest}
      ref={ref}
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      className={['ion-divider', `ion-divider--${orientation}`, className]
        .filter(Boolean)
        .join(' ')}
    />
  ),
);

Divider.displayName = 'Divider';
