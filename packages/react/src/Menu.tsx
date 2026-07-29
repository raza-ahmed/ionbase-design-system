import React, { forwardRef } from 'react';

export interface MenuProps extends React.HTMLAttributes<HTMLUListElement> {
  children?: React.ReactNode;
}

/**
 * Menu is the list surface, not a popover.
 *
 * Figma models the list alone — there is no trigger, anchor or open state in
 * the design — so this renders the surface and nothing else. Positioning it
 * against a button is the caller's job until Figma has a component that says
 * how. Building a popover here would be inventing design, and it would be the
 * hard half to unpick later.
 *
 * `role="menu"` is deliberately NOT set. A real ARIA menu owes the user
 * roving-tabindex arrow navigation, typeahead and focus containment; claiming
 * the role without them is worse for a screen-reader user than an honest list,
 * because it promises interactions that are not there. When the popover exists,
 * the role comes with it.
 */
export const Menu = forwardRef<HTMLUListElement, MenuProps>(
  ({ className, children, ...rest }, ref) => (
    <ul
      {...rest}
      ref={ref}
      className={['ion-menu', className].filter(Boolean).join(' ')}
    >
      {children}
    </ul>
  ),
);

Menu.displayName = 'Menu';

export interface MenuItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> {
  /** Figma's `Selected` / `Selected-hover` states. Shows the trailing check. */
  isSelected?: boolean;
  /** Figma's `Show Leading Icon` + `Leading Icon` swap. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Figma's trailing check. Always occupies its slot so rows never reflow as the
 *  selection moves; only its visibility changes. */
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m5 13 4 4L19 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ isSelected, icon, className, children, disabled, ...rest }, ref) => (
    <li>
      <button
        {...rest}
        ref={ref}
        type="button"
        disabled={disabled}
        aria-pressed={isSelected}
        className={[
          'ion-menu__item',
          isSelected ? 'ion-menu__item--selected' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {icon && (
          <span className="ion-menu__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="ion-menu__label">{children}</span>
        <span className="ion-menu__check" aria-hidden="true">
          <Check />
        </span>
      </button>
    </li>
  ),
);

MenuItem.displayName = 'MenuItem';
