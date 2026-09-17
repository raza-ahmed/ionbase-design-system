'use client';

import React, { forwardRef, useId, useState } from 'react';

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Names the navigation landmark. Required: a page with a sidebar usually has
   * a second `<nav>` too, and "navigation, navigation" tells nobody which is
   * which.
   */
  label: string;
  /**
   * Pinned above the scrolling body — a workspace switcher, a search trigger,
   * icon buttons. Any component.
   */
  header?: React.ReactNode;
  /**
   * Pinned below the scrolling body — an Invite button, help, a trial notice.
   * Any component.
   */
  footer?: React.ReactNode;
  /**
   * `SidebarSection`s, and anything that sits between them — a `Divider`, a
   * promotional card. Items themselves always go inside a section.
   */
  children?: React.ReactNode;
}

export interface SidebarSectionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /** The group's name — "Spaces", "Favorites". Omit for the top group. */
  title?: string;
  /** Lets the title fold the section away. Needs a `title`. */
  isCollapsible?: boolean;
  /** Uncontrolled: whether a collapsible section starts open. */
  defaultExpanded?: boolean;
  /** Controlled: whether a collapsible section is open. */
  isExpanded?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
  /**
   * Controls beside the title — a `+` Button to create a space. Icon-only
   * buttons need their own `aria-label`.
   */
  actions?: React.ReactNode;
  /** `SidebarItem`s only — the section renders a list. */
  children?: React.ReactNode;
}

export interface SidebarItemProps extends Omit<
  React.LiHTMLAttributes<HTMLLIElement>,
  'onClick'
> {
  /**
   * The item's text. A string, because it also names the expand button of an
   * item that has children.
   */
  label: string;
  /** Leading icon. Decorative — `label` names the item. */
  icon?: React.ReactNode;
  /** Where it goes. Omit for an item that only groups its children. */
  href?: string;
  /** For an item that acts rather than navigates. Ignored with `href`. */
  onPress?: () => void;
  /** The page the user is on. Marked `aria-current="page"`. */
  isCurrent?: boolean;
  isDisabled?: boolean;
  /** Trailing text — a count, a shortcut, a status. */
  badge?: React.ReactNode;
  /**
   * Controls for this row — `…` and `+`. Revealed on hover and whenever focus
   * is inside the row; always shown on touch screens. Icon-only buttons need
   * their own `aria-label`.
   */
  actions?: React.ReactNode;
  /**
   * Uncontrolled: whether the children start open. Defaults to open when the
   * current page is somewhere inside.
   */
  defaultExpanded?: boolean;
  /** Controlled: whether the children are open. */
  isExpanded?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
  /** Nested `SidebarItem`s. Their presence is what makes the item expandable. */
  children?: React.ReactNode;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m9 6 6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Does any SidebarItem below these children carry `isCurrent`? */
function containsCurrent(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement<SidebarItemProps>(child)) return false;
    return (
      child.props.isCurrent === true || containsCurrent(child.props.children)
    );
  });
}

function useDisclosure(
  controlled: boolean | undefined,
  initial: boolean,
  onChange?: (next: boolean) => void,
) {
  const [internal, setInternal] = useState(initial);
  const isOpen = controlled ?? internal;
  const toggle = () => {
    const next = !isOpen;
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };
  return [isOpen, toggle] as const;
}

/**
 * Sidebar — an application's navigation, as a column.
 *
 * DISCLOSURE NAVIGATION, NOT `role="tree"`
 *
 * A file-tree look invites the tree role, and the tree role is wrong here.
 * A treeview takes the arrow keys, allows one tab stop for the whole widget,
 * and does not permit interactive content inside an item — so the `…` and `+`
 * buttons on a row, which are half the point of a workspace sidebar, could not
 * exist in it. This is the WAI-ARIA disclosure navigation pattern instead:
 * nested lists of links, each expandable level behind a real button with
 * `aria-expanded`, and everything reachable with Tab.
 *
 * AN ITEM THAT IS A LINK AND HAS CHILDREN GETS TWO CONTROLS
 *
 * A button cannot sit inside a link. So a row that navigates AND expands
 * renders the link and a separate chevron button beside it; a row with no
 * `href` is one button that expands. The actions slot is a sibling of both,
 * never nested inside either.
 *
 * THE CURRENT PAGE IS NEVER FOLDED AWAY
 *
 * An item whose subtree contains the current page starts open. A sidebar that
 * loads with the user's location collapsed inside a closed group tells a
 * sighted user nothing and a screen-reader user less.
 *
 * Expansion is per item, controlled or not. Remembering it across visits is the
 * caller's job — this component cannot know where that state should live.
 */
export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ label, header, footer, children, className, ...rest }, ref) => (
    <nav
      {...rest}
      ref={ref}
      aria-label={label}
      className={['ion-sidebar', className || ''].filter(Boolean).join(' ')}
    >
      {header && <div className="ion-sidebar__header">{header}</div>}
      <div className="ion-sidebar__body">{children}</div>
      {footer && <div className="ion-sidebar__footer">{footer}</div>}
    </nav>
  ),
);

