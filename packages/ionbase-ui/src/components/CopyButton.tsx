'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Button, type ButtonProps } from './Button.js';
import { Tooltip } from './Tooltip.js';

export type CopyButtonState = 'idle' | 'copied' | 'failed';

export interface CopyButtonProps {
  /**
   * What is copied. A function is called at the moment of the press, for a
   * value read from somewhere that changes — the text in an editor.
   */
  value: string | (() => string);
  /** Names the action — "Copy", "Copy run ID". Default "Copy". */
  label?: string;
  /** Shown and announced once copied. Default "Copied". */
  copiedLabel?: string;
  /** Shown and announced when the clipboard refused. Default "Couldn't copy". */
  failedLabel?: string;
  /**
   * Draw only the icon. `label` becomes the name and the tooltip, so it must
   * say what is copied: "Copy run ID", not "Copy".
   */
  isIconOnly?: boolean;
  /** Tertiary beside the value it copies; secondary among other actions. */
  variant?: 'tertiary' | 'secondary';
  size?: Exclude<ButtonProps['size'], 'xl'>;
  isDisabled?: boolean;
  /** Milliseconds the confirmation stays before the button returns. Default 2000. */
  resetAfter?: number;
  /** Copied — with the text that was. */
  onCopy?: (text: string) => void;
  /**
   * The clipboard refused. Show `text` where it can be selected by hand; the
   * button has already said it failed.
   */
  onCopyError?: (error: unknown, text: string) => void;
  id?: string;
  className?: string;
}

/*
 * Lucide's copy, check and circle-alert, as the icons package draws them and
 * as the Figma set uses them — inline, because this package does not depend
 * on the icons one.
 */
const glyph = (...d: string[]) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {d.map((path) => (
      <path
        key={path}
        d={path}
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    ))}
  </svg>
);

const GLYPHS: Record<CopyButtonState, React.ReactNode> = {
  idle: glyph(
    'M19.2727 7.45455C20.779 7.45455 22 8.67559 22 10.1818V19.2727C22 20.779 20.779 22 19.2727 22H10.1818C8.67559 22 7.45455 20.779 7.45455 19.2727V10.1818C7.45455 8.67559 8.67559 7.45455 10.1818 7.45455H19.2727ZM10.1818 9.27273C9.67974 9.27273 9.27273 9.67974 9.27273 10.1818V19.2727C9.27273 19.7748 9.67974 20.1818 10.1818 20.1818H19.2727C19.7748 20.1818 20.1818 19.7748 20.1818 19.2727V10.1818C20.1818 9.67974 19.7748 9.27273 19.2727 9.27273H10.1818Z',
    'M13.8182 2C15.3203 2 16.5455 3.2252 16.5455 4.72727C16.5455 5.22935 16.1384 5.63636 15.6364 5.63636C15.1343 5.63636 14.7273 5.22935 14.7273 4.72727C14.7273 4.22935 14.3161 3.81818 13.8182 3.81818H4.72727C4.22935 3.81818 3.81818 4.22935 3.81818 4.72727V13.8182C3.81818 14.3161 4.22935 14.7273 4.72727 14.7273C5.22935 14.7273 5.63636 15.1343 5.63636 15.6364C5.63636 16.1384 5.22935 16.5455 4.72727 16.5455C3.2252 16.5455 2 15.3203 2 13.8182V4.72727C2 3.2252 3.2252 2 4.72727 2H13.8182Z',
  ),
  copied: glyph(
    'M18.6301 5.9028C18.9851 5.54777 19.5606 5.54777 19.9156 5.9028C20.2705 6.25783 20.2706 6.83334 19.9156 7.18831L9.91562 17.1883C9.56065 17.5433 8.98513 17.5432 8.63011 17.1883L4.08465 12.6428C3.72965 12.2878 3.72966 11.7124 4.08465 11.3574C4.43967 11.0024 5.01515 11.0024 5.37016 11.3574L9.27286 15.26L18.6301 5.9028Z',
  ),
  failed: glyph(
    'M12.0089 14.7273C12.511 14.7273 12.918 15.1343 12.918 15.6364C12.918 16.1385 12.511 16.5455 12.0089 16.5455H12C11.4979 16.5455 11.0909 16.1385 11.0909 15.6364C11.0909 15.1343 11.4979 14.7273 12 14.7273H12.0089Z',
    'M12 7.45455C12.5021 7.45455 12.9091 7.86156 12.9091 8.36364V12C12.9091 12.5021 12.5021 12.9091 12 12.9091C11.4979 12.9091 11.0909 12.5021 11.0909 12V8.36364C11.0909 7.86156 11.4979 7.45455 12 7.45455Z',
    'M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 3.81818C7.48131 3.81818 3.81818 7.48131 3.81818 12C3.81818 16.5187 7.48131 20.1818 12 20.1818C16.5187 20.1818 20.1818 16.5187 20.1818 12C20.1818 7.48131 16.5187 3.81818 12 3.81818Z',
  ),
};

