'use client';

import React, {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Alert, type AlertProps } from './Alert.js';

export interface BannerProps extends Omit<AlertProps, 'layout' | 'onDismiss'> {
  /**
   * Makes the banner dismissible and remembers the dismissal in this
   * browser, under this key, so it does not come back on the next page or
   * the next visit. Change the key when the notice changes —
   * `maintenance-2026-10-04`, not `maintenance`.
   */
  dismissKey?: string;
  /**
   * Makes it dismissible, and is told when it is dismissed. Without
   * `dismissKey`, the dismissal lasts only until the banner is mounted again.
   */
  onDismiss?: () => void;
}

const STORAGE_PREFIX = 'ionbase:banner-dismissed:';

/*
 * Storage can be missing or throw — a private window, blocked site data — and
 * a banner that cannot remember is still a banner: it shows.
 */
const remembered = (key: string) => {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === '1';
  } catch {
    return false;
  }
};
const remember = (key: string) => {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, '1');
  } catch {
    /* Dismissed for this page only. */
  }
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The first focusable element after `el` in the document, outside it. */
function nextFocusable(el: HTMLElement): HTMLElement | null {
  for (const candidate of document.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el.contains(candidate)) continue;
    if (
      !(
        el.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    )
      continue;
    if (candidate.getClientRects().length === 0) continue;
    return candidate;
  }
  return null;
}

/**
 * Banner — a notice about the whole product, across the top of it:
 * maintenance tonight, a trial ending, the workspace in read-only mode.
 *
 * AN ALERT THAT BELONGS TO THE PAGE, NOT TO A PART OF IT. It is Alert with
 * `layout="banner"` — the same intents, roles, icons, colours and one-line
 * layout — and adds what a notice about the whole page needs. Put it in
 * the app shell, above the Header and outside <main>, so it persists across
 * routes: a live region is announced when it is inserted, and a banner that
 * remounts with every page would be announced on every page.
 *
 * DISMISSED MEANS DISMISSED. With `dismissKey` the dismissal is remembered in
 * this browser, so a user who has read the maintenance notice is not shown it
 * on every page and every visit. A banner that must stay — the workspace is
 * read-only, deletion is scheduled — has no key and no `onDismiss`, and no
 * dismiss button.
 *
 * FOCUS GOES FORWARD. Dismissing removes the button that had focus; focus
 * moves to the next thing after the banner rather than falling back to the
 * top of the document.
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  ({ dismissKey, onDismiss, className, ...alert }, forwardedRef) => {
    const ref = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement);
    const [isDismissed, setDismissed] = useState(false);

    // Before paint, so a remembered dismissal never flashes the banner.
    useLayoutEffect(() => {
      if (dismissKey && remembered(dismissKey)) setDismissed(true);
    }, [dismissKey]);

    if (isDismissed) return null;

    const isDismissable = Boolean(dismissKey || onDismiss);
    const dismiss = () => {
      const el = ref.current;
      if (el && el.contains(document.activeElement)) nextFocusable(el)?.focus();
      if (dismissKey) remember(dismissKey);
      setDismissed(true);
      onDismiss?.();
    };

    return (
      <Alert
        {...alert}
        ref={ref}
        layout="banner"
        onDismiss={isDismissable ? dismiss : undefined}
        className={['ion-banner', className || ''].filter(Boolean).join(' ')}
      />
    );
  },
);

Banner.displayName = 'Banner';
