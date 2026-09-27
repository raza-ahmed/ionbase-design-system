'use client';

import React, { forwardRef } from 'react';

export interface SkipLinkProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  /** The `id` of what to skip to — the page's `<main>`. */
  target: string;
  /** What it says. Defaults to "Skip to main content". */
  children?: React.ReactNode;
}

/**
 * Move focus to the target itself, rather than following the link: in an app
 * with a hash router, `#main` would be a route, not a fragment. A target that
 * is not focusable gets `tabindex="-1"` for as long as it holds focus, so the
 * next Tab continues from inside it.
 */
const skipTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return false;
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
    el.setAttribute('data-ion-skip-target', '');
    el.addEventListener(
      'blur',
      () => {
        el.removeAttribute('tabindex');
        el.removeAttribute('data-ion-skip-target');
      },
      { once: true },
    );
  }
  // Focusing scrolls it into view as well.
  el.focus();
  return true;
};

/**
 * SkipLink — the first focusable thing on the page, so a keyboard user can
 * pass the header and navigation straight to the content.
 *
 * Hidden until it has focus, then shown at the top of the window over
 * everything, a toast included. Put it first in the body, before banners and
 * the Header, and point `target` at the page's `<main>`.
 */
export const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>(
  (
    { target, children = 'Skip to main content', className, onClick, ...rest },
    ref,
  ) => (
    <a
      ref={ref}
      {...rest}
      href={`#${target}`}
      className={['ion-skip-link', className].filter(Boolean).join(' ')}
      onClick={(e) => {
        onClick?.(e);
        // A missing target falls back to the link: the fragment, at least.
        if (!e.defaultPrevented && skipTo(target)) e.preventDefault();
      }}
    >
      {children}
    </a>
  ),
);

SkipLink.displayName = 'SkipLink';