/**
 * Writes to the clipboard. The async Clipboard API exists only on a secure
 * origin — an internal tool served over plain http has no
 * `navigator.clipboard` at all — and a browser can refuse it. Either way the
 * older `execCommand('copy')` on a selected, off-screen textarea is tried
 * before giving up: deprecated, and still the one that works there.
 */
async function writeClipboard(text: string) {
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error('The Clipboard API is unavailable');
    await navigator.clipboard.writeText(text);
  } catch (error) {
    if (!copyBySelection(text)) throw error;
  }
}

function copyBySelection(text: string) {
  const previous = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.insetBlockStart = '0';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  area.remove();
  previous?.focus({ preventScroll: true });
  return copied;
}

/**
 * CopyButton — copies a value, confirms in place, and says so.
 *
 * CONFIRMS WHERE THE EYE ALREADY IS. The icon becomes a check and the label
 * "Copied" for two seconds, then both return. A toast would confirm in a
 * corner the user is not looking at, and stack up when they copy three
 * things in a row. The labels share one cell, so the button is always as wide
 * as its longest one and nothing beside it moves.
 *
 * SAYS SO ONCE. A polite live region beside the button reads "Copied" on each
 * press. A changed name alone is not reliably announced, and not at all when
 * the button was pressed by a script or lost focus. Each press replaces the
 * region's text node, so a second copy is announced too.
 *
 * AND SAYS WHEN IT FAILED. A clipboard can be refused — a denied permission,
 * a non-secure origin with no fallback. The button then shows "Couldn't
 * copy" with an alert icon, and `onCopyError` receives the text so the caller
 * can put it where it can be selected by hand. It never claims a copy that
 * did not happen.
 */
export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      value,
      label = 'Copy',
      copiedLabel = 'Copied',
      failedLabel = "Couldn't copy",
      isIconOnly = false,
      variant = 'tertiary',
      size = 'md',
      isDisabled,
      resetAfter = 2000,
      onCopy,
      onCopyError,
      id,
      className,
    },
    ref,
  ) => {
    const [state, setState] = useState<CopyButtonState>('idle');
    const [presses, setPresses] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const mounted = useRef(true);
    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
        clearTimeout(timer.current);
      };
    }, []);

    const copy = async () => {
      const text = typeof value === 'function' ? value() : value;
      clearTimeout(timer.current);
      let failure: { error: unknown } | null = null;
      try {
        await writeClipboard(text);
      } catch (error) {
        failure = { error };
      }
      if (!mounted.current) return;
      setState(failure ? 'failed' : 'copied');
      setPresses((n) => n + 1);
      if (failure) onCopyError?.(failure.error, text);
      else onCopy?.(text);
      timer.current = setTimeout(() => setState('idle'), resetAfter);
    };

    const labels: Record<CopyButtonState, string> = {
      idle: label,
      copied: copiedLabel,
      failed: failedLabel,
    };

    const button = (
      <Button
        ref={ref}
        id={id}
        variant={variant}
        size={size}
        isDisabled={isDisabled}
        onPress={copy}
        startIcon={GLYPHS[state]}
        aria-label={isIconOnly ? labels[state] : undefined}
        data-state={state}
        className={[
          'ion-copy-button',
          isIconOnly ? 'ion-copy-button--icon-only' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {!isIconOnly && (
          <span className="ion-copy-button__labels">
            {(Object.keys(labels) as CopyButtonState[]).map((s) => (
              <span key={s} data-current={s === state || undefined}>
                {labels[s]}
              </span>
            ))}
          </span>
        )}
      </Button>
    );

    return (
      <>
        {isIconOnly ? (
          <Tooltip label={labels[state]} isDisabled={isDisabled}>
            {button}
          </Tooltip>
        ) : (
          button
        )}
        <span
          className="ion-copy-button__status ion-visually-hidden"
          role="status"
          aria-live="polite"
        >
          {state !== 'idle' && <span key={presses}>{labels[state]}</span>}
        </span>
      </>
    );
  },
);

CopyButton.displayName = 'CopyButton';
