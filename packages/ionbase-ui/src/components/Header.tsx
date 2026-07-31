import React, { forwardRef } from 'react';

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Figma's Logo slot. Rendered at the start, never shrinks. */
  brand?: React.ReactNode;
  /** Figma's `Center Slot`. Hidden below 1216px, as in the Tablet and Mobile variants. */
  center?: React.ReactNode;
  /** Figma's `End Slot`. */
  end?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Header renders Figma's three Device variants through media queries, not a
 * prop.
 *
 * Device is the one variant axis in the system the browser already knows the
 * answer to. Every other component takes its variant from the caller because
 * the caller is the only one who knows; a header is Mobile because the viewport
 * is narrow, and having React duplicate that judgement is how the two drift
 * apart. Breakpoints match the Breakpoint collection's container widths.
 *
 * A `<header>` element with no explicit role: it is a landmark already when it
 * is a direct child of body, which is where a page header sits.
 */
export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ brand, center, end, className, children, ...rest }, ref) => (
    <header
      {...rest}
      ref={ref}
      className={['ion-header', className].filter(Boolean).join(' ')}
    >
      {brand && <div className="ion-header__brand">{brand}</div>}
      {/*
       * The centre slot is always rendered so the layout does not jump when it
       * gains content; CSS hides it below the desktop breakpoint, matching the
       * Tablet and Mobile variants which ship it collapsed.
       */}
      <div className="ion-header__center">{center}</div>
      {children}
      {end && <div className="ion-header__end">{end}</div>}
    </header>
  ),
);

Header.displayName = 'Header';
