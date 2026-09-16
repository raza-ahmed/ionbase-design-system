import React, { forwardRef } from 'react';

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Names the landmark. A page with more than one `nav` needs them told apart,
   * and "Breadcrumb" is what screen-reader users are listening for.
   */
  label?: string;
  /** `BreadcrumbItem` elements, ancestor first. */
  children?: React.ReactNode;
}

export interface BreadcrumbItemProps extends Omit<
  React.LiHTMLAttributes<HTMLLIElement>,
  'onClick'
> {
  /** Omit on the current page — the last crumb is not a link. */
  href?: string;
  /**
   * The page the user is on. Marked `aria-current="page"` and rendered as text
   * rather than a link.
   */
  isCurrent?: boolean;
  children?: React.ReactNode;
}

/**
 * Breadcrumb — where this page sits, and how to get back up.
 *
 * WHY AN ORDERED LIST INSIDE A NAMED LANDMARK
 *
 * The trail is a sequence, and `ol` is what says so: a screen reader announces
 * "list, 4 items" and the position within it, which is the entire content of a
 * breadcrumb. A row of `div`s with slashes conveys none of that, and the
 * slashes themselves get read out as punctuation.
 *
 * The separator here is drawn by CSS `::before` on each item after the first,
 * so it is decoration that never enters the accessibility tree. Putting a "/"
 * in the markup is the usual version of this component and the usual defect.
 *
 * THE LAST CRUMB IS NOT A LINK
 *
 * `isCurrent` renders text with `aria-current="page"`. A link to the page you
 * are already on is a dead control: it announces as a link, invites a click,
 * and does nothing. This is the most common breadcrumb bug and the reason the
 * prop exists rather than being inferred from position — a trail whose last
 * crumb IS a link to somewhere else is legitimate, and inferring would break it.
 */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ label = 'Breadcrumb', children, className, ...rest }, ref) => (
    <nav
      {...rest}
      ref={ref}
      aria-label={label}
      className={['ion-breadcrumb', className || ''].filter(Boolean).join(' ')}
    >
      <ol className="ion-breadcrumb__list">{children}</ol>
    </nav>
  ),
);

Breadcrumb.displayName = 'Breadcrumb';

export const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ href, isCurrent = false, children, className, ...rest }, ref) => (
    <li
      {...rest}
      ref={ref}
      className={['ion-breadcrumb__item', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      {isCurrent || !href ? (
        <span
          className="ion-breadcrumb__current"
          {...(isCurrent ? { 'aria-current': 'page' } : {})}
        >
          {children}
        </span>
      ) : (
        <a href={href} className="ion-breadcrumb__link">
          {children}
        </a>
      )}
    </li>
  ),
);

BreadcrumbItem.displayName = 'BreadcrumbItem';
