'use client';

import React, { forwardRef, useCallback, useId, useState } from 'react';

/** Figma's `Icon` on the Mobile-Closed toggle. Inlined for the same reason
 *  NavItem's chevron is: it is part of the control, not a slot a caller fills. */
const MenuGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M3 6h18M3 12h18M3 18h18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/** Figma's `Icon` on the Mobile-Open toggle. */
const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m5 5 14 14M19 5 5 19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export interface HeaderProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'onToggle'
> {
  /** Figma's Logo slot. Rendered at the start, never shrinks. */
  brand?: React.ReactNode;
  /** Figma's `Center Slot` — nav items. Inline on Desktop and Tablet; moves
   *  into the Mobile-Open menu below the mobile breakpoint. */
  center?: React.ReactNode;
  /** Figma's `End Slot` — buttons and actions. Same placement rules as `center`. */
  end?: React.ReactNode;
  /** Controlled Mobile-Open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Initial Mobile-Open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Fires whenever the menu toggle changes the state, controlled or not. */
  onOpenChange?: (open: boolean) => void;
  /** Accessible name for the mobile menu toggle. */
  menuLabel?: string;
  children?: React.ReactNode;
}

/**
 * Header renders Figma's four Device variants — Desktop, Tablet,
 * Mobile-Closed, Mobile-Open — from one DOM tree.
 *
 * TWO AXES, AND THEY ARE NOT THE SAME KIND OF THING
 *
 * Figma spells Device as a single four-way variant, but it is really two: a
 * *breakpoint* (Desktop / Tablet / Mobile) and a *state* (Closed / Open). They
 * are modelled differently here because they are known by different people.
 *
 *   Breakpoint is a media query. It is the one variant axis in the system the
 *   browser already knows the answer to — a header is Mobile because the
 *   viewport is narrow — and having React duplicate that judgement is how the
 *   two drift apart. Breakpoints match the Breakpoint collection's container
 *   widths: Tablet below 1216, Mobile below 896.
 *
 *   Open/Closed is a prop, because only the caller knows. It follows the
 *   controlled/uncontrolled pair the rest of the system uses.
 *
 * ONE TREE, TWO LAYOUTS
 *
 * `center` and `end` sit inline in the bar on Desktop and Tablet, and inside
 * the dropped Menu-Container on Mobile-Open. They are rendered once, in one
 * wrapper, which is `display: contents` above the mobile breakpoint and an
 * absolutely positioned panel below it. Rendering them twice — or moving them
 * with JavaScript — would mean the same nav link exists twice in the
 * accessibility tree, and would reset any state a caller put in a slot every
 * time the viewport crossed 896px.
 *
 * The centre slot is no longer hidden on Tablet. Figma's Tablet variant ships
 * it populated; the previous release collapsed it, which was correct for the
 * previous design and is not for this one.
 *
 * A `<header>` element with no explicit role: it is a landmark already when it
 * is a direct child of body, which is where a page header sits.
 */
export const Header = forwardRef<HTMLElement, HeaderProps>(
  (
    {
      brand,
      center,
      end,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      menuLabel = 'Menu',
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const menuId = useId();
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = openProp !== undefined;
    const isOpen = isControlled ? openProp : uncontrolledOpen;

    const toggle = useCallback(() => {
      const next = !isOpen;
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    }, [isOpen, isControlled, onOpenChange]);

    /*
     * Escape closes the menu. It is a disclosure rather than a modal — no focus
     * trap, no scroll lock — so Escape is the whole of the dismissal contract,
     * and it is handled on the header rather than the document so a header that
     * is never open never listens.
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape' && isOpen) toggle();
      rest.onKeyDown?.(event);
    };

    return (
      <header
        {...rest}
        onKeyDown={handleKeyDown}
        ref={ref}
        data-open={isOpen || undefined}
        className={['ion-header', className].filter(Boolean).join(' ')}
      >
        {brand && <div className="ion-header__brand">{brand}</div>}

        {/*
         * Always rendered, even when both slots are empty, so the bar does not
         * reflow the first time a slot gains content.
         */}
        <div className="ion-header__menu" id={menuId}>
          <div className="ion-header__center">{center}</div>
          <div className="ion-header__end">{end}</div>
        </div>

        {children}

        <button
          type="button"
          className="ion-header__toggle"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={menuLabel}
          onClick={toggle}
        >
          {isOpen ? <CloseGlyph /> : <MenuGlyph />}
        </button>
      </header>
    );
  },
);

Header.displayName = 'Header';
