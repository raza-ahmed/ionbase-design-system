'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { useHover, useFocusRing, mergeProps } from 'react-aria';

/** Figma's `Chevron` slot — always the same downward caret, shown only when
 *  `showChevron` is set. Inlined for the same reason Select's is: it is part
 *  of the control, not a slot a caller fills. */
const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface NavItemOwnProps {
  /** Figma's `Icon` slot — an optional leading icon. */
  icon?: React.ReactNode;
  /** Figma's `Show Chevron`. Set on a nav item that opens a menu, not a plain link. */
  showChevron?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export type NavItemProps = NavItemOwnProps &
  (
    | ({ href: string } & Omit<
        React.AnchorHTMLAttributes<HTMLAnchorElement>,
        keyof NavItemOwnProps
      >)
    | ({ href?: undefined } & Omit<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        keyof NavItemOwnProps | 'type'
      >)
  );

/**
 * Nav Item renders an `<a>` when given `href`, a `<button>` otherwise —
 * chosen by what the caller is actually building, the same judgment call
 * Menu and Select make. A primary nav bar is links; a nav item with
 * `showChevron` that opens a menu (no `href` of its own) is a button.
 *
 * Interaction state comes from React Aria rather than CSS pseudo-classes,
 * matching Button: `useHover` is pointer-aware so a tap does not stay
 * "hovered" until the next tap elsewhere, and `useFocusRing` shows the ring
 * only for keyboard navigation. The CSS keeps its own `:hover` /
 * `:focus-visible` rules so the stylesheet still works without React.
 */
export const NavItem = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  NavItemProps
>((props, forwardedRef) => {
  const { icon, showChevron, isDisabled, children, className, href, ...rest } =
    props as NavItemOwnProps & { href?: string };

  const domRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  useImperativeHandle(forwardedRef, () => domRef.current!);

  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const classNames = [
    'ion-nav-item',
    isDisabled ? 'ion-nav-item--disabled' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const stateAttributes = {
    'data-hovered': isHovered || undefined,
    'data-focused': isFocusVisible || undefined,
    'data-disabled': isDisabled || undefined,
  };

  const content = (
    <>
      {icon && (
        <span className="ion-nav-item__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      {showChevron && (
        <span className="ion-nav-item__chevron" aria-hidden="true">
          <Chevron />
        </span>
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <a
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        {...mergeProps(hoverProps, focusProps)}
        {...stateAttributes}
        ref={domRef as React.Ref<HTMLAnchorElement>}
        href={isDisabled ? undefined : href}
        aria-disabled={isDisabled || undefined}
        className={classNames}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      {...mergeProps(hoverProps, focusProps)}
      {...stateAttributes}
      ref={domRef as React.Ref<HTMLButtonElement>}
      type="button"
      disabled={isDisabled}
      className={classNames}
    >
      {content}
    </button>
  );
});

NavItem.displayName = 'NavItem';