Sidebar.displayName = 'Sidebar';

export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  (
    {
      title,
      isCollapsible = false,
      defaultExpanded = true,
      isExpanded: isExpandedProp,
      onExpandedChange,
      actions,
      children,
      className,
      ...rest
    },
    ref,
  ) => {
    const titleId = useId();
    const listId = useId();
    const collapsible = isCollapsible && !!title;
    const [isOpen, toggle] = useDisclosure(
      collapsible ? isExpandedProp : true,
      collapsible ? defaultExpanded : true,
      onExpandedChange,
    );

    return (
      <div
        {...rest}
        ref={ref}
        className={['ion-sidebar__section', className || '']
          .filter(Boolean)
          .join(' ')}
      >
        {title && (
          <div className="ion-sidebar__section-header">
            {collapsible ? (
              <button
                type="button"
                id={titleId}
                className={[
                  'ion-sidebar__section-title',
                  isOpen ? 'ion-sidebar__section-title--expanded' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={toggle}
              >
                {title}
                <span className="ion-sidebar__chevron" aria-hidden="true">
                  <Chevron />
                </span>
              </button>
            ) : (
              <span id={titleId} className="ion-sidebar__section-title">
                {title}
              </span>
            )}
            {actions && (
              <span className="ion-sidebar__section-actions">{actions}</span>
            )}
          </div>
        )}
        <ul
          id={listId}
          className="ion-sidebar__list"
          aria-labelledby={title ? titleId : undefined}
          hidden={!isOpen}
        >
          {children}
        </ul>
      </div>
    );
  },
);

SidebarSection.displayName = 'SidebarSection';

export const SidebarItem = forwardRef<HTMLLIElement, SidebarItemProps>(
  (
    {
      label,
      icon,
      href,
      onPress,
      isCurrent = false,
      isDisabled = false,
      badge,
      actions,
      defaultExpanded,
      isExpanded: isExpandedProp,
      onExpandedChange,
      children,
      className,
      ...rest
    },
    ref,
  ) => {
    const listId = useId();
    const hasChildren = React.Children.toArray(children).some((c) =>
      React.isValidElement(c),
    );
    const [isOpen, toggle] = useDisclosure(
      isExpandedProp,
      defaultExpanded ?? containsCurrent(children),
      onExpandedChange,
    );

    const content = (
      <>
        {icon && (
          <span className="ion-sidebar__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="ion-sidebar__label">{label}</span>
        {badge !== undefined && badge !== null && (
          <span className="ion-sidebar__badge">{badge}</span>
        )}
      </>
    );

    const chevron = (
      <span
        className={[
          'ion-sidebar__chevron',
          isOpen ? 'ion-sidebar__chevron--expanded' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        <Chevron />
      </span>
    );

    let main: React.ReactNode;
    if (href !== undefined && !isDisabled) {
      main = (
        <a
          href={href}
          className="ion-sidebar__link"
          aria-current={isCurrent ? 'page' : undefined}
        >
          {content}
        </a>
      );
    } else if (hasChildren && href === undefined) {
      // No destination: the whole row is the disclosure.
      main = (
        <button
          type="button"
          className="ion-sidebar__link"
          aria-expanded={isOpen}
          aria-controls={listId}
          disabled={isDisabled}
          onClick={toggle}
        >
          {content}
          {chevron}
        </button>
      );
    } else if (onPress && !isDisabled) {
      main = (
        <button type="button" className="ion-sidebar__link" onClick={onPress}>
          {content}
        </button>
      );
    } else {
      main = (
        <span
          className="ion-sidebar__link"
          aria-current={isCurrent ? 'page' : undefined}
          aria-disabled={isDisabled || undefined}
        >
          {content}
        </span>
      );
    }

    return (
      <li
        {...rest}
        ref={ref}
        className={['ion-sidebar__item', className || '']
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={[
            'ion-sidebar__row',
            isCurrent ? 'ion-sidebar__row--current' : '',
            isDisabled ? 'ion-sidebar__row--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {main}
          {actions && <span className="ion-sidebar__actions">{actions}</span>}
          {/* A link that also expands: the toggle is its own button, beside it. */}
          {hasChildren && href !== undefined && (
            <button
              type="button"
              className="ion-sidebar__toggle"
              aria-label={label}
              aria-expanded={isOpen}
              aria-controls={listId}
              disabled={isDisabled}
              onClick={toggle}
            >
              {chevron}
            </button>
          )}
        </div>
        {hasChildren && (
          <ul
            id={listId}
            className="ion-sidebar__list ion-sidebar__list--nested"
            hidden={!isOpen}
          >
            {children}
          </ul>
        )}
      </li>
    );
  },
);

SidebarItem.displayName = 'SidebarItem';
