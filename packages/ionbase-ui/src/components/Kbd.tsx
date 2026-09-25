'use client';

import React, { useSyncExternalStore } from 'react';
import { shortcutKeys } from './shortcut.js';

export type KbdPlatform = 'mac' | 'other';

const subscribe = () => () => {};
const detectMac = () =>
  /mac|iphone|ipad|ipod/i.test(
    // `userAgentData` is Chromium-only; `platform` is deprecated but universal.
    // Case-insensitive: Chromium says "macOS", everything else "MacIntel".
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform || navigator.platform,
  );

/**
 * Whether the reader is on an Apple platform.
 *
 * `false` on the server and during hydration, then the real answer — so a
 * server-rendered "Ctrl" becomes "⌘" after hydration instead of producing a
 * mismatch. Not exported from the package: `platform` is the public way to
 * choose.
 */
export function useIsMac(): boolean {
  return useSyncExternalStore(subscribe, detectMac, () => false);
}

export interface KbdProps {
  /**
   * A whole shortcut, `+`-joined: `mod+k`, `mod+shift+p`, `esc`. `mod` is ⌘
   * on a Mac and Ctrl elsewhere, so write `mod` rather than guessing. Drawn as
   * one key per part, in the platform's order.
   */
  shortcut?: string;
  /** One key, as printed: `K`, `Esc`, `/`. Use `shortcut` for a combination. */
  children?: React.ReactNode;
  /**
   * Leave it out: the reader's platform is detected. Set it only to show a
   * specific platform's keys — a docs page comparing the two.
   */
  platform?: KbdPlatform;
  className?: string;
}

/**
 * Kbd — a key, or a keyboard shortcut, as printed on the keyboard.
 *
 * `<kbd>` is the element HTML has for this, and a combination is a `<kbd>` of
 * `<kbd>`s — the spec's own shape for "press these together".
 *
 * WHAT A SCREEN READER HEARS
 *
 * The symbols do not survive being read aloud: VoiceOver says "⌘" as "place of
 * interest sign" in some voices and "⇧" as "upwards white arrow". So a
 * shortcut's drawn keys are hidden and a visually hidden copy spells them out
 * — "Command K", "Control Shift P".
 */
export function Kbd({ shortcut, children, platform, className }: KbdProps) {
  const detected = useIsMac();
  const isMac = platform ? platform === 'mac' : detected;
  const classes = (base: string) =>
    [base, className || ''].filter(Boolean).join(' ');

  if (!shortcut) return <kbd className={classes('ion-kbd')}>{children}</kbd>;

  const keys = shortcutKeys(shortcut, isMac);
  return (
    <kbd className={classes('ion-kbd-group')}>
      {keys.map((k, i) => (
        <kbd key={i} className="ion-kbd" aria-hidden="true">
          {k.symbol}
        </kbd>
      ))}
      <span className="ion-visually-hidden">
        {keys.map((k) => k.name).join(' ')}
      </span>
    </kbd>
  );
}

Kbd.displayName = 'Kbd';
