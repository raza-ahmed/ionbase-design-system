'use client';

import React, { forwardRef, useCallback } from 'react';
import { UNSAFE_PortalProvider } from 'react-aria';

export type Theme = 'light' | 'dark';

export type ThemeZoneElement =
  'div' | 'section' | 'aside' | 'header' | 'footer' | 'nav';

export interface ThemeZoneProps extends React.HTMLAttributes<HTMLElement> {
  /** The theme everything inside takes, whatever the page's is. */
  theme: Theme;
  /**
   * Draw no box: the zone's children lay out as if it were not there — a
   * grid cell stays a grid cell, a sticky header stays sticky — and take its
   * theme all the same. For wrapping a component that paints its own
   * surface. Without it the zone is a block with the theme's page surface
   * and text colour.
   */
  contents?: boolean;
  /** The element, when the zone is a box. Ignored with `contents`. */
  as?: ThemeZoneElement;
  children?: React.ReactNode;
}

/**
 * The container an overlay opened inside a zone renders into: one per
 * theme, at the end of <body>, carrying that theme. Overlays leave the zone's
 * DOM so no `overflow` or `transform` on it can clip or misplace them — but
 * they keep its theme, which a portal straight to <body> would drop.
 *
 * `data-react-aria-top-layer`, because the container outlives the overlays
 * in it. A modal opened elsewhere hides everything outside itself, this
 * container included, and a menu opened later from a zone inside that modal
 * would render into a hidden, inert node. react-aria leaves nodes with the
 * attribute alone, as it does its toasts.
 *
 * `null` on a server: react-aria asks for the container while rendering.
 */
const portalFor = (theme: Theme) => {
  if (typeof document === 'undefined') return null;
  const found = document.querySelector<HTMLElement>(
    `body > [data-ion-theme-portal="${theme}"]`,
  );
  if (found) return found;
  const el = document.createElement('div');
  el.setAttribute('data-ion-theme-portal', theme);
  el.setAttribute('data-theme', theme);
  el.setAttribute('data-react-aria-top-layer', '');
  document.body.append(el);
  return el;
};

/**
 * ThemeZone — a part of the page in the other theme: a dark header on a
 * light page, a light document preview in a dark app.
 *
 * `data-theme` on any element re-declares every themed token beneath it,
 * light as well as dark, so the zone's components need nothing of their
 * own. The zone adds what the attribute alone does not: text in the theme's
 * colour, native controls and scrollbars in its `color-scheme`, and menus,
 * popovers, tooltips and dialogs opened from inside it in its theme rather
 * than the page's.
 */
export const ThemeZone = forwardRef<HTMLElement, ThemeZoneProps>(
  ({ theme, contents, as: Tag = 'div', className, children, ...rest }, ref) => {
    const getContainer = useCallback(() => portalFor(theme), [theme]);
    const El = contents ? 'div' : Tag;
    return (
      <El
        ref={ref as React.Ref<never>}
        {...rest}
        data-theme={theme}
        className={[
          'ion-theme-zone',
          contents ? 'ion-theme-zone--contents' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <UNSAFE_PortalProvider getContainer={getContainer}>
          {children}
        </UNSAFE_PortalProvider>
      </El>
    );
  },
);

ThemeZone.displayName = 'ThemeZone';
